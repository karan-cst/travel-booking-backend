import { Router } from 'express';
import { ItineraryController } from './itinerary.controller';
import { authenticateJWT } from '../../middlewares/auth.middleware';
import { validateRequest } from '../../middlewares/validate.middleware';
import { z } from 'zod';

const router = Router();

const getItinerarySchema = {
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid package ID format'),
  }),
};

router.get(
  '/:id',
  authenticateJWT,
  validateRequest(getItinerarySchema),
  ItineraryController.getItinerary
);

export default router;
