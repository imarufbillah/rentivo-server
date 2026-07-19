import { ObjectId } from 'mongodb';
import { getCollections } from '../lib/db/collections';
import { Interaction, Property, InteractionType, PropertyWithStats } from '../types';

const MAX_INTERACTION_HISTORY = 100;

const ensureObjectId = (id: string): ObjectId => {
  if (!ObjectId.isValid(id)) {
    throw new Error('Invalid ObjectId');
  }
  return new ObjectId(id);
};

export const trackInteraction = async (
  userId: string,
  propertyId: string,
  type: InteractionType
): Promise<Interaction> => {
  const { interactions } = await getCollections();

  const interaction: Interaction = {
    userId: new ObjectId(userId),
    propertyId: new ObjectId(propertyId),
    type,
    createdAt: new Date(),
  };

  const result = await interactions.insertOne(interaction as any);
  await capInteractionHistory(userId, MAX_INTERACTION_HISTORY);

  return { ...interaction, _id: result.insertedId };
};

export const getUserInteractions = async (
  userId: string,
  limit?: number
): Promise<Interaction[]> => {
  const { interactions } = await getCollections();
  const query = interactions
    .find({ userId: new ObjectId(userId) })
    .sort({ createdAt: -1 });

  if (limit) {
    query.limit(limit);
  }

  return query.toArray();
};

export const getUserSavedProperties = async (userId: string): Promise<Property[]> => {
  const { interactions, properties } = await getCollections();

  const savedInteractions = await interactions
    .find({ userId: new ObjectId(userId), type: 'save' })
    .sort({ createdAt: -1 })
    .toArray();

  if (savedInteractions.length === 0) {
    return [];
  }

  const propertyIds = savedInteractions.map((i) => i.propertyId);

  return properties.find({ _id: { $in: propertyIds } }).toArray();
};

export const getUserInteractionsWithProperties = async (
  userId: string,
  type?: InteractionType,
  page: number = 1,
  limit: number = 12
): Promise<{ interactions: (Interaction & { property: Property | null })[]; total: number }> => {
  const { interactions, properties } = await getCollections();
  const userObjectId = new ObjectId(userId);

  const filter: Record<string, unknown> = { userId: userObjectId };
  if (type) {
    filter.type = type;
  }

  const skip = (page - 1) * limit;

  const [interactionDocs, total] = await Promise.all([
    interactions
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    interactions.countDocuments(filter),
  ]);

  if (interactionDocs.length === 0) {
    return { interactions: [], total };
  }

  const propertyIds = interactionDocs.map((i) => i.propertyId);
  const propertyDocs = await properties.find({ _id: { $in: propertyIds } }).toArray();
  const propertyMap = new Map(propertyDocs.map((p) => [p._id!.toString(), p]));

  const interactionsWithProperties = interactionDocs.map((interaction) => ({
    ...interaction,
    property: propertyMap.get(interaction.propertyId.toString()) || null,
  }));

  return { interactions: interactionsWithProperties, total };
};

export const deleteInteraction = async (
  userId: string,
  propertyId: string,
  type: InteractionType
): Promise<void> => {
  const { interactions } = await getCollections();
  await interactions.deleteOne({
    userId: new ObjectId(userId),
    propertyId: new ObjectId(propertyId),
    type,
  });
};

export const deleteInteractionsByProperty = async (propertyId: string): Promise<void> => {
  const { interactions } = await getCollections();
  await interactions.deleteMany({ propertyId: ensureObjectId(propertyId) });
};

export const getInteractionCountsByOwner = async (
  ownerId: string
): Promise<Map<string, { views: number; saves: number; dismisses: number }>> => {
  const { interactions, properties } = await getCollections();
  const ownerObjectId = new ObjectId(ownerId);

  const ownerProperties = await properties
    .find({ ownerId: ownerObjectId })
    .project({ _id: 1 })
    .toArray();

  if (ownerProperties.length === 0) {
    return new Map();
  }

  const propertyIds = ownerProperties.map((p) => p._id);

  const counts = await interactions
    .aggregate([
      { $match: { propertyId: { $in: propertyIds } } },
      {
        $group: {
          _id: { propertyId: '$propertyId', type: '$type' },
          count: { $sum: 1 },
        },
      },
    ])
    .toArray();

  const result = new Map<string, { views: number; saves: number; dismisses: number }>();

  for (const prop of ownerProperties) {
    const id = prop._id!.toString();
    result.set(id, { views: 0, saves: 0, dismisses: 0 });
  }

  for (const item of counts) {
    const propertyId = item._id.propertyId.toString();
    const type = item._id.type as InteractionType;
    const entry = result.get(propertyId);
    if (entry) {
      if (type === 'view') entry.views = item.count;
      else if (type === 'save') entry.saves = item.count;
      else if (type === 'dismiss') entry.dismisses = item.count;
    }
  }

  return result;
};

export const capInteractionHistory = async (
  userId: string,
  maxCount: number
): Promise<void> => {
  const { interactions } = await getCollections();
  const userObjectId = new ObjectId(userId);

  const count = await interactions.countDocuments({ userId: userObjectId });

  if (count <= maxCount) {
    return;
  }

  const excess = count - maxCount;
  const oldestInteractions = await interactions
    .find({ userId: userObjectId })
    .sort({ createdAt: 1 })
    .limit(excess)
    .toArray();

  if (oldestInteractions.length > 0) {
    const idsToDelete = oldestInteractions.map((i) => i._id);
    await interactions.deleteMany({ _id: { $in: idsToDelete } });
  }
};

export const ensureIndexes = async (): Promise<void> => {
  const { interactions } = await getCollections();

  await Promise.all([
    interactions.createIndex({ userId: 1, createdAt: -1 }),
    interactions.createIndex({ propertyId: 1 }),
    interactions.createIndex({ userId: 1, propertyId: 1, type: 1 }),
  ]);
};
