import { ObjectId } from 'mongodb';
import { getCollections } from '../lib/db/collections';
import { Review } from '../types';

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
