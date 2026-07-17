import { describe, it, expect, beforeEach } from 'vitest';
import { mockCollections, resetMocks } from './helpers';
import reviewRoutes from '../routes/review.routes';
import express from 'express';

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/reviews', reviewRoutes);
  return app;
};

const propertyId = '507f1f77bcf86cd799439012';

beforeEach(() => {
  resetMocks();
});

describe('POST /api/reviews', () => {
  it('returns 401 without auth token', async () => {
    const app = createApp();

    const res = await (await import('supertest')).default(app)
      .post('/api/reviews')
      .send({ propertyId, rating: 5, comment: 'Great property!' });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/reviews/property/:propertyId', () => {
  it('returns reviews with average rating', async () => {
    const app = createApp();
    mockCollections.reviews.toArray.mockResolvedValue([]);
    mockCollections.reviews.aggregate.mockReturnThis();

    const res = await (await import('supertest')).default(app)
      .get(`/api/reviews/property/${propertyId}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.reviews).toBeDefined();
    expect(res.body.data.averageRating).toBeNull();
  });

  it('returns null averageRating when no reviews exist', async () => {
    const app = createApp();
    mockCollections.reviews.toArray.mockResolvedValue([]);
    mockCollections.reviews.aggregate.mockReturnThis();

    const res = await (await import('supertest')).default(app)
      .get(`/api/reviews/property/${propertyId}`);

    expect(res.status).toBe(200);
    expect(res.body.data.averageRating).toBeNull();
    expect(res.body.data.totalReviews).toBe(0);
  });
});
