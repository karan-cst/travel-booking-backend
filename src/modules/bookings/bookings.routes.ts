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

router.get(
  '/',
  authenticateJWT,
  BookingsController.getBookings
);

export default router;
