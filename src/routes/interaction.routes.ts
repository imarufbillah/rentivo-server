import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as interactionController from '../controllers/interaction.controller';

const router = Router();

router.post('/', authenticate, interactionController.trackInteraction);
router.get('/saved-properties', authenticate, interactionController.getSavedProperties);

export default router;
