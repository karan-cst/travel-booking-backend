import { redisClient } from '../../config/redis';
import { Package } from '../packages/package.model';
import { NotFoundError } from '../../utils/customErrors';
import { logger } from '../../config/logger';

export interface ItineraryDay {
  day: number;
  activity: string;
  meals: string[];
  accommodation: string;
}

export interface ItineraryResponse {
  packageId: string;
  source: 'CACHE_HIT' | 'CACHE_MISS';
  days: ItineraryDay[];
}

export class ItineraryService {
  /**
   * Fetches the travel itinerary for a package.
   * Utilizes a Cache-Aside caching strategy using Redis.
   */
  public static async getPackageItinerary(packageId: string): Promise<ItineraryResponse> {
    const cacheKey = `itinerary:${packageId}`;

    // 1. Attempt to fetch from Redis cache
    try {
      const cachedItinerary = await redisClient.get(cacheKey);
      if (cachedItinerary) {
        logger.info(`⚡ Cache Hit: AI Itinerary for Package ${packageId} returned from Redis.`);
        return {
          packageId,
          source: 'CACHE_HIT',
          days: JSON.parse(cachedItinerary),
        };
      }
    } catch (redisError) {
      logger.error(`⚠️ Redis read failed (continuing to DB/Generator): ${redisError}`);
    }

    // 2. Cache Miss - Verify package existence in database
    const pkg = await Package.findById(packageId);
    if (!pkg) {
      throw new NotFoundError('Travel package not found');
    }

    logger.info(`🤖 Cache Miss: Simulating AI Generation pipeline for Package: ${packageId}...`);

    // 3. Simulate expensive AI Generation pipeline (500ms artificial delay)
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Construct mock AI travel planner details based on package title
    const simulatedItinerary: ItineraryDay[] = [
      {
        day: 1,
        activity: `Arrive at destination for ${pkg.title}. Private check-in at luxury accommodation.`,
        meals: ['Dinner'],
        accommodation: 'Grand Imperial Resort & Spa',
      },
      {
        day: 2,
        activity: `Exclusive guided historical city highlights tour, followed by sunset yacht tour.`,
        meals: ['Breakfast', 'Lunch'],
        accommodation: 'Grand Imperial Resort & Spa',
      },
      {
        day: 3,
        activity: `Adventure safari or local culinary masterclass exploration session.`,
        meals: ['Breakfast', 'Dinner'],
        accommodation: 'Grand Imperial Resort & Spa',
      },
      {
        day: 4,
        activity: `Free day for relaxation, shopping, and beachside wellness treatments.`,
        meals: ['Breakfast'],
        accommodation: 'Grand Imperial Resort & Spa',
      },
      {
        day: 5,
        activity: `Checkout of resort. Airport drop-off service included. Return flight departure.`,
        meals: ['Breakfast', 'Lunch'],
        accommodation: 'None',
      },
    ];

    // 4. Save back to Redis cache with 24-hour TTL (86400 seconds)
    try {
      await redisClient.setEx(cacheKey, 86400, JSON.stringify(simulatedItinerary));
      logger.info(`💾 AI Itinerary for Package ${packageId} successfully saved to Redis cache.`);
    } catch (redisError) {
      logger.error(`⚠️ Failed to cache itinerary in Redis: ${redisError}`);
    }

    return {
      packageId,
      source: 'CACHE_MISS',
      days: simulatedItinerary,
    };
  }
}
