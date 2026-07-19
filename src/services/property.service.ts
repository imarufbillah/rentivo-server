import { ObjectId, Filter } from 'mongodb';
import { getCollections } from '../lib/db/collections.js';
import {
  Property,
  PropertyWithStats,
  CreatePropertyDTO,
  UpdatePropertyDTO,
  PropertyFilters,
  Pagination,
  PaginatedResult,
} from '../types/index.js';

const LIST_PROJECTION = {
  description: 0,
  ownerId: 0,
  updatedAt: 0,
};

const ensureObjectId = (id: string): ObjectId => {
  if (!ObjectId.isValid(id)) {
    throw new Error('Invalid ObjectId');
  }
  return new ObjectId(id);
};

export const createProperty = async (
  data: CreatePropertyDTO,
  ownerId: string
): Promise<Property> => {
  const { properties } = await getCollections();
  const now = new Date();

  const property: Property = {
    ...data,
    status: data.status || 'active',
    bedrooms: data.bedrooms ?? 1,
    bathrooms: data.bathrooms ?? 1,
    amenities: data.amenities ?? [],
    ownerId: new ObjectId(ownerId),
    createdAt: now,
    updatedAt: now,
  };

  const result = await properties.insertOne(property as any);
  return { ...property, _id: result.insertedId };
};

export const getPropertyById = async (id: string): Promise<Property | null> => {
  const { properties } = await getCollections();
  return properties.findOne({ _id: ensureObjectId(id) });
};

export const getPropertyWithStats = async (id: string): Promise<PropertyWithStats | null> => {
  const { properties, interactions, reviews } = await getCollections();
  const objectId = ensureObjectId(id);

  const property = await properties.findOne({ _id: objectId });
  if (!property) return null;

  const [viewCount, saveCount, reviewDocs] = await Promise.all([
    interactions.countDocuments({ propertyId: objectId, type: 'view' }),
    interactions.countDocuments({ propertyId: objectId, type: 'save' }),
    reviews.find({ propertyId: objectId }).toArray(),
  ]);

  const totalReviews = reviewDocs.length;
  const averageRating = totalReviews > 0
    ? reviewDocs.reduce((sum, r) => sum + (r.rating || 0), 0) / totalReviews
    : null;

  return {
    ...property,
    viewCount,
    saveCount,
    averageRating,
    totalReviews,
  };
};

export const updateProperty = async (
  id: string,
  data: UpdatePropertyDTO,
  ownerId: string
): Promise<Property> => {
  const { properties } = await getCollections();
  const objectId = ensureObjectId(id);

  const existing = await properties.findOne({
    _id: objectId,
    ownerId: new ObjectId(ownerId),
  });

  if (!existing) {
    throw new Error('Property not found or not owned by user');
  }

  const result = await properties.findOneAndUpdate(
    { _id: objectId },
    { $set: { ...data, updatedAt: new Date() } },
    { returnDocument: 'after' }
  );

  if (!result) {
    throw new Error('Failed to update property');
  }

  return result;
};

export const deleteProperty = async (id: string, ownerId: string): Promise<void> => {
  const { properties, interactions, reviews } = await getCollections();
  const objectId = ensureObjectId(id);

  const existing = await properties.findOne({
    _id: objectId,
    ownerId: new ObjectId(ownerId),
  });

  if (!existing) {
    throw new Error('Property not found or not owned by user');
  }

  await Promise.all([
    interactions.deleteMany({ propertyId: objectId }),
    reviews.deleteMany({ propertyId: objectId }),
    properties.deleteOne({ _id: objectId }),
  ]);
};

export const getPropertiesByOwner = async (ownerId: string): Promise<Property[]> => {
  const { properties } = await getCollections();
  return properties
    .find({ ownerId: new ObjectId(ownerId) })
    .sort({ createdAt: -1 })
    .toArray();
};

export const searchProperties = async (
  filters: PropertyFilters,
  pagination: Pagination
): Promise<PaginatedResult<Property>> => {
  const { properties, reviews } = await getCollections();

  const page = pagination.page || 1;
  const limit = pagination.limit || 12;
  const skip = (page - 1) * limit;

  const filter: Filter<Property> = { status: 'active' };

  if (filters.search) {
    filter.$or = [
      { title: { $regex: filters.search, $options: 'i' } },
      { location: { $regex: filters.search, $options: 'i' } },
    ];
  }

  if (filters.location) {
    filter.location = { $regex: filters.location, $options: 'i' };
  }

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    filter.price = {};
    if (filters.minPrice !== undefined) filter.price.$gte = filters.minPrice;
    if (filters.maxPrice !== undefined) filter.price.$lte = filters.maxPrice;
  }

  if (filters.propertyType) {
    filter.propertyType = filters.propertyType;
  }

  if (filters.minBedrooms !== undefined || filters.maxBedrooms !== undefined) {
    filter.bedrooms = {};
    if (filters.minBedrooms !== undefined) filter.bedrooms.$gte = filters.minBedrooms;
    if (filters.maxBedrooms !== undefined) filter.bedrooms.$lte = filters.maxBedrooms;
  }

  if (filters.minBathrooms !== undefined || filters.maxBathrooms !== undefined) {
    filter.bathrooms = {};
    if (filters.minBathrooms !== undefined) filter.bathrooms.$gte = filters.minBathrooms;
    if (filters.maxBathrooms !== undefined) filter.bathrooms.$lte = filters.maxBathrooms;
  }

  if (filters.amenities && filters.amenities.length > 0) {
    filter.amenities = { $all: filters.amenities };
  }

  const sort: Record<string, 1 | -1> = {};
  if (filters.sortBy) {
    sort[filters.sortBy] = filters.sortOrder === 'asc' ? 1 : -1;
  } else {
    sort.createdAt = -1;
  }

  if (filters.minRating !== undefined) {
    const ratingMatch: Filter<Property> = { ...filter };

    const aggPipeline = [
      { $match: ratingMatch },
      {
        $lookup: {
          from: 'reviews',
          localField: '_id',
          foreignField: 'propertyId',
          as: 'reviewDocs',
        },
      },
      {
        $addFields: {
          avgRating: {
            $cond: {
              if: { $gt: [{ $size: '$reviewDocs' }, 0] },
              then: { $avg: '$reviewDocs.rating' },
              else: null,
            },
          },
        },
      },
      { $match: { avgRating: { $gte: filters.minRating, $ne: null } } },
      { $sort: sort },
      { $skip: skip },
      { $limit: limit },
      { $project: { reviewDocs: 0, avgRating: 0 } },
    ];

    const [results, countPipeline] = await Promise.all([
      properties.aggregate(aggPipeline).toArray(),
      properties.aggregate([
        { $match: ratingMatch },
        {
          $lookup: {
            from: 'reviews',
            localField: '_id',
            foreignField: 'propertyId',
            as: 'reviewDocs',
          },
        },
        {
          $addFields: {
            avgRating: {
              $cond: {
                if: { $gt: [{ $size: '$reviewDocs' }, 0] },
                then: { $avg: '$reviewDocs.rating' },
                else: null,
              },
            },
          },
        },
        { $match: { avgRating: { $gte: filters.minRating, $ne: null } } },
        { $count: 'total' },
      ]).toArray(),
    ]);

    const total = countPipeline[0]?.total || 0;

    return {
      data: results as Property[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  const [data, total] = await Promise.all([
    properties.find(filter).project(LIST_PROJECTION).sort(sort).skip(skip).limit(limit).toArray() as Promise<Property[]>,
    properties.countDocuments(filter),
  ]);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getAllAmenities = async (): Promise<string[]> => {
  const { properties } = await getCollections();
  const result = await properties.aggregate([
    { $match: { status: 'active' } },
    { $unwind: '$amenities' },
    { $group: { _id: { $toLower: '$amenities' } } },
    { $sort: { _id: 1 } },
  ]).toArray();
  return result.map((r) => r._id);
};

export const ensureIndexes = async (): Promise<void> => {
  const { properties } = await getCollections();

  await Promise.all([
    properties.createIndex({ ownerId: 1 }),
    properties.createIndex({ location: 1 }),
    properties.createIndex({ propertyType: 1 }),
    properties.createIndex({ price: 1 }),
    properties.createIndex({ createdAt: -1 }),
    properties.createIndex({ status: 1 }),
  ]);
};
