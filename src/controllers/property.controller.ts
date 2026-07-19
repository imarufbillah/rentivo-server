import { Request, Response } from 'express';
import * as propertyService from '../services/property.service';
import * as interactionService from '../services/interaction.service';
import * as reviewService from '../services/review.service';
import { getCollections } from '../lib/db/collections';
import { createPropertySchema, updatePropertySchema, propertyFilterSchema } from '../lib/validation/property.schemas';
import { PropertyWithStats } from '../types';
import { logValidationError, logControllerError } from '../lib/logger';

export const createProperty = async (req: Request, res: Response) => {
  try {
    const parsed = createPropertySchema.safeParse(req.body);
    if (!parsed.success) {
      logValidationError(req, parsed.error, 'createProperty');
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_FAILED', message: parsed.error.issues[0].message },
      });
    }

    const property = await propertyService.createProperty(parsed.data, req.user!.id);
    res.status(201).json({ success: true, data: { property } });
  } catch (error) {
    logControllerError(req, error, 'createProperty');
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create property' },
    });
  }
};

export const getProperties = async (req: Request, res: Response) => {
  try {
    const parsed = propertyFilterSchema.safeParse(req.query);
    if (!parsed.success) {
      logValidationError(req, parsed.error, 'getProperties');
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_FAILED', message: parsed.error.issues[0].message },
      });
    }

    const { page, limit, ...filters } = parsed.data;
    const result = await propertyService.searchProperties(filters, { page, limit });
    res.json({ success: true, data: result });
  } catch (error) {
    logControllerError(req, error, 'getProperties');
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to search properties' },
    });
  }
};

export const getPropertyById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const propertyWithStats = await propertyService.getPropertyWithStats(id);
    if (!propertyWithStats) {
      return res.status(404).json({
        success: false,
        error: { code: 'RESOURCE_NOT_FOUND', message: 'Property not found' },
      });
    }

    const { users } = await getCollections();
    const owner = await users.findOne(
      { _id: propertyWithStats.ownerId },
      { projection: { passwordHash: 0 } }
    );

    res.json({
      success: true,
      data: {
        property: propertyWithStats,
        owner: owner
          ? {
              _id: owner._id,
              name: owner.name,
              avatar: owner.avatar,
              bio: owner.bio,
              phone: owner.phone,
              isVerified: owner.isVerified,
              createdAt: owner.createdAt,
            }
          : null,
      },
    });
  } catch (error) {
    logControllerError(req, error, 'getPropertyById');
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch property' },
    });
  }
};

export const updateProperty = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const parsed = updatePropertySchema.safeParse(req.body);
    if (!parsed.success) {
      logValidationError(req, parsed.error, 'updateProperty');
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_FAILED', message: parsed.error.issues[0].message },
      });
    }

    const property = await propertyService.updateProperty(id, parsed.data, req.user!.id);
    res.json({ success: true, data: { property } });
  } catch (error) {
    logControllerError(req, error, 'updateProperty');
    const message = error instanceof Error ? error.message : 'Failed to update property';
    const status = message.includes('not found') ? 404 : 500;
    res.status(status).json({
      success: false,
      error: { code: status === 404 ? 'RESOURCE_NOT_FOUND' : 'INTERNAL_ERROR', message },
    });
  }
};

export const deleteProperty = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await propertyService.deleteProperty(id, req.user!.id);
    res.json({ success: true });
  } catch (error) {
    logControllerError(req, error, 'deleteProperty');
    const message = error instanceof Error ? error.message : 'Failed to delete property';
    const status = message.includes('not found') ? 404 : 500;
    res.status(status).json({
      success: false,
      error: { code: status === 404 ? 'RESOURCE_NOT_FOUND' : 'INTERNAL_ERROR', message },
    });
  }
};

export const getMyProperties = async (req: Request, res: Response) => {
  try {
    const properties = await propertyService.getPropertiesByOwner(req.user!.id);

    const [interactionCounts, reviewStats] = await Promise.all([
      interactionService.getInteractionCountsByOwner(req.user!.id),
      reviewService.getReviewStatsByOwner(req.user!.id),
    ]);

    const propertiesWithStats: PropertyWithStats[] = properties.map((property) => {
      const propertyId = property._id!.toString();
      const interactions = interactionCounts.get(propertyId) || { views: 0, saves: 0 };
      const reviews = reviewStats.get(propertyId) || { averageRating: null, totalReviews: 0 };

      return {
        ...property,
        viewCount: interactions.views,
        saveCount: interactions.saves,
        averageRating: reviews.averageRating,
        totalReviews: reviews.totalReviews,
      };
    });

    res.json({ success: true, data: { properties: propertiesWithStats } });
  } catch (error) {
    logControllerError(req, error, 'getMyProperties');
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch properties' },
    });
  }
};

export const getAllAmenities = async (req: Request, res: Response) => {
  try {
    const amenities = await propertyService.getAllAmenities();
    res.json({ success: true, data: { amenities } });
  } catch (error) {
    logControllerError(req, error, 'getAllAmenities');
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch amenities' },
    });
  }
};
