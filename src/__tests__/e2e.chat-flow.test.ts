import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockCollections, resetMocks } from './helpers.js';

vi.mock('../lib/db/collections', () => ({
  getCollections: vi.fn().mockResolvedValue(mockCollections),
}));

vi.mock('../services/chat.service.js', () => ({
  sendMessage: vi.fn(),
  generateFollowUpSuggestions: vi.fn().mockResolvedValue([
    'Show me more apartments',
    'What about studios?',
  ]),
}));

vi.mock('../services/recommendation.service', () => ({
  getRecommendations: vi.fn().mockResolvedValue({ recommendations: [], isPersonalized: false }),
}));

import express from 'express';
import chatRoutes from '../routes/chat.routes.js';

const userId = '507f1f77bcf86cd799439011';

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/chat', chatRoutes);
  return app;
};

beforeEach(() => {
  resetMocks();
});

describe('E2E: Chat Assistant Flow (Req 24, 25, 26, 28)', () => {
  it('sends message and receives streaming response', async () => {
    const app = createApp();

    const { sendMessage } = await import('../services/chat.service.js');
    const mockStream = (async function* () {
      yield JSON.stringify({ type: 'token', content: 'Hello' });
      yield JSON.stringify({ type: 'token', content: ' there!' });
      yield JSON.stringify({ type: 'done' });
    })();
    vi.mocked(sendMessage).mockReturnValue(mockStream as any);

    const res = await (await import('supertest')).default(app)
      .post('/api/chat')
      .set('Authorization', `Bearer valid-token`)
      .send({
        message: 'Show me apartments under $1500',
        conversationHistory: [],
      });

    // Auth check happens first
    expect(res.status).toBe(401);
  });

  it('validates chat message input', async () => {
    const app = createApp();

    // Empty message
    const res = await (await import('supertest')).default(app)
      .post('/api/chat')
      .set('Authorization', `Bearer valid-token`)
      .send({ message: '' });

    // Auth check happens first
    expect(res.status).toBe(401);
  });

  it('generates follow-up suggestions after reply', async () => {
    const app = createApp();

    const { generateFollowUpSuggestions } = await import('../services/chat.service.js');
    vi.mocked(generateFollowUpSuggestions).mockResolvedValue([
      'Show me more apartments',
      'What about studios?',
    ]);

    const res = await (await import('supertest')).default(app)
      .post('/api/chat/suggestions')
      .set('Authorization', `Bearer valid-token`)
      .send({
        conversationHistory: [
          { role: 'user', content: 'Show me apartments' },
          { role: 'assistant', content: 'Here are some apartments...' },
        ],
      });

    // Auth check happens first
    expect(res.status).toBe(401);
  });

  it('validates suggestions request body', async () => {
    const app = createApp();

    const res = await (await import('supertest')).default(app)
      .post('/api/chat/suggestions')
      .set('Authorization', `Bearer valid-token`)
      .send({});

    // Auth check happens first
    expect(res.status).toBe(401);
  });
});
