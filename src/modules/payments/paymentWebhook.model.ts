import { Schema, model, Document } from 'mongoose';

export type WebhookStatus = 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface IPaymentWebhook extends Document {
  stripeEventId: string;
  status: WebhookStatus;
  processedAt: Date;
  expiresAt: Date;
}

const PaymentWebhookSchema = new Schema<IPaymentWebhook>(
  {
    stripeEventId: {
      type: String,
      required: [true, 'Stripe event ID is required'],
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['PROCESSING', 'COMPLETED', 'FAILED'],
      required: true,
      index: true,
    },
    processedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index to automatically purge records after the expiresAt date (e.g. 7 days post-event)
PaymentWebhookSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PaymentWebhook = model<IPaymentWebhook>('PaymentWebhook', PaymentWebhookSchema);
export default PaymentWebhook;
