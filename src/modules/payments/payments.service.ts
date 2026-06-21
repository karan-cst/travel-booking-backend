import mongoose from 'mongoose';
import { Booking } from '../bookings/booking.model';
import { Package } from '../packages/package.model';
import { PaymentWebhook } from './paymentWebhook.model';
import { redisClient } from '../../config/redis';
import { ConflictError, NotFoundError, AppError } from '../../utils/customErrors';
import { logger } from '../../config/logger';

export class PaymentsService {
  /**
   * Processes a successful payment webhook event idempotently.
   * Acquires a short-lived Redis lock, checks duplicate DB logs, and commits the state inside a Mongo Transaction Session.
   */
  public static async processSuccessfulPayment(
    eventId: string,
    bookingId: string,
    paymentId: string
  ): Promise<void> {
    const lockKey = `webhook:lock:${eventId}`;
    
    // 1. Acquire Redis distributed lock (expires in 15 seconds) to prevent simultaneous duplicate deliveries
    const acquiredLock = await redisClient.set(lockKey, 'processing', {
      NX: true,
      PX: 15000,
    });

    if (!acquiredLock) {
      throw new ConflictError('This payment event is currently being processed by another task handler.');
    }

    try {
      // 2. Check DB log to verify if this event was already processed (idempotency)
      const existingWebhook = await PaymentWebhook.findOne({ stripeEventId: eventId });
      if (existingWebhook) {
        if (existingWebhook.status === 'COMPLETED') {
          logger.info(`✨ Payment Webhook ${eventId} already processed successfully. Bypassing.`);
          return;
        }
        if (existingWebhook.status === 'PROCESSING') {
          throw new ConflictError('This payment event is active under current processing.');
        }
      }

      // Create a temporary "PROCESSING" tracking record in DB
      if (!existingWebhook) {
        await PaymentWebhook.create({
          stripeEventId: eventId,
          status: 'PROCESSING',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // TTL of 7 days
        });
      }

      // 3. Start Database Transaction Session
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        const booking = await Booking.findById(bookingId).session(session);
        if (!booking) {
          throw new NotFoundError(`Booking record ${bookingId} not found`);
        }

        if (booking.status === 'PAID') {
          logger.info(`Booking ${bookingId} is already marked as PAID.`);
          await session.commitTransaction();
          session.endSession();
          return;
        }

        if (booking.status === 'EXPIRED') {
          throw new ConflictError('Cannot pay for an expired hold reservation.');
        }

        const pkg = await Package.findById(booking.packageId).session(session);
        if (!pkg) {
          throw new NotFoundError(`Package associated with booking not found`);
        }

        // Determine if it was a flash sale package
        const now = new Date();
        const isFlashSale =
          pkg.flashSale.isActive &&
          (!pkg.flashSale.startTime || pkg.flashSale.startTime <= now) &&
          (!pkg.flashSale.endTime || pkg.flashSale.endTime >= now);

        if (isFlashSale) {
          // Decrement the DB available inventory count (for Flash Sales, we only decremented Redis allotment on hold)
          if (pkg.availableInventory <= 0) {
            throw new ConflictError('Database inventory check failed: Package sold out');
          }
          pkg.availableInventory -= 1;
          await pkg.save({ session });
          logger.info(`📉 Decremented DB package availableInventory for Flash Sale Package: ${pkg._id}`);
        } else {
          // Standard package was already decremented in DB on hold creation
          logger.info(`📦 Standard package DB availableInventory already decremented on hold: ${pkg._id}`);
        }

        // Update booking state
        booking.status = 'PAID';
        booking.paymentId = paymentId;
        
        // CRITICAL: Unset/set null holdExpiresAt so the Mongoose TTL index skips deleting this completed booking document
        booking.holdExpiresAt = null;
        
        await booking.save({ session });

        // Update Webhook log to COMPLETED
        await PaymentWebhook.findOneAndUpdate(
          { stripeEventId: eventId },
          { status: 'COMPLETED', processedAt: new Date() },
          { session }
        );

        // Commit all changes atomically
        await session.commitTransaction();
        session.endSession();
        
        logger.info(`💰 Booking ${bookingId} successfully confirmed and paid.`);

        // 4. Post-Transaction cleanup of Redis hold locks
        const holdKey = `hold:${booking.packageId}:${booking.userId}`;
        await redisClient.del(holdKey);

      } catch (transactionError) {
        // Rollback transaction changes on exception
        await session.abortTransaction();
        session.endSession();
        
        // Update Webhook status to FAILED in a separate query to allow retry
        await PaymentWebhook.findOneAndUpdate({ stripeEventId: eventId }, { status: 'FAILED' });
        throw transactionError;
      }

    } finally {
      // 5. Release short-lived Redis concurrency lock
      await redisClient.del(lockKey);
    }
  }
}
