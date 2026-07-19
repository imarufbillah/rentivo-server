import { ObjectId, Filter } from 'mongodb';
import { getCollections } from '../lib/db/collections';
import { Property, Interaction, RecommendationFilters, RecommendedProperty } from '../types';

const CANDIDATE_POOL_SIZE = 20;

const SYSTEM_PROMPT = `You are a real estate recommendation assistant. You analyze user interaction history to understand preferences and rank property candidates by relevance.

User interactions:
- view: user viewed property details
- save: user saved property to favorites (strong positive signal)

Your task: Given a user's interaction history and a list of candidate properties, rank the candidates from most to least relevant based on inferred preferences.

Output format: JSON array of property IDs in ranked order with optional scores.
Example: [{"id": "property1", "score": 0.95}, {"id": "property2", "score": 0.87}, ...]`;

const buildRankingPrompt = (
  candidatePool: Property[],
  interactions: Interaction[]
): string => {
  const interactionSummary = interactions.map((i) => ({
    propertyId: i.propertyId.toString(),
    type: i.type,
  }));

  const candidates = candidatePool.map((p) => ({
    id: p._id?.toString(),
    title: p.title,
    location: p.location,
    price: p.price,
    propertyType: p.propertyType,
    description: p.description.substring(0, 200),
  }));

  return `User interaction history (most recent first):
${JSON.stringify(interactionSummary, null, 2)}

Candidate properties to rank:
${JSON.stringify(candidates, null, 2)}

Rank these candidates from most to least relevant for this user.`;
};

const buildExplanationPrompt = (
  property: Property,
  interactions: Interaction[]
): string => `Given this user's preferences inferred from their interaction history:
${JSON.stringify(interactions.slice(0, 10).map((i) => ({ type: i.type })), null, 2)}

Explain in one sentence (max 15 words) why this property is recommended:
${JSON.stringify(
  {
    title: property.title,
    location: property.location,
    price: property.price,
    propertyType: property.propertyType,
  },
  null,
  2
)}

Example: "Matches your interest in downtown apartments under $2000"`;

export const buildCandidatePool = async (
  userId: string,
  filters: RecommendationFilters
): Promise<Property[]> => {
  const { properties } = await getCollections();

  const filter: Filter<Property> = {
    status: 'active',
  };

  if (filters.location) filter.location = filters.location;
  if (filters.propertyType) filter.propertyType = filters.propertyType;
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    filter.price = {};
    if (filters.minPrice !== undefined) filter.price.$gte = filters.minPrice;
    if (filters.maxPrice !== undefined) filter.price.$lte = filters.maxPrice;
  }

  return properties
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(CANDIDATE_POOL_SIZE)
    .toArray();
};

export const getInteractionHistory = async (userId: string): Promise<Interaction[]> => {
  const { interactions } = await getCollections();
  return interactions
    .find({ userId: new ObjectId(userId) })
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();
};

export const getInteractionCount = async (userId: string): Promise<number> => {
  const { interactions } = await getCollections();
  return interactions.countDocuments({ userId: new ObjectId(userId) });
};

export const rankWithLLM = async (
  candidatePool: Property[],
  interactions: Interaction[]
): Promise<RecommendedProperty[]> => {
  const groq = (await import('groq-sdk')).default;
  const client = new groq({ apiKey: process.env.GROQ_API_KEY });

  const prompt = buildRankingPrompt(candidatePool, interactions);

  const response = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    temperature: 0.3,
    max_tokens: 1024,
  });

  const content = response.choices[0]?.message?.content || '[]';
  const ranked = JSON.parse(content) as Array<{ id: string; score?: number }>;

  const propertyMap = new Map(candidatePool.map((p) => [p._id?.toString(), p]));

  return ranked
    .filter((r) => propertyMap.has(r.id))
    .map((r) => ({
      property: propertyMap.get(r.id)!,
      score: r.score,
      explanation: '',
    }));
};

export const generateExplanations = async (
  rankedProperties: RecommendedProperty[],
  interactions: Interaction[]
): Promise<RecommendedProperty[]> => {
  const groq = (await import('groq-sdk')).default;
  const client = new groq({ apiKey: process.env.GROQ_API_KEY });

  const results = await Promise.allSettled(
    rankedProperties.map(async (rec) => {
      const prompt = buildExplanationPrompt(rec.property, interactions);

      const response = await client.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        max_tokens: 50,
      });

      const explanation = response.choices[0]?.message?.content?.trim() || '';
      return { ...rec, explanation };
    })
  );

  return results.map((result, i) => {
    if (result.status === 'fulfilled') return result.value;
    return rankedProperties[i];
  });
};

export const getFallbackRecommendations = async (
  filters?: RecommendationFilters
): Promise<RecommendedProperty[]> => {
  const properties = await buildCandidatePool('000000000000000000000000', filters || {});

  return properties.map((property) => ({
    property,
    explanation: '',
    score: undefined,
  }));
};

export const getRecommendations = async (
  userId: string,
  filters?: RecommendationFilters
): Promise<{ recommendations: RecommendedProperty[]; isPersonalized: boolean }> => {
  const interactionCount = await getInteractionCount(userId);

  if (interactionCount === 0) {
    const recommendations = await getFallbackRecommendations(filters);
    return { recommendations, isPersonalized: false };
  }

  const [candidatePool, interactionHistory] = await Promise.all([
    buildCandidatePool(userId, filters || {}),
    getInteractionHistory(userId),
  ]);

  if (candidatePool.length === 0) {
    return { recommendations: [], isPersonalized: true };
  }

  try {
    const ranked = await rankWithLLM(candidatePool, interactionHistory);
    const withExplanations = await generateExplanations(ranked, interactionHistory);
    return { recommendations: withExplanations, isPersonalized: true };
  } catch {
    const fallback = candidatePool.map((property) => ({
      property,
      explanation: '',
      score: undefined,
    }));
    return { recommendations: fallback, isPersonalized: false };
  }
};
