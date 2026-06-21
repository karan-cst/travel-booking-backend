import app from './app';
import { connectDB } from './config/db';
import { connectRedis } from './config/redis';
import { env } from './config/environment';
import { logger } from './config/logger';

const startServer = async () => {
  try {
    // Connect to external storage networks
    await connectDB();
    await connectRedis();

    const server = app.listen(env.PORT, () => {
      logger.info(`🚀 Server listening at http://localhost:${env.PORT} in [${env.NODE_ENV}] mode`);
    });

    // Graceful Shutdown hooks
    const gracefulShutdown = async (signal: string) => {
      logger.info(`⚠️ Received ${signal}. Starting graceful shutdown...`);
      server.close(() => {
        logger.info('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
  } catch (error) {
    logger.error(`❌ Server crash during initialization: ${error}`);
    process.exit(1);
  }
};

startServer();
