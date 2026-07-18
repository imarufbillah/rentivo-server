import { describe, it, expect, beforeEach } from 'vitest';
import { mockCollections, resetMocks } from './helpers';
import recommendationRoutes from '../routes/recommendation.routes';
import express from 'express';

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/recommendations', recommendationRoutes);
  return app;
};

beforeEach(() => {
  resetMocks();
});

describe('GET /api/recommendations', () => {
  it('returns 401 without auth token', async () => {
    const app = createApp();

    const res = await (await import('supertest')).default(app)
      .get('/api/recommendations');

    expect(res.status).toBe(401);
  });
});
