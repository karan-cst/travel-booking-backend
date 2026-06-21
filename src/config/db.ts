import mongoose from 'mongoose';
import { env } from './environment';
import { logger } from './logger';

export const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(env.MONGO_URI);
    logger.info(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error(`❌ MongoDB connection error: ${error}`);
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () => {
  logger.warn('⚠️ MongoDB disconnected.');
});

mongoose.connection.on('error', (err) => {
  logger.error(`❌ MongoDB error event: ${err}`);
});
