import { Router } from 'express';
import { authenticate, requireOwner } from '../middleware/auth.middleware';
import * as propertyController from '../controllers/property.controller';

const router = Router();

router.post('/', authenticate, requireOwner, propertyController.createProperty);
router.get('/my-properties', authenticate, requireOwner, propertyController.getMyProperties);
router.get('/', propertyController.getProperties);
router.get('/:id', propertyController.getPropertyById);
router.patch('/:id', authenticate, requireOwner, propertyController.updateProperty);
router.delete('/:id', authenticate, requireOwner, propertyController.deleteProperty);

export default router;
