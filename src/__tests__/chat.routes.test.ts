import { describe, it, expect, beforeEach } from 'vitest';
import { mockCollections, resetMocks } from './helpers';
import chatRoutes from '../routes/chat.routes';
import express from 'express';

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/chat', chatRoutes);
  return app;
};

beforeEach(() => {
  resetMocks();
});

describe('POST /api/chat', () => {
  it('returns 401 without auth token', async () => {
    const app = createApp();

    const res = await (await import('supertest')).default(app)
      .post('/api/chat')
      .send({ message: 'Hello' });

    expect(res.status).toBe(401);
  });

  it('returns 401 for invalid token with empty message', async () => {
    const app = createApp();

    const res = await (await import('supertest')).default(app)
      .post('/api/chat')
      .set('Authorization', 'Bearer invalid-token')
      .send({ message: '' });

    expect(res.status).toBe(401);
  });
});

describe('POST /api/chat/suggestions', () => {
  it('returns 401 without auth token', async () => {
    const app = createApp();

    const res = await (await import('supertest')).default(app)
      .post('/api/chat/suggestions')
      .send({ conversationHistory: [] });

    expect(res.status).toBe(401);
  });
});
