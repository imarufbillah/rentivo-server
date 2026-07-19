import { z } from 'zod';

export const propertyTypeEnum = z.enum(['apartment', 'house', 'room', 'studio', 'villa']);
export const propertyStatusEnum = z.enum(['active', 'pending', 'archived', 'rented']);
export const furnishingEnum = z.enum(['furnished', 'semi-furnished', 'unfurnished']);
export const conditionEnum = z.enum(['new', 'excellent', 'good', 'fair']);
export const parkingEnum = z.enum(['included', 'available', 'none']);
export const petPolicyEnum = z.enum(['allowed', 'not-allowed', 'case-by-case']);
export const smokingPolicyEnum = z.enum(['allowed', 'not-allowed']);
export const rentFrequencyEnum = z.enum(['monthly', 'weekly', 'daily']);

const amenityString = z.string().min(1).max(30).transform((s) => s.trim().toLowerCase());

export const createPropertySchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(20).max(2000),
  price: z.number().positive(),
  location: z.string().min(2).max(200),
  propertyType: propertyTypeEnum,
  images: z.array(z.string().url()).min(1).max(6),
  status: propertyStatusEnum.optional().default('active'),
  bedrooms: z.number().int().min(0).max(100).optional().default(1),
  bathrooms: z.number().int().min(0).max(100).optional().default(1),
  amenities: z.array(amenityString).optional().default([]),
  size: z.number().positive().optional(),
  balconies: z.number().int().nonnegative().optional(),
  floor: z.number().int().nonnegative().optional(),
  totalFloors: z.number().int().positive().optional(),
  furnishing: furnishingEnum.optional(),
  condition: conditionEnum.optional(),
  utilities: z.array(z.string().max(30)).optional(),
  parking: parkingEnum.optional(),
  internet: z.boolean().optional(),
  securityDeposit: z.number().nonnegative().optional(),
  advancePayment: z.number().nonnegative().optional(),
  leaseDuration: z.number().int().positive().optional(),
  minStay: z.number().int().positive().optional(),
  rentFrequency: rentFrequencyEnum.optional(),
  petPolicy: petPolicyEnum.optional(),
  smokingPolicy: smokingPolicyEnum.optional(),
  houseRules: z.string().max(2000).optional(),
  rentalTerms: z.string().max(2000).optional(),
  fullAddress: z.string().max(500).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  availableFrom: z.coerce.date().optional(),
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
