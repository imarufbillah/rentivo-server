import { z } from 'zod';

export const createReviewSchema = z.object({
  propertyId: z.string().length(24),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(10).max(1000),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
