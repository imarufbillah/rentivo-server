import { ObjectId } from 'mongodb';
import { getCollections } from '../lib/db/collections';
import { Interaction, Property, InteractionType } from '../types';

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

export const deleteInteractionsByProperty = async (propertyId: string): Promise<void> => {
  const { interactions } = await getCollections();
  await interactions.deleteMany({ propertyId: ensureObjectId(propertyId) });
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
