import { Request, Response } from 'express';
import * as reviewService from '../services/review.service.js';
import { createReviewSchema } from '../lib/validation/review.schemas.js';
import { logValidationError, logControllerError } from '../lib/logger.js';

export const createReview = async (req: Request, res: Response) => {
  try {
    const parsed = createReviewSchema.safeParse(req.body);
    if (!parsed.success) {
      logValidationError(req, parsed.error, 'createReview');
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_FAILED', message: parsed.error.issues[0].message },
      });
    }

    const { propertyId, rating, comment } = parsed.data;

    const canReview = await reviewService.checkUserCanReview(req.user!.id, propertyId);
    if (!canReview) {
      return res.status(403).json({
        success: false,
        error: { code: 'REVIEW_NOT_ALLOWED', message: 'You must be an active renter to review this property' },
      });
    }

    const review = await reviewService.createReview(req.user!.id, propertyId, rating, comment);
    res.status(201).json({ success: true, data: { review } });
  } catch (error) {
    logControllerError(req, error, 'createReview');
    const message = error instanceof Error ? error.message : 'Failed to create review';
    const status = message.includes('already reviewed') ? 409 : 500;
    res.status(status).json({
      success: false,
      error: { code: status === 409 ? 'DUPLICATE_REVIEW' : 'INTERNAL_ERROR', message },
    });
  }
};

export const getReviewsByProperty = async (req: Request, res: Response) => {
  try {
    const propertyId = req.params.propertyId as string;
    const [reviews, averageRating, totalReviews] = await Promise.all([
      reviewService.getReviewsByProperty(propertyId),
      reviewService.getAverageRating(propertyId),
      reviewService.getReviewsByProperty(propertyId).then((r) => r.length),
    ]);

    res.json({ success: true, data: { reviews, averageRating, totalReviews } });
  } catch (error) {
    logControllerError(req, error, 'getReviewsByProperty');
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch reviews' },
    });
  }
};

export const getRecentReviews = async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 6, 20);
    const reviews = await reviewService.getRecentReviews(limit);
    res.json({ success: true, data: { reviews } });
  } catch (error) {
    logControllerError(req, error, 'getRecentReviews');
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch recent reviews' },
    });
  }
};
