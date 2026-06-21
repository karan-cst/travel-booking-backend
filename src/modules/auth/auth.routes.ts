import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validateRequest } from '../../middlewares/validate.middleware';
import { registerSchema, loginSchema } from './auth.schema';

const router = Router();

router.post(
  '/register',
  validateRequest(registerSchema),
  AuthController.register
);

router.post(
  '/login',
  validateRequest(loginSchema),
  AuthController.login
);

router.post(
  '/refresh',
  AuthController.refresh
);

export default router;
