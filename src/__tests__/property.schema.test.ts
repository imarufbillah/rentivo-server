import { describe, it, expect } from 'vitest';
import { createPropertySchema, updatePropertySchema, propertyFilterSchema } from '../lib/validation/property.schemas.js';

const validProperty = {
  title: 'Cozy Apartment Downtown',
  description: 'A beautiful apartment in the heart of the city with modern amenities',
  price: 1500,
  location: 'New York',
  propertyType: 'apartment' as const,
  images: ['https://example.com/image1.jpg'],
};

describe('createPropertySchema', () => {
  it('accepts valid property data', () => {
    const result = createPropertySchema.safeParse(validProperty);
    expect(result.success).toBe(true);
  });

  it('rejects title shorter than 5 characters', () => {
    const result = createPropertySchema.safeParse({ ...validProperty, title: 'Hi' });
    expect(result.success).toBe(false);
  });

  it('rejects title longer than 200 characters', () => {
    const result = createPropertySchema.safeParse({ ...validProperty, title: 'a'.repeat(201) });
    expect(result.success).toBe(false);
  });

  it('rejects description shorter than 20 characters', () => {
    const result = createPropertySchema.safeParse({ ...validProperty, description: 'Short' });
    expect(result.success).toBe(false);
  });

  it('rejects negative price', () => {
    const result = createPropertySchema.safeParse({ ...validProperty, price: -100 });
    expect(result.success).toBe(false);
  });

  it('rejects zero price', () => {
    const result = createPropertySchema.safeParse({ ...validProperty, price: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects empty images array', () => {
    const result = createPropertySchema.safeParse({ ...validProperty, images: [] });
    expect(result.success).toBe(false);
  });

  it('rejects more than 6 images', () => {
    const images = Array.from({ length: 7 }, (_, i) => `https://example.com/img${i}.jpg`);
    const result = createPropertySchema.safeParse({ ...validProperty, images });
    expect(result.success).toBe(false);
  });

  it('accepts exactly 6 images', () => {
    const images = Array.from({ length: 6 }, (_, i) => `https://example.com/img${i}.jpg`);
    const result = createPropertySchema.safeParse({ ...validProperty, images });
    expect(result.success).toBe(true);
  });

  it('rejects invalid property type', () => {
    const result = createPropertySchema.safeParse({ ...validProperty, propertyType: 'condo' });
    expect(result.success).toBe(false);
  });

  it('rejects non-url image strings', () => {
    const result = createPropertySchema.safeParse({ ...validProperty, images: ['not-a-url'] });
    expect(result.success).toBe(false);
  });
});

describe('updatePropertySchema', () => {
  it('accepts partial updates', () => {
    const result = updatePropertySchema.safeParse({ price: 2000 });
    expect(result.success).toBe(true);
  });

  it('accepts empty update', () => {
    const result = updatePropertySchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe('propertyFilterSchema', () => {
  it('applies default values for page and limit', () => {
    const result = propertyFilterSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(12);
    }
  });

  it('coerces string numbers from query params', () => {
    const result = propertyFilterSchema.safeParse({ minPrice: '100', maxPrice: '2000', page: '2' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.minPrice).toBe(100);
      expect(result.data.maxPrice).toBe(2000);
      expect(result.data.page).toBe(2);
    }
  });
});
