import * as propertyService from './property.service';
import * as interactionService from './interaction.service';
import * as reviewService from './review.service';

const toNumber = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
};

const toOptionalString = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  const s = String(value).trim();
  return s || undefined;
};

export const searchPropertiesTool = {
  type: 'function' as const,
  function: {
    name: 'searchProperties',
    description: 'Search for rental properties based on criteria like location, price range, and property type. Always call this when the user asks about available properties, apartments, houses, rooms, studios, or villas.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query for title or location keywords' },
        location: { type: 'string', description: 'Exact location filter (e.g. "Brooklyn, NY", "Manhattan")' },
        minPrice: { type: 'number', description: 'Minimum price in dollars as a number (e.g. 1000)' },
        maxPrice: { type: 'number', description: 'Maximum price in dollars as a number (e.g. 3000)' },
        propertyType: { type: 'string', description: 'Type of property: apartment, house, room, studio, villa, condo, townhouse' },
      },
    },
  },
};

export const getPropertyDetailsTool = {
  type: 'function' as const,
  function: {
    name: 'getPropertyDetails',
    description: 'Get detailed information about a specific property including reviews and ratings. Use this when the user asks for more info about a specific listing.',
    parameters: {
      type: 'object',
      properties: {
        propertyId: { type: 'string', description: 'The property ID from search results (e.g. "6a5b411870424654bc683f7e")' },
      },
      required: ['propertyId'],
    },
  },
};

export const getUserSavedPropertiesTool = {
  type: 'function' as const,
  function: {
    name: 'getUserSavedProperties',
    description: "Get the current user's saved or favorited properties. Use this when the user asks about their saved listings, favorites, or bookmarked properties.",
    parameters: {
      type: 'object',
      properties: {},
    },
  },
};

export const tools = [searchPropertiesTool, getPropertyDetailsTool, getUserSavedPropertiesTool];

export const executeToolCall = async (
  toolName: string,
  args: Record<string, unknown>,
  userId: string
): Promise<unknown> => {
  switch (toolName) {
    case 'searchProperties': {
      const filters = {
        search: toOptionalString(args.query),
        location: toOptionalString(args.location),
        minPrice: toNumber(args.minPrice),
        maxPrice: toNumber(args.maxPrice),
        propertyType: toOptionalString(args.propertyType) as any,
      };
      const result = await propertyService.searchProperties(filters, { page: 1, limit: 5 });
      return result.data.map((p) => ({
        id: p._id?.toString(),
        title: p.title,
        location: p.location,
        price: p.price,
        propertyType: p.propertyType,
        images: p.images.slice(0, 1),
      }));
    }

    case 'getPropertyDetails': {
      const propertyId = toOptionalString(args.propertyId);
      if (!propertyId) return { error: 'Missing propertyId parameter' };
      const property = await propertyService.getPropertyById(propertyId);
      if (!property) return { error: 'Property not found' };

      const [reviews, avgRating] = await Promise.all([
        reviewService.getReviewsByProperty(propertyId),
        reviewService.getAverageRating(propertyId),
      ]);

      return {
        ...property,
        _id: property._id?.toString(),
        ownerId: undefined,
        averageRating: avgRating,
        reviewCount: reviews.length,
      };
    }

    case 'getUserSavedProperties': {
      const properties = await interactionService.getUserSavedProperties(userId);
      return properties.map((p) => ({
        id: p._id?.toString(),
        title: p.title,
        location: p.location,
        price: p.price,
        propertyType: p.propertyType,
      }));
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
};
