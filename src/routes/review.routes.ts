import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import * as reviewController from '../controllers/review.controller.js';

const router = Router();

router.post('/', authenticate, reviewController.createReview);
router.get('/property/:propertyId', reviewController.getReviewsByProperty);

export default router;
