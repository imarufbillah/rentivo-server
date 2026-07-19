import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import * as interactionController from '../controllers/interaction.controller.js';

const router = Router();

router.post('/', authenticate, interactionController.trackInteraction);
router.get('/', authenticate, interactionController.getInteractionHistory);
router.get('/saved-properties', authenticate, interactionController.getSavedProperties);
router.get('/property/:propertyId', authenticate, interactionController.getUserInteractionState);
router.delete('/', authenticate, interactionController.deleteInteraction);

export default router;
