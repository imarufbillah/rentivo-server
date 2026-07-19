import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import * as chatController from '../controllers/chat.controller.js';

const router = Router();

router.post('/', authenticate, chatController.sendMessage);
router.post('/suggestions', authenticate, chatController.getSuggestions);

export default router;
