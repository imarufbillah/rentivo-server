import { Request, Response } from 'express';
import * as recommendationService from '../services/recommendation.service';
import { PropertyType } from '../types';
import { logControllerError } from '../lib/logger';

export const getRecommendations = async (req: Request, res: Response) => {
  try {
    const filters = {
      location: req.query.location as string | undefined,
      minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
      maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
      propertyType: req.query.propertyType as PropertyType | undefined,
    };

    const result = await recommendationService.getRecommendations(req.user!.id, filters);
    res.json({ success: true, data: result });
  } catch (error) {
    logControllerError(req, error, 'getRecommendations');
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get recommendations' },
    });
  }
};
