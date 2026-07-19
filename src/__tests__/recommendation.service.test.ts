import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockCollections, resetMocks } from './helpers';
import {
  buildCandidatePool,
  getInteractionCount,
  getFallbackRecommendations,
  getRecommendations,
} from '../services/recommendation.service';

const userId = '507f1f77bcf86cd799439011';

beforeEach(() => {
  resetMocks();
});

describe('buildCandidatePool', () => {
  it('applies location filter', async () => {
    mockCollections.properties.toArray.mockResolvedValue([]);

    await buildCandidatePool(userId, { location: 'New York' });

    expect(mockCollections.properties.find).toHaveBeenCalledWith(
      expect.objectContaining({ location: 'New York' })
    );
  });

  it('applies price range filter', async () => {
    mockCollections.properties.toArray.mockResolvedValue([]);

    await buildCandidatePool(userId, { minPrice: 1000, maxPrice: 2000 });

    expect(mockCollections.properties.find).toHaveBeenCalledWith(
      expect.objectContaining({
        price: { $gte: 1000, $lte: 2000 },
      })
    );
  });

  it('applies property type filter', async () => {
    mockCollections.interactions.toArray.mockResolvedValue([]);
    mockCollections.properties.toArray.mockResolvedValue([]);

    await buildCandidatePool(userId, { propertyType: 'villa' });

    expect(mockCollections.properties.find).toHaveBeenCalledWith(
      expect.objectContaining({ propertyType: 'villa' })
    );
  });

  it('only includes active properties', async () => {
    mockCollections.interactions.toArray.mockResolvedValue([]);
    mockCollections.properties.toArray.mockResolvedValue([]);

    await buildCandidatePool(userId, {});

    expect(mockCollections.properties.find).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'active' })
    );
  });

  it('limits results to 20', async () => {
    mockCollections.interactions.toArray.mockResolvedValue([]);
    mockCollections.properties.toArray.mockResolvedValue([]);

    await buildCandidatePool(userId, {});

    expect(mockCollections.properties.limit).toHaveBeenCalledWith(20);
  });
});

describe('getInteractionCount', () => {
  it('returns interaction count for user', async () => {
    mockCollections.interactions.countDocuments.mockResolvedValue(15);

    const count = await getInteractionCount(userId);

    expect(count).toBe(15);
  });
});

describe('getFallbackRecommendations', () => {
  it('returns properties without LLM calls', async () => {
    mockCollections.interactions.toArray.mockResolvedValue([]);
    mockCollections.properties.toArray.mockResolvedValue([
      { _id: '1', title: 'Property 1' },
      { _id: '2', title: 'Property 2' },
    ]);

    const result = await getFallbackRecommendations();

    expect(result).toHaveLength(2);
    expect(result[0].explanation).toBe('');
    expect(result[0].score).toBeUndefined();
  });

  it('returns empty array when no properties match', async () => {
    mockCollections.interactions.toArray.mockResolvedValue([]);
    mockCollections.properties.toArray.mockResolvedValue([]);

    const result = await getFallbackRecommendations();

    expect(result).toHaveLength(0);
  });
});

describe('getRecommendations', () => {
  it('returns fallback when user has 0 interactions', async () => {
    mockCollections.interactions.countDocuments.mockResolvedValue(0);
    mockCollections.interactions.toArray.mockResolvedValue([]);
    mockCollections.properties.toArray.mockResolvedValue([
      { _id: '1', title: 'Property 1' },
    ]);

    const result = await getRecommendations(userId);

    expect(result.isPersonalized).toBe(false);
    expect(result.recommendations).toHaveLength(1);
  });

  it('returns empty when candidate pool is empty', async () => {
    mockCollections.interactions.countDocuments.mockResolvedValue(5);
    mockCollections.interactions.toArray.mockResolvedValue([]);
    mockCollections.properties.toArray.mockResolvedValue([]);

    const result = await getRecommendations(userId);

    expect(result.isPersonalized).toBe(true);
    expect(result.recommendations).toHaveLength(0);
  });
});
