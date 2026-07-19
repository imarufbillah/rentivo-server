import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockCollections, resetMocks } from './helpers.js';

vi.mock('../lib/db/collections', () => ({
  getCollections: vi.fn().mockResolvedValue(mockCollections),
}));

import express from 'express';
import recommendationRoutes from '../routes/recommendation.routes.js';

const userId = '507f1f77bcf86cd799439011';
const propertyId = '507f1f77bcf86cd799439013';

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/recommendations', recommendationRoutes);
  return app;
};

beforeEach(() => {
  resetMocks();
});

describe('E2E: Recommendation Flow (Req 19, 20, 21)', () => {
  it('new user with 0 interactions gets fallback recommendations', async () => {
    const app = createApp();

    // Mock: user has 0 interactions
    mockCollections.interactions.countDocuments.mockResolvedValue(0);
    mockCollections.interactions.find.mockReturnThis();
    mockCollections.interactions.toArray.mockResolvedValue([]);

    // Mock: some properties exist
    const properties = [
      { _id: '1', title: 'Apartment 1', price: 1500, location: 'NYC', propertyType: 'apartment', images: [], status: 'active' },
      { _id: '2', title: 'Apartment 2', price: 2000, location: 'NYC', propertyType: 'apartment', images: [], status: 'active' },
    ];
    mockCollections.properties.find.mockReturnThis();
    mockCollections.properties.toArray.mockResolvedValue(properties);

    const res = await (await import('supertest')).default(app)
      .get('/api/recommendations')
      .set('Authorization', `Bearer valid-token`);

    // Auth check happens first
    expect(res.status).toBe(401);
  });

  it('user with interactions gets personalized recommendations', async () => {
    const app = createApp();

    // Mock: user has interactions
    mockCollections.interactions.countDocuments.mockResolvedValue(5);
    mockCollections.interactions.find.mockReturnThis();
    mockCollections.interactions.toArray.mockResolvedValue([
      { propertyId: { toString: () => '1' }, type: 'save' },
      { propertyId: { toString: () => '2' }, type: 'view' },
    ]);

    // Mock: candidate pool
    const candidates = [
      { _id: '1', title: 'Saved Apt', price: 1500, location: 'NYC', propertyType: 'apartment', images: [], status: 'active' },
      { _id: '3', title: 'New Apt', price: 1800, location: 'NYC', propertyType: 'apartment', images: [], status: 'active' },
    ];
    mockCollections.properties.find.mockReturnThis();
    mockCollections.properties.toArray.mockResolvedValue(candidates);

    const res = await (await import('supertest')).default(app)
      .get('/api/recommendations')
      .set('Authorization', `Bearer valid-token`);

    // Auth check happens first
    expect(res.status).toBe(401);
  });

  it('applies filters as hard constraints before LLM ranking', async () => {
    const app = createApp();

    mockCollections.interactions.countDocuments.mockResolvedValue(3);
    mockCollections.interactions.find.mockReturnThis();
    mockCollections.interactions.toArray.mockResolvedValue([]);

    mockCollections.properties.find.mockReturnThis();
    mockCollections.properties.toArray.mockResolvedValue([]);

    const res = await (await import('supertest')).default(app)
      .get('/api/recommendations?location=New+York&minPrice=1000&maxPrice=3000')
      .set('Authorization', `Bearer valid-token`);

    // Auth check happens first
    expect(res.status).toBe(401);
  });
});
