import Redis from 'ioredis';
import { parseDecimalStrings, transformDecimals } from '../utils/decimal.utils';

interface CacheMetrics {
  hits: number;
  misses: number;
}

interface MemoryCacheEntry {
  value: string;
  expiresAt: number;
}

class CacheService {
  private redis: Redis;
  private metrics: CacheMetrics = { hits: 0, misses: 0 };
  private isConnected: boolean = false;
  private connectionAttempted: boolean = false;
  private memoryCache = new Map<string, MemoryCacheEntry>();

  constructor() {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      lazyConnect: true,
      // Optimize for local development
      ...(isDevelopment && {
        connectTimeout: 2000, // Faster connection timeout
        retryStrategy: (times) => {
          // Quick retry for local dev, fail fast if Redis is not available
          if (times > 3) {
            console.warn('⚠️  Redis connection failed after 3 attempts, continuing without cache');
            this.isConnected = false;
            return null; // Stop retrying
          }
          return Math.min(times * 100, 1000); // Max 1 second between retries
        },
        maxRetriesPerRequest: 1, // Fail fast in dev
        enableOfflineQueue: false, // Don't queue commands if disconnected
      }),
    });

    // Connection event handlers
    this.redis.on('connect', () => {
      this.isConnected = true;
      console.log('📡 Redis connected successfully');
    });

    this.redis.on('ready', () => {
      this.isConnected = true;
    });

    this.redis.on('error', (err: Error) => {
      this.isConnected = false;
      // Only log errors if we've attempted connection (to avoid spam on startup)
      if (this.connectionAttempted) {
        console.error('❌ Redis connection error:', err.message);
      }
    });

    this.redis.on('reconnecting', () => {
      this.isConnected = false;
      console.log('🔄 Redis reconnecting...');
    });

    this.redis.on('close', () => {
      this.isConnected = false;
    });

    // Attempt connection in background (non-blocking)
    this.attemptConnection();
  }

  private setMemoryValue(key: string, value: any, ttlSeconds: number): void {
    const transformedValue = transformDecimals(value);
    this.memoryCache.set(key, {
      value: JSON.stringify(transformedValue),
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  private getMemoryValue<T>(key: string): T | null {
    const entry = this.memoryCache.get(key);
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }

    const parsed = JSON.parse(entry.value);
    return parseDecimalStrings(parsed);
  }

  private deleteMemoryValue(key: string): void {
    this.memoryCache.delete(key);
  }

  private getMemoryKeys(pattern: string): string[] {
    const regex = new RegExp(
      '^' +
        pattern
          .replace(/[.+^${}()|[\]\\]/g, '\\$&')
          .replace(/\*/g, '.*') +
        '$'
    );

    return Array.from(this.memoryCache.keys()).filter((key) => {
      const entry = this.memoryCache.get(key);
      if (!entry) return false;
      if (Date.now() > entry.expiresAt) {
        this.memoryCache.delete(key);
        return false;
      }
      return regex.test(key);
    });
  }

  private async attemptConnection(): Promise<void> {
    this.connectionAttempted = true;
    try {
      await this.redis.connect();
    } catch (error) {
      // Connection will be retried by Redis client
      console.warn('⚠️  Redis initial connection failed, will retry. App continues without cache.');
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    // Fast path: if not connected, skip cache
    if (!this.isConnected) {
      const fallback = this.getMemoryValue<T>(key);
      if (fallback !== null) {
        this.metrics.hits++;
        return fallback;
      }
      this.metrics.misses++;
      return null;
    }

    try {
      const data = await this.redis.get(key);
      if (data) {
        this.metrics.hits++;
        const parsed = JSON.parse(data);
        return parseDecimalStrings(parsed);
      }
      const fallback = this.getMemoryValue<T>(key);
      if (fallback !== null) {
        this.metrics.hits++;
        return fallback;
      }
      this.metrics.misses++;
      return null;
    } catch (error) {
      // If error, mark as disconnected and continue
      this.isConnected = false;
      const fallback = this.getMemoryValue<T>(key);
      if (fallback !== null) {
        this.metrics.hits++;
        return fallback;
      }
      this.metrics.misses++;
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    // Fast path: if not connected, skip cache
    if (!this.isConnected) {
      this.setMemoryValue(key, value, ttlSeconds);
      return;
    }

    try {
      // Transform Decimal objects to numbers before JSON serialization
      const transformedValue = transformDecimals(value);
      await this.redis.setex(key, ttlSeconds, JSON.stringify(transformedValue));
      this.setMemoryValue(key, value, ttlSeconds);
    } catch (error) {
      // If error, mark as disconnected
      this.isConnected = false;
      this.setMemoryValue(key, value, ttlSeconds);
      // Don't log every set error to avoid spam
    }
  }

  /**
   * Delete value from cache
   */
  async del(key: string): Promise<void> {
    this.deleteMemoryValue(key);
    if (!this.isConnected) {
      return;
    }
    try {
      await this.redis.del(key);
    } catch (error) {
      this.isConnected = false;
      console.error(`Cache DEL error for ${key}:`, error);
    }
  }

  /**
   * Delete multiple keys
   */
  async delMultiple(keys: string[]): Promise<void> {
    if (keys.length === 0) return;

    keys.forEach((key) => this.deleteMemoryValue(key));
    if (!this.isConnected) {
      return;
    }

    try {
      await this.redis.del(...keys);
    } catch (error) {
      this.isConnected = false;
      console.error(`Cache DEL MULTIPLE error for keys ${keys.join(', ')}:`, error);
    }
  }

  /**
   * Get or fetch pattern - cache with fallback
   */
  async getOrFetch<T>(key: string, fetcher: () => Promise<T>, ttlSeconds = 1800): Promise<T> {
    try {
      const cached = await this.get<T>(key);
      if (cached !== null) {
        return cached;
      }
    } catch (error) {
      // If cache fails, continue to fetch fresh data
      console.warn(`Cache GET failed for ${key}, fetching fresh data:`, error);
    }

    const fresh = await fetcher();
    
    // Try to cache, but don't fail if it doesn't work
    try {
      await this.set(key, fresh, ttlSeconds);
    } catch (error) {
      // Log but don't throw - cache is optional
      console.warn(`Cache SET failed for ${key}, continuing without cache:`, error);
    }
    
    return fresh;
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    if (this.getMemoryValue(key) !== null) {
      return true;
    }
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Cache EXISTS error for ${key}:`, error);
      return false;
    }
  }

  /**
   * Get keys matching pattern
   */
  async keys(pattern: string): Promise<string[]> {
    const memoryKeys = this.getMemoryKeys(pattern);
    try {
      const redisKeys = await this.redis.keys(pattern);
      return Array.from(new Set([...memoryKeys, ...redisKeys]));
    } catch (error) {
      console.error(`Cache KEYS error for pattern ${pattern}:`, error);
      return memoryKeys;
    }
  }

  /**
   * Clear keys matching pattern
   */
  async clearPattern(pattern: string): Promise<number> {
    try {
      const keys = await this.keys(pattern);
      if (keys.length > 0) {
        await this.delMultiple(keys);
        return keys.length;
      }
      return 0;
    } catch (error) {
      console.error(`Cache CLEAR PATTERN error for pattern ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Ping Redis connection
   */
  async ping(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Redis PING error:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { hitRate: number; hits: number; misses: number; total: number } {
    const total = this.metrics.hits + this.metrics.misses;
    const hitRate = total > 0 ? Math.round((this.metrics.hits / total) * 100) : 0;

    return {
      hitRate,
      hits: this.metrics.hits,
      misses: this.metrics.misses,
      total,
    };
  }

  /**
   * Reset metrics
   */
  resetStats(): void {
    this.metrics = { hits: 0, misses: 0 };
  }

  /**
   * Get Redis client for advanced operations
   */
  getClient(): Redis {
    return this.redis;
  }

  /**
   * Close Redis connection
   */
  async disconnect(): Promise<void> {
    try {
      await this.redis.quit();
      console.log('📡 Redis disconnected successfully');
    } catch (error) {
      console.error('Redis disconnect error:', error);
    }
  }
}

// Export singleton instance
export const cacheService = new CacheService();
export { CacheService };
