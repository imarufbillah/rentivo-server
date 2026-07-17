import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as reviewController from '../controllers/review.controller';

const router = Router();

router.post('/', authenticate, reviewController.createReview);
router.get('/property/:propertyId', reviewController.getReviewsByProperty);

export default router;
