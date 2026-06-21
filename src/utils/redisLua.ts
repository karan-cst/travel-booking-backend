import { redisClient } from '../config/redis';
import { logger } from '../config/logger';

// Lua script to atomically check and decrement flash package inventory in Redis
export const RESERVE_INVENTORY_LUA = `
  local inventoryKey = KEYS[1]
  local holdKey = KEYS[2]
  local holdValue = ARGV[1]
  local ttlSeconds = ARGV[2]

  -- Check if user already holds a reservation
  local existingHold = redis.call('GET', holdKey)
  if existingHold then
    return 2 -- Already has an active hold
  end

  -- Check current inventory level
  local currentInventory = redis.call('GET', inventoryKey)
  if not currentInventory then
    return -1 -- Inventory key not initialized
  end

  local inventoryNum = tonumber(currentInventory)
  if inventoryNum <= 0 then
    return 0 -- Sold out / No inventory
  end

  -- Atomically decrement and set the hold lock
  redis.call('DECR', inventoryKey)
  redis.call('SET', holdKey, holdValue, 'EX', ttlSeconds)

  return 1 -- Success
`;

export class RedisLuaManager {
  /**
   * Executes the reservation Lua script.
   * @returns 1 for success, 0 for sold out, 2 for user already holding a ticket, -1 if package not in Redis cache.
   */
  public static async reserveInventory(
    packageId: string,
    userId: string,
    ttlSeconds: number = 600
  ): Promise<number> {
    try {
      const inventoryKey = `inventory:${packageId}`;
      const holdKey = `hold:${packageId}:${userId}`;
      const holdValue = 'PENDING';

      // Executing EVAL via Node Redis client
      const result = await redisClient.eval(RESERVE_INVENTORY_LUA, {
        keys: [inventoryKey, holdKey],
        arguments: [holdValue, ttlSeconds.toString()],
      });

      return Number(result);
    } catch (error) {
      logger.error(`❌ Lua Script Execution failed: ${error}`);
      throw error;
    }
  }
}
