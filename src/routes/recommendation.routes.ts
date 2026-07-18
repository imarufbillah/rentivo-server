import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as recommendationController from '../controllers/recommendation.controller';

const router = Router();

router.get('/', authenticate, recommendationController.getRecommendations);

export default router;
