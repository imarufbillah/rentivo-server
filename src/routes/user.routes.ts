import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as userController from '../controllers/user.controller';

const router = Router();

router.patch('/upgrade-to-owner', authenticate, userController.upgradeToOwner);

export default router;
