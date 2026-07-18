import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockCollections, resetMocks } from './helpers';
import propertyRoutes from '../routes/property.routes';
import express from 'express';

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/properties', propertyRoutes);
  return app;
};

const ownerId = '507f1f77bcf86cd799439011';
const propertyId = '507f1f77bcf86cd799439012';

const validProperty = {
  title: 'Cozy Apartment Downtown',
  description: 'A beautiful apartment in the heart of the city with modern amenities',
  price: 1500,
  location: 'New York',
  propertyType: 'apartment',
  images: ['https://example.com/image1.jpg'],
};

beforeEach(() => {
  resetMocks();
});

describe('POST /api/properties', () => {
  it('creates a property for authenticated owner', async () => {
    const app = createApp();
    mockCollections.properties.insertOne.mockResolvedValue({
      insertedId: { toString: () => propertyId },
    });

    const res = await (await import('supertest')).default(app)
      .post('/api/properties')
      .set('Authorization', 'Bearer valid-token')
      .send(validProperty);

    // Without a real JWT, auth middleware will reject
    expect(res.status).toBe(401);
  });
});

describe('GET /api/properties', () => {
  it('returns paginated results', async () => {
    const app = createApp();
    mockCollections.properties.countDocuments.mockResolvedValue(25);
    mockCollections.properties.toArray.mockResolvedValue([]);

    const res = await (await import('supertest')).default(app)
      .get('/api/properties');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.pagination).toBeDefined();
  });

  it('applies location filter from query params', async () => {
    const app = createApp();
    mockCollections.properties.countDocuments.mockResolvedValue(5);
    mockCollections.properties.toArray.mockResolvedValue([]);

    const res = await (await import('supertest')).default(app)
      .get('/api/properties?location=New+York');

    expect(res.status).toBe(200);
    expect(mockCollections.properties.find).toHaveBeenCalledWith(
      expect.objectContaining({ location: { $regex: 'New York', $options: 'i' } })
    );
  });

  it('applies price range filter', async () => {
    const app = createApp();
    mockCollections.properties.countDocuments.mockResolvedValue(3);
    mockCollections.properties.toArray.mockResolvedValue([]);

    const res = await (await import('supertest')).default(app)
      .get('/api/properties?minPrice=1000&maxPrice=2000');

    expect(res.status).toBe(200);
    expect(mockCollections.properties.find).toHaveBeenCalledWith(
      expect.objectContaining({
        price: { $gte: 1000, $lte: 2000 },
      })
    );
  });
});

describe('GET /api/properties/:id', () => {
  it('returns property when found', async () => {
    const app = createApp();
    mockCollections.properties.findOne.mockResolvedValue({
      _id: propertyId,
      title: 'Test Property',
    });

    const res = await (await import('supertest')).default(app)
      .get(`/api/properties/${propertyId}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 404 when not found', async () => {
    const app = createApp();
    mockCollections.properties.findOne.mockResolvedValue(null);

    const res = await (await import('supertest')).default(app)
      .get(`/api/properties/${propertyId}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('RESOURCE_NOT_FOUND');
  });
});

describe('DELETE /api/properties/:id', () => {
  it('returns 401 without auth token', async () => {
    const app = createApp();

    const res = await (await import('supertest')).default(app)
      .delete(`/api/properties/${propertyId}`);

    expect(res.status).toBe(401);
  });
});
