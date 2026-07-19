import { z } from 'zod';

export const createInteractionSchema = z.object({
  propertyId: z.string().length(24),
  type: z.enum(['view', 'save']),
});

export type CreateInteractionInput = z.infer<typeof createInteractionSchema>;

export const getInteractionHistorySchema = z.object({
  type: z.enum(['view', 'save']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(12),
});

export type GetInteractionHistoryInput = z.infer<typeof getInteractionHistorySchema>;

export const deleteInteractionSchema = z.object({
  propertyId: z.string().length(24),
  type: z.enum(['view', 'save']),
});

export type DeleteInteractionInput = z.infer<typeof deleteInteractionSchema>;

export const propertyIdParamSchema = z.object({
  propertyId: z.string().length(24),
});

export type PropertyIdParamInput = z.infer<typeof propertyIdParamSchema>;
