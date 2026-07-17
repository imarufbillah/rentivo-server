import { vi } from 'vitest';

const createMockCollection = () => ({
  find: vi.fn().mockReturnThis(),
  findOne: vi.fn().mockResolvedValue(null),
  insertOne: vi.fn().mockResolvedValue({ insertedId: { toString: () => '507f1f77bcf86cd799439011' } }),
  findOneAndUpdate: vi.fn().mockResolvedValue(null),
  deleteOne: vi.fn().mockResolvedValue({ deletedCount: 1 }),
  deleteMany: vi.fn().mockResolvedValue({ deletedCount: 0 }),
  countDocuments: vi.fn().mockResolvedValue(0),
  createIndex: vi.fn().mockResolvedValue(''),
  project: vi.fn().mockReturnThis(),
  sort: vi.fn().mockReturnThis(),
  skip: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  toArray: vi.fn().mockResolvedValue([]),
});

export const mockCollections = {
  users: createMockCollection(),
  properties: createMockCollection(),
  interactions: createMockCollection(),
  reviews: createMockCollection(),
};

export const resetMocks = () => {
  Object.values(mockCollections).forEach((col) => {
    Object.values(col).forEach((fn: any) => {
      if (typeof fn === 'function' && fn.mockReset) fn.mockReset();
    });
  });

  // Restore chainable mocks
  mockCollections.properties.find.mockReturnThis();
  mockCollections.properties.project.mockReturnThis();
  mockCollections.properties.sort.mockReturnThis();
  mockCollections.properties.skip.mockReturnThis();
  mockCollections.properties.limit.mockReturnThis();
  mockCollections.properties.toArray.mockResolvedValue([]);

  // Restore default return values
  mockCollections.properties.countDocuments.mockResolvedValue(0);
  mockCollections.properties.findOne.mockResolvedValue(null);
  mockCollections.properties.insertOne.mockResolvedValue({
    insertedId: { toString: () => '507f1f77bcf86cd799439011', equals: (id: any) => id?.toString?.() === '507f1f77bcf86cd799439011' },
  });
  mockCollections.properties.findOneAndUpdate.mockResolvedValue(null);
  mockCollections.properties.deleteOne.mockResolvedValue({ deletedCount: 1 });
  mockCollections.properties.deleteMany.mockResolvedValue({ deletedCount: 0 });
  mockCollections.properties.createIndex.mockResolvedValue('');
  mockCollections.interactions.deleteMany.mockResolvedValue({ deletedCount: 0 });
  mockCollections.reviews.deleteMany.mockResolvedValue({ deletedCount: 0 });
};

vi.mock('../lib/db/collections', () => ({
  getCollections: vi.fn().mockResolvedValue(mockCollections),
}));
