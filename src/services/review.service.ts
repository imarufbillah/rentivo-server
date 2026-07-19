import { ObjectId } from 'mongodb';
import { getCollections } from '../lib/db/collections';
import { Review, PropertyWithStats } from '../types';

const ensureObjectId = (id: string): ObjectId => {
  if (!ObjectId.isValid(id)) {
    throw new Error('Invalid ObjectId');
  }
  return new ObjectId(id);
};

export const createReview = async (
  userId: string,
  propertyId: string,
  rating: number,
  comment: string
): Promise<Review> => {
  const { reviews } = await getCollections();

  const userObjectId = new ObjectId(userId);
  const propertyObjectId = new ObjectId(propertyId);

  const existing = await reviews.findOne({
    userId: userObjectId,
    propertyId: propertyObjectId,
  });

  if (existing) {
    throw new Error('User has already reviewed this property');
  }

  const review: Review = {
    userId: userObjectId,
    propertyId: propertyObjectId,
    rating,
    comment,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await reviews.insertOne(review as any);
  return { ...review, _id: result.insertedId };
};

export const getReviewsByProperty = async (propertyId: string): Promise<Review[]> => {
  const { reviews } = await getCollections();
  return reviews
    .find({ propertyId: ensureObjectId(propertyId) })
    .sort({ createdAt: -1 })
    .toArray();
};

export const getAverageRating = async (propertyId: string): Promise<number | null> => {
  const { reviews } = await getCollections();
  const propertyObjectId = ensureObjectId(propertyId);

  const result = await reviews
    .aggregate([
      { $match: { propertyId: propertyObjectId } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          count: { $sum: 1 },
        },
      },
    ])
    .toArray();

  if (result.length === 0 || result[0].count === 0) {
    return null;
  }

  return Math.round(result[0].avgRating * 10) / 10;
};

export const deleteReviewsByProperty = async (propertyId: string): Promise<void> => {
  const { reviews } = await getCollections();
  await reviews.deleteMany({ propertyId: ensureObjectId(propertyId) });
};

export const getReviewStatsByOwner = async (
  ownerId: string
): Promise<Map<string, { averageRating: number | null; totalReviews: number }>> => {
  const { reviews, properties } = await getCollections();
  const ownerObjectId = new ObjectId(ownerId);

  const ownerProperties = await properties
    .find({ ownerId: ownerObjectId })
    .project({ _id: 1 })
    .toArray();

  if (ownerProperties.length === 0) {
    return new Map();
  }

  const propertyIds = ownerProperties.map((p) => p._id);

  const stats = await reviews
    .aggregate([
      { $match: { propertyId: { $in: propertyIds } } },
      {
        $group: {
          _id: '$propertyId',
          avgRating: { $avg: '$rating' },
          count: { $sum: 1 },
        },
      },
    ])
    .toArray();

  const result = new Map<string, { averageRating: number | null; totalReviews: number }>();

  for (const prop of ownerProperties) {
    const id = prop._id!.toString();
    result.set(id, { averageRating: null, totalReviews: 0 });
  }

  for (const item of stats) {
    const propertyId = item._id.toString();
    result.set(propertyId, {
      averageRating: Math.round(item.avgRating * 10) / 10,
      totalReviews: item.count,
    });
  }

  return result;
};

export const checkUserHasViewedProperty = async (
  userId: string,
  propertyId: string
): Promise<boolean> => {
  const { interactions } = await getCollections();

  const interaction = await interactions.findOne({
    userId: new ObjectId(userId),
    propertyId: new ObjectId(propertyId),
    type: 'view',
  });

  return interaction !== null;
};

export const ensureIndexes = async (): Promise<void> => {
  const { reviews } = await getCollections();

  await Promise.all([
    reviews.createIndex({ propertyId: 1 }),
    reviews.createIndex({ userId: 1, propertyId: 1 }, { unique: true }),
  ]);
};
