import express from 'express';
import cors from 'cors';
import { morganMiddleware } from './config/logger';
import { errorHandler } from './middlewares/error.middleware';
import { NotFoundError } from './utils/customErrors';

// Import Route modules
import authRoutes from './modules/auth/auth.routes';
import packageRoutes from './modules/packages/packages.routes';
import bookingRoutes from './modules/bookings/bookings.routes';
import paymentRoutes from './modules/payments/payments.routes';
import itineraryRoutes from './modules/itinerary/itinerary.routes';

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morganMiddleware);

// API Endpoints
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/packages', packageRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/itinerary', itineraryRoutes);

// Fallback Route Handler (404)
app.use((req, res, next) => {
  next(new NotFoundError(`Resource not found at request path: ${req.originalUrl}`));
});

// Global Error Handler
app.use(errorHandler);

export default app;
