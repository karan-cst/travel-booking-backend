import { Router } from 'express';
import { PaymentsController } from './payments.controller';
import { validateRequest } from '../../middlewares/validate.middleware';
import { webhookSchema } from './payments.schema';

const router = Router();

// Endpoint for gateway payment webhook callbacks
router.post(
  '/webhook',
  validateRequest(webhookSchema),
  PaymentsController.processWebhook
);

export default router;
