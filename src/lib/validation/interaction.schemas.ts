import { z } from 'zod';

export const createInteractionSchema = z.object({
  propertyId: z.string().length(24),
  type: z.enum(['view', 'save', 'dismiss']),
});

export type CreateInteractionInput = z.infer<typeof createInteractionSchema>;
