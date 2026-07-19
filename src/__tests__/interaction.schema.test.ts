import { describe, it, expect } from 'vitest';
import { createInteractionSchema } from '../lib/validation/interaction.schemas';

const validInteraction = {
  propertyId: '507f1f77bcf86cd799439011',
  type: 'view' as const,
};

describe('createInteractionSchema', () => {
  it('accepts valid interaction data', () => {
    const result = createInteractionSchema.safeParse(validInteraction);
    expect(result.success).toBe(true);
  });

  it('accepts save type', () => {
    const result = createInteractionSchema.safeParse({ ...validInteraction, type: 'save' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid type', () => {
    const result = createInteractionSchema.safeParse({ ...validInteraction, type: 'like' });
    expect(result.success).toBe(false);
  });

  it('rejects propertyId shorter than 24 characters', () => {
    const result = createInteractionSchema.safeParse({ ...validInteraction, propertyId: '123' });
    expect(result.success).toBe(false);
  });

  it('rejects propertyId longer than 24 characters', () => {
    const result = createInteractionSchema.safeParse({ ...validInteraction, propertyId: 'a'.repeat(25) });
    expect(result.success).toBe(false);
  });
});
