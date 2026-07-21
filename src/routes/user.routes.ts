import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import * as userController from '../controllers/user.controller.js';

const router = Router();

router.get('/me', authenticate, userController.getMe);
router.patch('/upgrade-to-owner', authenticate, userController.upgradeToOwner);

export default router;
