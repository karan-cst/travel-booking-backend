import { Schema, model, Document } from 'mongoose';

export type BookingStatus = 'PENDING_HOLD' | 'PAID' | 'FAILED' | 'EXPIRED';

export interface IBooking extends Document {
  userId: Schema.Types.ObjectId;
  packageId: Schema.Types.ObjectId;
  status: BookingStatus;
  holdExpiresAt?: Date | null;
  paymentId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    packageId: {
      type: Schema.Types.ObjectId,
      ref: 'Package',
      required: [true, 'Package ID is required'],
      index: true,
    },
    status: {
      type: String,
      enum: ['PENDING_HOLD', 'PAID', 'FAILED', 'EXPIRED'],
      default: 'PENDING_HOLD',
      index: true,
    },
    holdExpiresAt: {
      type: Date,
      default: null,
    },
    paymentId: {
      type: String,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// TTL Index: automatically expire holds when holdExpiresAt date is reached.
// If holdExpiresAt is set to null, mongoose will not delete it.
BookingSchema.index({ holdExpiresAt: 1 }, { expireAfterSeconds: 0 });

export const Booking = model<IBooking>('Booking', BookingSchema);
export default Booking;
