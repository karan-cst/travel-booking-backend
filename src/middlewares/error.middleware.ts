import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/customErrors';
import { logger } from '../config/logger';
import { env } from '../config/environment';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Something went wrong';
  let errors: any = undefined;

  // AppError / Custom operational errors
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    if ('errors' in err) {
      errors = (err as any).errors;
    }
  } 
  // Mongoose Cast Error (e.g., invalid ObjectId)
  else if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${(err as any).path}: ${(err as any).value}`;
  } 
  // Mongoose Duplicate Key Error
  else if ((err as any).code === 11000) {
    statusCode = 409;
    const key = Object.keys((err as any).keyValue)[0];
    message = `Duplicate field value entered: ${key}. Please use another value.`;
  } 
  // JWT Errors
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token. Please log in again.';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Your session has expired. Please log in again.';
  }

  // Log error details
  if (statusCode >= 500) {
    logger.error(`[500 Server Error] ${req.method} ${req.url} - ${err.stack || err.message}`);
  } else {
    logger.warn(`[${statusCode} Warn] ${req.method} ${req.url} - ${message}`);
  }

  res.status(statusCode).json({
    status: 'error',
    message,
    ...(errors && { errors }),
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
