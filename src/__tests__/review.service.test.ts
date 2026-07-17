import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockCollections, resetMocks } from './helpers';
import {
  createReview,
  getReviewsByProperty,
  getAverageRating,
  deleteReviewsByProperty,
  checkUserHasViewedProperty,
} from '../services/review.service';

const userId = '507f1f77bcf86cd799439011';
const propertyId = '507f1f77bcf86cd799439012';

beforeEach(() => {
  resetMocks();
});

describe('createReview', () => {
  it('creates a review with valid data', async () => {
    mockCollections.reviews.findOne.mockResolvedValue(null);

    const result = await createReview(userId, propertyId, 5, 'Excellent property!');

    expect(result.rating).toBe(5);
    expect(result.comment).toBe('Excellent property!');
    expect(mockCollections.reviews.insertOne).toHaveBeenCalledOnce();
  });

  it('creates a review with minimum rating', async () => {
    mockCollections.reviews.findOne.mockResolvedValue(null);

    const result = await createReview(userId, propertyId, 1, 'Not great but acceptable');

    expect(result.rating).toBe(1);
  });

  it('throws when user already reviewed the property', async () => {
    mockCollections.reviews.findOne.mockResolvedValue({ _id: 'existing' });

    await expect(
      createReview(userId, propertyId, 4, 'Already reviewed')
    ).rejects.toThrow('User has already reviewed this property');
  });
});

describe('getReviewsByProperty', () => {
  it('returns reviews sorted by recency', async () => {
    await getReviewsByProperty(propertyId);

    expect(mockCollections.reviews.find).toHaveBeenCalledWith(
      expect.objectContaining({ propertyId: expect.anything() })
    );
    expect(mockCollections.reviews.sort).toHaveBeenCalledWith({ createdAt: -1 });
  });
});

describe('getAverageRating', () => {
  it('returns null when no reviews exist', async () => {
    mockCollections.reviews.toArray.mockResolvedValue([]);

    const result = await getAverageRating(propertyId);

    expect(result).toBeNull();
  });

  it('returns null when aggregation returns empty', async () => {
    mockCollections.reviews.toArray.mockResolvedValue([]);

    const result = await getAverageRating(propertyId);

    expect(result).toBeNull();
  });

  it('calculates average rating correctly', async () => {
    mockCollections.reviews.toArray.mockResolvedValue([
      { _id: null, avgRating: 4.333, count: 3 },
    ]);

    const result = await getAverageRating(propertyId);

    expect(result).toBe(4.3);
  });

  it('rounds average to one decimal place', async () => {
    mockCollections.reviews.toArray.mockResolvedValue([
      { _id: null, avgRating: 3.666, count: 2 },
    ]);

    const result = await getAverageRating(propertyId);

    expect(result).toBe(3.7);
  });

  it('returns exact value for whole numbers', async () => {
    mockCollections.reviews.toArray.mockResolvedValue([
      { _id: null, avgRating: 4.0, count: 1 },
    ]);

    const result = await getAverageRating(propertyId);

    expect(result).toBe(4);
  });
});

describe('deleteReviewsByProperty', () => {
  it('deletes all reviews for a property', async () => {
    await deleteReviewsByProperty(propertyId);

    expect(mockCollections.reviews.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ propertyId: expect.anything() })
    );
  });
});

describe('checkUserHasViewedProperty', () => {
  it('returns true when view interaction exists', async () => {
    mockCollections.interactions.findOne.mockResolvedValue({ _id: 'view' });

    const result = await checkUserHasViewedProperty(userId, propertyId);

    expect(result).toBe(true);
    expect(mockCollections.interactions.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'view' })
    );
  });

  it('returns false when no view interaction exists', async () => {
    mockCollections.interactions.findOne.mockResolvedValue(null);

    const result = await checkUserHasViewedProperty(userId, propertyId);

    expect(result).toBe(false);
  });
});
