import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockCollections, resetMocks } from './helpers.js';
import {
  trackInteraction,
  getUserInteractions,
  getUserSavedProperties,
  deleteInteractionsByProperty,
  capInteractionHistory,
} from '../services/interaction.service.js';

const userId = '507f1f77bcf86cd799439011';
const propertyId = '507f1f77bcf86cd799439012';

beforeEach(() => {
  resetMocks();
});

describe('trackInteraction', () => {
  it('creates a view interaction when none exists', async () => {
    const result = await trackInteraction(userId, propertyId, 'view');

    expect(result.type).toBe('view');
    expect(result.userId.toString()).toBe(userId);
    expect(result.propertyId.toString()).toBe(propertyId);
    expect(mockCollections.interactions.insertOne).toHaveBeenCalledOnce();
  });

  it('updates existing view timestamp instead of creating duplicate', async () => {
    const existingView = {
      _id: { toString: () => 'existing-view-id' },
      userId: { toString: () => userId },
      propertyId: { toString: () => propertyId },
      type: 'view',
      createdAt: new Date('2025-01-01'),
    };
    mockCollections.interactions.findOne.mockResolvedValue(existingView);

    const result = await trackInteraction(userId, propertyId, 'view');

    expect(mockCollections.interactions.updateOne).toHaveBeenCalledWith(
      { _id: existingView._id },
      { $set: { createdAt: expect.any(Date) } }
    );
    expect(mockCollections.interactions.insertOne).not.toHaveBeenCalled();
    expect(result.type).toBe('view');
  });

  it('creates a save interaction', async () => {
    const result = await trackInteraction(userId, propertyId, 'save');
    expect(result.type).toBe('save');
  });

  it('returns existing save without creating duplicate', async () => {
    const existingSave = {
      _id: { toString: () => 'existing-save-id' },
      userId: { toString: () => userId },
      propertyId: { toString: () => propertyId },
      type: 'save',
      createdAt: new Date('2025-01-01'),
    };
    mockCollections.interactions.findOne.mockResolvedValue(existingSave);

    const result = await trackInteraction(userId, propertyId, 'save');

    expect(mockCollections.interactions.insertOne).not.toHaveBeenCalled();
    expect(result.type).toBe('save');
  });

  it('calls capInteractionHistory after tracking', async () => {
    mockCollections.interactions.countDocuments.mockResolvedValue(50);

    await trackInteraction(userId, propertyId, 'view');

    expect(mockCollections.interactions.countDocuments).toHaveBeenCalled();
  });
});

describe('getUserInteractions', () => {
  it('returns interactions sorted by recency', async () => {
    await getUserInteractions(userId);

    expect(mockCollections.interactions.find).toHaveBeenCalledWith(
      expect.objectContaining({ userId: expect.anything() })
    );
    expect(mockCollections.interactions.sort).toHaveBeenCalledWith({ createdAt: -1 });
  });

  it('applies limit when provided', async () => {
    await getUserInteractions(userId, 10);

    expect(mockCollections.interactions.limit).toHaveBeenCalledWith(10);
  });
});

describe('getUserSavedProperties', () => {
  it('returns empty array when no save interactions', async () => {
    mockCollections.interactions.toArray.mockResolvedValue([]);

    const result = await getUserSavedProperties(userId);

    expect(result).toEqual([]);
    expect(mockCollections.properties.find).not.toHaveBeenCalled();
  });

  it('returns properties matching saved interactions', async () => {
    const savedInteractions = [
      { propertyId: { toString: () => propertyId } },
    ];
    mockCollections.interactions.toArray.mockResolvedValue(savedInteractions);
    mockCollections.properties.toArray.mockResolvedValue([{ _id: propertyId, title: 'Test' }]);

    const result = await getUserSavedProperties(userId);

    expect(result).toHaveLength(1);
    expect(mockCollections.properties.find).toHaveBeenCalledWith(
      expect.objectContaining({ _id: { $in: expect.any(Array) } })
    );
  });
});

describe('deleteInteractionsByProperty', () => {
  it('deletes all interactions for a property', async () => {
    await deleteInteractionsByProperty(propertyId);

    expect(mockCollections.interactions.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ propertyId: expect.anything() })
    );
  });
});

describe('capInteractionHistory', () => {
  it('does nothing when under limit', async () => {
    mockCollections.interactions.countDocuments.mockResolvedValue(50);

    await capInteractionHistory(userId, 100);

    expect(mockCollections.interactions.find).not.toHaveBeenCalled();
    expect(mockCollections.interactions.deleteMany).not.toHaveBeenCalled();
  });

  it('deletes oldest interactions when over limit', async () => {
    mockCollections.interactions.countDocuments.mockResolvedValue(105);

    const oldestInteractions = Array.from({ length: 5 }, (_, i) => ({
      _id: { toString: () => `id${i}` },
    }));
    mockCollections.interactions.toArray.mockResolvedValue(oldestInteractions);

    await capInteractionHistory(userId, 100);

    expect(mockCollections.interactions.find).toHaveBeenCalled();
    expect(mockCollections.interactions.sort).toHaveBeenCalledWith({ createdAt: 1 });
    expect(mockCollections.interactions.limit).toHaveBeenCalledWith(5);
    expect(mockCollections.interactions.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ _id: { $in: expect.any(Array) } })
    );
  });

  it('keeps exactly 100 interactions when starting with 105', async () => {
    mockCollections.interactions.countDocuments.mockResolvedValue(105);

    const oldest5 = Array.from({ length: 5 }, (_, i) => ({
      _id: { toString: () => `oldest${i}` },
    }));
    mockCollections.interactions.toArray.mockResolvedValue(oldest5);

    await capInteractionHistory(userId, 100);

    expect(mockCollections.interactions.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: { $in: oldest5.map((i) => i._id) },
      })
    );
  });
});
