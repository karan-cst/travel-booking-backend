import { Router } from 'express';
import { PackagesController } from './packages.controller';
import { authenticateJWT, requireRole } from '../../middlewares/auth.middleware';
import { validateRequest } from '../../middlewares/validate.middleware';
import { z } from 'zod';

const router = Router();

const createPackageSchema = {
  body: z.object({
    title: z.string().min(3).max(100),
    description: z.string().min(10),
    price: z.number().nonnegative(),
    totalInventory: z.number().int().nonnegative(),
    flashSale: z
      .object({
        isActive: z.boolean().default(false),
        startTime: z.string().datetime().optional(),
        endTime: z.string().datetime().optional(),
      })
      .optional(),
  }),
};

const configureFlashSchema = {
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid package ID format'),
  }),
  body: z.object({
    isActive: z.boolean(),
    startTime: z.string().datetime().optional(),
    endTime: z.string().datetime().optional(),
    allotmentCount: z.number().int().nonnegative().optional(),
  }),
};

router.get('/', PackagesController.listPackages);

router.post(
  '/',
  authenticateJWT,
  requireRole('admin'),
  validateRequest(createPackageSchema),
  PackagesController.createPackage
);

router.patch(
  '/:id/flash',
  authenticateJWT,
  requireRole('admin'),
  validateRequest(configureFlashSchema),
  PackagesController.configureFlashSale
);

export default router;
