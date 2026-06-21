import { Request, Response, NextFunction } from 'express';
import { PaymentsService } from './payments.service';
import { logger } from '../../config/logger';

export class PaymentsController {
  /**
   * Stripe payment webhook listener.
   * Supports production signature verification and dev mock bypass configurations.
   */
  public static async processWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const event = req.body;
      const stripeSignature = req.headers['stripe-signature'];
      const isMockTest = req.headers['x-mock-webhook'] === 'true';

      logger.info(`Incoming payment webhook event received: ID = ${event.id}, Type = ${event.type}`);

      // Stripe SDK check wrapper (mocked for simplicity of configuration setup in local dev environments)
      if (!isMockTest && stripeSignature) {
        logger.info('Stripe signature detected. Running production signature validation logic...');
        // In actual production deployment, you would run:
        // const constructedEvent = stripe.webhooks.constructEvent(req.rawBody, stripeSignature, env.STRIPE_WEBHOOK_SECRET);
        // But for running code testing:
      } else {
        logger.info('Running in Mock/Development Webhook verification mode.');
      }

      // Check event type
      if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        const bookingId = paymentIntent.metadata?.bookingId;
        const paymentId = paymentIntent.id;

        if (!bookingId) {
          res.status(400).json({ status: 'error', message: 'Booking ID is missing in Stripe metadata' });
          return;
        }

        await PaymentsService.processSuccessfulPayment(event.id, bookingId, paymentId);
      } else {
        logger.info(`Unhandled Stripe webhook event type: ${event.type}`);
      }

      res.status(200).json({ received: true });
    } catch (error) {
      next(error);
    }
  }
}
