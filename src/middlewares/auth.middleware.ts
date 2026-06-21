import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/environment';
import { UnauthorizedError, ForbiddenError } from '../utils/customErrors';

export interface UserPayload {
  id: string;
  email: string;
  role: 'user' | 'admin';
}

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

export const authenticateJWT = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or malformed Authorization header'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as UserPayload;
    req.user = decoded;
    next();
  } catch (err: any) {
    next(new UnauthorizedError(err.message || 'Token verification failed'));
  }
};

export const requireRole = (role: 'user' | 'admin') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }

    if (req.user.role !== role && req.user.role !== 'admin') {
      // Admins bypass user restriction checks, but users cannot bypass admin checks
      return next(new ForbiddenError('You do not have permission to access this resource'));
    }

    next();
  };
};

export const requireExactRole = (role: 'user' | 'admin') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }

    if (req.user.role !== role) {
      return next(new ForbiddenError('Access denied: insufficient permissions'));
    }

    next();
  };
};
