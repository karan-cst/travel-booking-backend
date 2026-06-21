import { Router } from 'express';
import { BookingsController } from './bookings.controller';
import { authenticateJWT } from '../../middlewares/auth.middleware';
import { validateRequest } from '../../middlewares/validate.middleware';
import { createBookingSchema } from './bookings.schema';

const router = Router();

router.post(
  '/',
  authenticateJWT,
  validateRequest(createBookingSchema),
  BookingsController.createBooking
);

export default router;
