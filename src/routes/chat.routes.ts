import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as chatController from '../controllers/chat.controller';

const router = Router();

router.post('/', authenticate, chatController.sendMessage);
router.post('/suggestions', authenticate, chatController.getSuggestions);

export default router;
