import * as propertyService from './property.service';
import * as interactionService from './interaction.service';
import * as reviewService from './review.service';

export const searchPropertiesTool = {
  type: 'function' as const,
  function: {
    name: 'searchProperties',
    description: 'Search for rental properties based on criteria like location, price range, and property type',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query for title or location' },
        location: { type: 'string', description: 'Exact location filter' },
        minPrice: { type: 'number', description: 'Minimum price in dollars' },
        maxPrice: { type: 'number', description: 'Maximum price in dollars' },
        propertyType: {
          type: 'string',
          enum: ['apartment', 'house', 'room', 'studio', 'villa'],
          description: 'Type of property',
        },
      },
    },
  },
};

export const getPropertyDetailsTool = {
  type: 'function' as const,
  function: {
    name: 'getPropertyDetails',
    description: 'Get detailed information about a specific property by ID',
    parameters: {
      type: 'object',
      properties: {
        propertyId: { type: 'string', description: 'MongoDB ObjectId of the property' },
      },
      required: ['propertyId'],
    },
  },
};

export const getUserSavedPropertiesTool = {
  type: 'function' as const,
  function: {
    name: 'getUserSavedProperties',
    description: "Get the current user's saved (favorited) properties",
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
        search: args.query as string | undefined,
        location: args.location as string | undefined,
        minPrice: args.minPrice as number | undefined,
        maxPrice: args.maxPrice as number | undefined,
        propertyType: args.propertyType as any,
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
      const property = await propertyService.getPropertyById(args.propertyId as string);
      if (!property) return { error: 'Property not found' };

      const [reviews, avgRating] = await Promise.all([
        reviewService.getReviewsByProperty(args.propertyId as string),
        reviewService.getAverageRating(args.propertyId as string),
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
