import { z } from 'zod';

export const propertyTypeEnum = z.enum(['apartment', 'house', 'room', 'studio', 'villa']);
export const propertyStatusEnum = z.enum(['active', 'pending', 'archived']);

const amenityString = z.string().min(1).max(30).transform((s) => s.trim().toLowerCase());

export const createPropertySchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(20).max(2000),
  price: z.number().positive(),
  location: z.string().min(2).max(200),
  propertyType: propertyTypeEnum,
  images: z.array(z.string().url()).min(1).max(6),
  status: propertyStatusEnum.optional().default('active'),
  bedrooms: z.number().int().min(0).max(20).optional().default(1),
  bathrooms: z.number().int().min(0).max(20).optional().default(1),
  amenities: z.array(amenityString).optional().default([]),
});

export const updatePropertySchema = createPropertySchema.partial();

export const propertyFilterSchema = z.object({
  search: z.string().optional(),
  location: z.string().optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  propertyType: propertyTypeEnum.optional(),
  minBedrooms: z.coerce.number().int().nonnegative().optional(),
  maxBedrooms: z.coerce.number().int().positive().optional(),
  minBathrooms: z.coerce.number().int().nonnegative().optional(),
  maxBathrooms: z.coerce.number().int().positive().optional(),
  amenities: z.union([z.string(), z.array(z.string())]).transform((val) => {
    const raw = Array.isArray(val) ? val : val.split(',');
    return raw.map((s) => s.trim().toLowerCase()).filter(Boolean);
  }).optional(),
  minRating: z.coerce.number().min(1).max(5).optional(),
  sortBy: z.enum(['price', 'createdAt', 'bedrooms']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(50).optional().default(12),
});

export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;
export type PropertyFilterInput = z.infer<typeof propertyFilterSchema>;
