import { Request, Response, NextFunction } from 'express';
import { BookingsService } from './bookings.service';

export class BookingsController {
  public static async createBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { packageId } = req.body;
      const userId = req.user!.id; // Authenticated user ID injected by JWT middleware

      const booking = await BookingsService.createBookingHold(packageId, userId);

      res.status(201).json({
        status: 'success',
        message: 'Allotment hold successfully reserved. Complete payment in 10 minutes.',
        data: {
          bookingId: booking._id,
          status: booking.status,
          holdExpiresAt: booking.holdExpiresAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getBookings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const role = req.user!.role;

      const bookings = await BookingsService.getBookings(userId, role);

      res.status(200).json({
        status: 'success',
        data: bookings,
      });
    } catch (error) {
      next(error);
    }
  }
}
