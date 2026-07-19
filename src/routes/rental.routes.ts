import { Router } from 'express';
import * as rentalController from '../controllers/rental.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/checkout', authenticate, rentalController.createCheckout);
router.post('/confirm', authenticate, rentalController.confirm);
router.post('/cancel', authenticate, rentalController.cancelPending);
router.post('/webhook', rentalController.webhook);
router.get('/my', authenticate, rentalController.getMyRentals);
router.get('/property/:id', rentalController.getPropertyRentalStatus);

export default router;
