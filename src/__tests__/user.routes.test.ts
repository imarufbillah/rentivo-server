import { describe, it, expect, beforeEach } from 'vitest';
import { mockCollections, resetMocks } from './helpers.js';
import userRoutes from '../routes/user.routes.js';
import express from 'express';

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/users', userRoutes);
  return app;
};

beforeEach(() => {
  resetMocks();
});

describe('PATCH /api/users/upgrade-to-owner', () => {
  it('returns 401 without auth token', async () => {
    const app = createApp();

    const res = await (await import('supertest')).default(app)
      .patch('/api/users/upgrade-to-owner');

    expect(res.status).toBe(401);
  });
});
