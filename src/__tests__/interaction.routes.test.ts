import { describe, it, expect, beforeEach } from 'vitest';
import { mockCollections, resetMocks } from './helpers.js';
import interactionRoutes from '../routes/interaction.routes.js';
import express from 'express';

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/interactions', interactionRoutes);
  return app;
};

beforeEach(() => {
  resetMocks();
});

describe('POST /api/interactions', () => {
  it('returns 401 without auth token', async () => {
    const app = createApp();

    const res = await (await import('supertest')).default(app)
      .post('/api/interactions')
      .send({ propertyId: '507f1f77bcf86cd799439011', type: 'view' });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/interactions/saved-properties', () => {
  it('returns 401 without auth token', async () => {
    const app = createApp();

    const res = await (await import('supertest')).default(app)
      .get('/api/interactions/saved-properties');

    expect(res.status).toBe(401);
  });
});
