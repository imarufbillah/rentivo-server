import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockCollections, resetMocks } from './helpers';
import {
  createProperty,
  getPropertyById,
  updateProperty,
  deleteProperty,
  getPropertiesByOwner,
  searchProperties,
} from '../services/property.service';

const ownerId = '507f1f77bcf86cd799439011';
const propertyId = '507f1f77bcf86cd799439012';

const validPropertyData = {
  title: 'Cozy Apartment Downtown',
  description: 'A beautiful apartment in the heart of the city with modern amenities',
  price: 1500,
  location: 'New York',
  propertyType: 'apartment' as const,
  images: ['https://example.com/image1.jpg'],
};

beforeEach(() => {
  resetMocks();
});

describe('createProperty', () => {
  it('creates a property with valid data', async () => {
    const result = await createProperty(validPropertyData, ownerId);

    expect(result.title).toBe(validPropertyData.title);
    expect(result.price).toBe(validPropertyData.price);
    expect(result.status).toBe('active');
    expect(mockCollections.properties.insertOne).toHaveBeenCalledOnce();
  });

  it('uses provided status when given', async () => {
    const result = await createProperty({ ...validPropertyData, status: 'pending' }, ownerId);
    expect(result.status).toBe('pending');
  });
});

describe('getPropertyById', () => {
  it('returns null for non-existent property', async () => {
    const result = await getPropertyById(propertyId);
    expect(result).toBeNull();
  });
});

describe('updateProperty', () => {
  it('throws when property not found', async () => {
    mockCollections.properties.findOne.mockResolvedValue(null);

    await expect(updateProperty(propertyId, { price: 2000 }, ownerId)).rejects.toThrow(
      'Property not found or not owned by user'
    );
  });

  it('updates property when found', async () => {
    const existing = { _id: propertyId, ownerId: { toString: () => ownerId }, price: 1500 };
    const updated = { ...existing, price: 2000, updatedAt: new Date() };

    mockCollections.properties.findOne
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce(updated);
    mockCollections.properties.findOneAndUpdate.mockResolvedValue(updated);

    const result = await updateProperty(propertyId, { price: 2000 }, ownerId);
    expect(result.price).toBe(2000);
  });
});

describe('deleteProperty', () => {
  it('throws when property not found', async () => {
    mockCollections.properties.findOne.mockResolvedValue(null);

    await expect(deleteProperty(propertyId, ownerId)).rejects.toThrow(
      'Property not found or not owned by user'
    );
  });

  it('cascades delete to interactions and reviews', async () => {
    const existing = { _id: propertyId, ownerId: { toString: () => ownerId } };
    mockCollections.properties.findOne.mockResolvedValue(existing);

    await deleteProperty(propertyId, ownerId);

    expect(mockCollections.interactions.deleteMany).toHaveBeenCalledOnce();
    expect(mockCollections.reviews.deleteMany).toHaveBeenCalledOnce();
    expect(mockCollections.properties.deleteOne).toHaveBeenCalledOnce();
  });
});

describe('getPropertiesByOwner', () => {
  it('returns properties sorted by recency', async () => {
    await getPropertiesByOwner(ownerId);

    expect(mockCollections.properties.find).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: expect.anything() })
    );
    expect(mockCollections.properties.sort).toHaveBeenCalledWith({ createdAt: -1 });
  });
});

describe('searchProperties', () => {
  it('returns paginated results with default page and limit', async () => {
    const result = await searchProperties({}, {});

    expect(result.pagination.page).toBe(1);
    expect(result.pagination.limit).toBe(12);
    expect(result.pagination.total).toBe(0);
    expect(result.pagination.totalPages).toBe(0);
  });

  it('applies location filter', async () => {
    await searchProperties({ location: 'New York' }, {});

    expect(mockCollections.properties.find).toHaveBeenCalledWith(
      expect.objectContaining({ location: 'New York' })
    );
  });

  it('applies price range filter', async () => {
    await searchProperties({ minPrice: 1000, maxPrice: 2000 }, {});

    expect(mockCollections.properties.find).toHaveBeenCalledWith(
      expect.objectContaining({
        price: { $gte: 1000, $lte: 2000 },
      })
    );
  });

  it('applies property type filter', async () => {
    await searchProperties({ propertyType: 'villa' }, {});

    expect(mockCollections.properties.find).toHaveBeenCalledWith(
      expect.objectContaining({ propertyType: 'villa' })
    );
  });

  it('calculates correct pagination metadata', async () => {
    mockCollections.properties.countDocuments.mockResolvedValue(37);

    const result = await searchProperties({}, { page: 2, limit: 10 });

    expect(result.pagination.total).toBe(37);
    expect(result.pagination.totalPages).toBe(4);
    expect(result.pagination.page).toBe(2);
  });

  it('defaults sort to createdAt desc', async () => {
    await searchProperties({}, {});

    expect(mockCollections.properties.sort).toHaveBeenCalledWith({ createdAt: -1 });
  });

  it('applies custom sort', async () => {
    await searchProperties({ sortBy: 'price', sortOrder: 'asc' }, {});

    expect(mockCollections.properties.sort).toHaveBeenCalledWith({ price: 1 });
  });
});
