import { describe, it, expect } from 'vitest';
import { createReviewSchema } from '../lib/validation/review.schemas';

const validReview = {
  propertyId: '507f1f77bcf86cd799439011',
  rating: 4,
  comment: 'Great property, would recommend to others!',
};

describe('createReviewSchema', () => {
  it('accepts valid review data', () => {
    const result = createReviewSchema.safeParse(validReview);
    expect(result.success).toBe(true);
  });

  it('accepts rating of 1', () => {
    const result = createReviewSchema.safeParse({ ...validReview, rating: 1 });
    expect(result.success).toBe(true);
  });

  it('accepts rating of 5', () => {
    const result = createReviewSchema.safeParse({ ...validReview, rating: 5 });
    expect(result.success).toBe(true);
  });

  it('rejects rating below 1', () => {
    const result = createReviewSchema.safeParse({ ...validReview, rating: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects rating above 5', () => {
    const result = createReviewSchema.safeParse({ ...validReview, rating: 6 });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer rating', () => {
    const result = createReviewSchema.safeParse({ ...validReview, rating: 3.5 });
    expect(result.success).toBe(false);
  });

  it('rejects propertyId shorter than 24 characters', () => {
    const result = createReviewSchema.safeParse({ ...validReview, propertyId: '12345' });
    expect(result.success).toBe(false);
  });

  it('rejects comment shorter than 10 characters', () => {
    const result = createReviewSchema.safeParse({ ...validReview, comment: 'Short' });
    expect(result.success).toBe(false);
  });

  it('rejects comment longer than 1000 characters', () => {
    const result = createReviewSchema.safeParse({ ...validReview, comment: 'a'.repeat(1001) });
    expect(result.success).toBe(false);
  });
});
