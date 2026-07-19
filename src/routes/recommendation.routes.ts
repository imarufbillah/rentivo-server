import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import * as recommendationController from '../controllers/recommendation.controller.js';

const router = Router();

router.get('/', authenticate, recommendationController.getRecommendations);

export default router;
