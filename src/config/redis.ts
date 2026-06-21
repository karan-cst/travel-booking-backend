import { createClient } from 'redis';
import { env } from './environment';
import { logger } from './logger';

export const redisClient = createClient({
  url: env.REDIS_URL,
});

redisClient.on('connect', () => {
  logger.info('🔄 Redis connecting...');
});

redisClient.on('ready', () => {
  logger.info('✅ Redis Client Ready');
});

redisClient.on('error', (err) => {
  logger.error(`❌ Redis Client Error: ${err}`);
});

redisClient.on('end', () => {
  logger.warn('⚠️ Redis connection closed.');
});

export const connectRedis = async (): Promise<void> => {
  try {
    await redisClient.connect();
  } catch (error) {
    logger.error(`❌ Failed to connect to Redis: ${error}`);
    process.exit(1);
  }
};
