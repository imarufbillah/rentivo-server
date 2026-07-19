import { vi } from 'vitest';

const createMockCollection = () => ({
  find: vi.fn().mockReturnThis(),
  findOne: vi.fn().mockResolvedValue(null),
  aggregate: vi.fn().mockReturnThis(),
  insertOne: vi.fn().mockResolvedValue({ insertedId: { toString: () => '507f1f77bcf86cd799439011' } }),
  findOneAndUpdate: vi.fn().mockResolvedValue(null),
  updateOne: vi.fn().mockResolvedValue({ matchedCount: 1, modifiedCount: 1 }),
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
  rentals: createMockCollection(),
};

export const resetMocks = () => {
  Object.values(mockCollections).forEach((col) => {
    Object.values(col).forEach((fn: any) => {
      if (typeof fn === 'function' && fn.mockReset) fn.mockReset();
    });
  });

  // Restore chainable mocks for all collections
  Object.values(mockCollections).forEach((col) => {
    col.find.mockReturnThis();
    col.aggregate.mockReturnThis();
    col.project.mockReturnThis();
    col.sort.mockReturnThis();
    col.skip.mockReturnThis();
    col.limit.mockReturnThis();
    col.toArray.mockResolvedValue([]);
    col.countDocuments.mockResolvedValue(0);
    col.findOne.mockResolvedValue(null);
    col.insertOne.mockResolvedValue({
      insertedId: { toString: () => '507f1f77bcf86cd799439011', equals: (id: any) => id?.toString?.() === '507f1f77bcf86cd799439011' },
    });
    col.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
    col.deleteOne.mockResolvedValue({ deletedCount: 1 });
    col.deleteMany.mockResolvedValue({ deletedCount: 0 });
    col.createIndex.mockResolvedValue('');
  });
};

vi.mock('../lib/db/collections', () => ({
  getCollections: vi.fn().mockResolvedValue(mockCollections),
}));
