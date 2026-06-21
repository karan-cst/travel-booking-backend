import { Booking, IBooking } from './booking.model';
import { Package } from '../packages/package.model';
import { RedisLuaManager } from '../../utils/redisLua';
import { redisClient } from '../../config/redis';
import { NotFoundError, ConflictError, AppError } from '../../utils/customErrors';
import { logger } from '../../config/logger';

export class BookingsService {
  /**
   * Creates a booking with a hold on inventory.
   * Uses Redis Lua scripts for fast-path flash sale allotment and direct DB atomic updates for normal packages.
   */
  public static async createBookingHold(packageId: string, userId: string): Promise<IBooking> {
    const pkg = await Package.findById(packageId);
    if (!pkg) {
      throw new NotFoundError('Travel package not found');
    }

    const now = new Date();
    const isFlashSale =
      pkg.flashSale.isActive &&
      (!pkg.flashSale.startTime || pkg.flashSale.startTime <= now) &&
      (!pkg.flashSale.endTime || pkg.flashSale.endTime >= now);

    const holdDurationMinutes = 10;
    const holdExpiresAt = new Date(now.getTime() + holdDurationMinutes * 60 * 1000);

    if (isFlashSale) {
      logger.info(`🔥 Flash sale route triggered for Package: ${packageId}, User: ${userId}`);

      let luaResult = await RedisLuaManager.reserveInventory(packageId, userId, holdDurationMinutes * 60);

      // Cache miss: Allotments are not initialized in Redis yet
      if (luaResult === -1) {
        logger.info(`💾 Initializing Redis inventory allotment for Package: ${packageId} with count: ${pkg.availableInventory}`);
        // Set the Redis inventory key
        await redisClient.set(`inventory:${packageId}`, pkg.availableInventory.toString());
        // Retry the reservation Lua script
        luaResult = await RedisLuaManager.reserveInventory(packageId, userId, holdDurationMinutes * 60);
      }

      if (luaResult === 0) {
        throw new ConflictError('This flash package is sold out!');
      }

      if (luaResult === 2) {
        throw new ConflictError('You already have an active reservation hold on this package. Please pay first.');
      }

      if (luaResult !== 1) {
        throw new AppError('Inventory allocation failed', 500);
      }

      // Redis allotment reserved successfully, now persist the booking hold in MongoDB
      try {
        const booking = new Booking({
          userId,
          packageId,
          status: 'PENDING_HOLD',
          holdExpiresAt,
        });

        await booking.save();
        logger.info(`✅ Booking hold record created in MongoDB: ${booking._id}`);
        return booking;
      } catch (err: any) {
        // Rollback Redis inventory allotment if DB record insertion fails
        logger.error(`❌ DB insert failed. Rolling back Redis allotment. Error: ${err}`);
        await redisClient.incr(`inventory:${packageId}`);
        await redisClient.del(`hold:${packageId}:${userId}`);
        throw err;
      }
    } else {
      // Normal package: direct DB atomic decrement using pessimistic checks
      logger.info(`📦 Standard checkout route triggered for Package: ${packageId}, User: ${userId}`);

      // Check if user already has a pending hold for this package
      const existingBooking = await Booking.findOne({
        userId,
        packageId,
        status: 'PENDING_HOLD',
        holdExpiresAt: { $gt: now },
      });

      if (existingBooking) {
        throw new ConflictError('You already have an active hold on this package. Please complete your payment.');
      }

      // Atomic MongoDB update
      const updatedPackage = await Package.findOneAndUpdate(
        {
          _id: packageId,
          availableInventory: { $gt: 0 },
        },
        {
          $inc: { availableInventory: -1 },
        },
        { new: true }
      );

      if (!updatedPackage) {
        throw new ConflictError('This travel package is sold out!');
      }

      try {
        const booking = new Booking({
          userId,
          packageId,
          status: 'PENDING_HOLD',
          holdExpiresAt,
        });

        await booking.save();
        logger.info(`✅ Booking hold record created in MongoDB: ${booking._id}`);
        return booking;
      } catch (err: any) {
        // Rollback MongoDB availableInventory if booking record creation fails
        logger.error(`❌ DB booking save failed. Reverting package availableInventory count. Error: ${err}`);
        await Package.findByIdAndUpdate(packageId, { $inc: { availableInventory: 1 } });
        throw err;
      }
    }
  }

  /**
   * Retrieves bookings from MongoDB.
   * If role is admin, returns all bookings in the system.
   * If role is user, returns only the bookings for that user.
   */
  public static async getBookings(userId: string, role: string): Promise<IBooking[]> {
    if (role === 'admin') {
      logger.info('🔑 Admin fetching all bookings in system');
      return await Booking.find().sort({ createdAt: -1 });
    } else {
      logger.info(`🔑 User ${userId} fetching their bookings`);
      return await Booking.find({ userId }).sort({ createdAt: -1 });
    }
  }
}
