import { CACHE_KEYS, CACHE_PATTERNS, buildCacheKey } from '../configs/cache.config';
import db from '../configs/db';
import { cacheService } from './cache.service';

class CacheInvalidationService {
  /**
   * Invalidate product-related cache
   */
  async invalidateProduct(productId: number): Promise<void> {
    try {
      await Promise.all([
        // Clear all product detail variations using pattern matching
        cacheService.clearPattern(`${CACHE_KEYS.PRODUCT_DETAIL}:${productId}:*`),

        // Also clear by SKU cache if exists
        cacheService.clearPattern(`${CACHE_KEYS.PRODUCT_DETAIL}:sku:*`),

        // Clear featured products
        cacheService.del(CACHE_KEYS.PRODUCTS_FEATURED),

        // Clear product analytics
        cacheService.del(CACHE_KEYS.ANALYTICS_PRODUCTS_TOP),
        cacheService.del(CACHE_KEYS.PRODUCTS_BESTSELLERS),

        // Clear all product listings (simple approach)
        this.clearProductLists(),
      ]);

      console.log(`🗑️  Cache invalidated for product ${productId}`);
    } catch (error) {
      console.error(`Error invalidating product ${productId}:`, error);
    }
  }

  /**
   * Invalidate all product listings
   */
  async invalidateAllProducts(): Promise<void> {
    try {
      const cleared = await cacheService.clearPattern(CACHE_PATTERNS.ALL_PRODUCTS);
      console.log(`🗑️  Cleared ${cleared} product cache entries`);
    } catch (error) {
      console.error('Error invalidating all products:', error);
    }
  }

  /**
   * Invalidate category-related cache
   */
  async invalidateCategory(categoryId?: number): Promise<void> {
    try {
      const tasks = [
        // Clear category tree and active categories
        cacheService.del(CACHE_KEYS.CATEGORIES_TREE),
        cacheService.del(CACHE_KEYS.CATEGORIES_ACTIVE),

        // Clear product listings since they include category data
        this.clearProductLists(),
      ];

      // Clear specific category if provided
      if (categoryId) {
        tasks.push(cacheService.del(buildCacheKey.categoryDetail(categoryId)));
      }

      await Promise.all(tasks);

      console.log(`🗑️  Cache invalidated for category ${categoryId || 'all'}`);
    } catch (error) {
      console.error(`Error invalidating category ${categoryId}:`, error);
    }
  }

  /**
   * Invalidate all categories
   */
  async invalidateAllCategories(): Promise<void> {
    try {
      const [clearedCategoryLists, clearedCategoryDetails] = await Promise.all([
        cacheService.clearPattern(CACHE_PATTERNS.ALL_CATEGORIES),
        cacheService.clearPattern(`${CACHE_KEYS.CATEGORY_DETAIL}:*`),
        this.clearProductLists(),
      ]);
      console.log(
        `🗑️  Cleared ${clearedCategoryLists + clearedCategoryDetails} category cache entries`
      );
    } catch (error) {
      console.error('Error invalidating all categories:', error);
    }
  }

  /**
   * Invalidate user-related cache
   */
  async invalidateUser(userId: number): Promise<void> {
    try {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { email: true }
      })

      const tasks: Promise<unknown>[] = [
        // Clear user profile and data using pattern matching
        cacheService.clearPattern(buildCacheKey.userProfile(userId)),
        cacheService.clearPattern(buildCacheKey.userNotifications(userId)),

        // Clear user orders using pattern matching
        cacheService.clearPattern(`${CACHE_KEYS.USER_ORDERS}:${userId}:*`),

        // Clear user analytics
        cacheService.del(CACHE_KEYS.ANALYTICS_USERS_COUNT)
      ]

      // findByEmail caches full User (incl. passwordHash) at this key — must clear on password/profile updates
      if (user?.email) {
        tasks.push(cacheService.del(buildCacheKey.userProfileByEmail(user.email)))
      }

      await Promise.all(tasks);

      console.log(`🗑️  Cache invalidated for user ${userId}`);
    } catch (error) {
      console.error(`Error invalidating user ${userId}:`, error);
    }
  }

  /**
   * Invalidate settings cache
   */
  async invalidateSettings(
    settingType?: 'payment' | 'site' | 'system' | 'features'
  ): Promise<void> {
    try {
      if (settingType) {
        // Clear specific setting type
        const keyMap = {
          payment: CACHE_KEYS.SETTINGS_PAYMENT_METHODS,
          site: CACHE_KEYS.SETTINGS_SITE_CONFIG,
          system: CACHE_KEYS.SETTINGS_SYSTEM,
          features: CACHE_KEYS.SETTINGS_FEATURES,
        };

        await cacheService.del(keyMap[settingType]);
        console.log(`🗑️  Cache invalidated for ${settingType} settings`);
      } else {
        // Clear all settings
        const cleared = await cacheService.clearPattern(CACHE_PATTERNS.ALL_SETTINGS);
        console.log(`🗑️  Cleared ${cleared} settings cache entries`);
      }
    } catch (error) {
      console.error(`Error invalidating settings ${settingType}:`, error);
    }
  }

  /**
   * Invalidate analytics cache
   */
  async invalidateAnalytics(type?: 'sales' | 'products' | 'users'): Promise<void> {
    try {
      if (type) {
        // Clear specific analytics type
        const pattern = `uhq:analytics:${type}:*`;
        const cleared = await cacheService.clearPattern(pattern);
        console.log(`🗑️  Cleared ${cleared} ${type} analytics cache entries`);
      } else {
        // Clear all analytics
        const cleared = await cacheService.clearPattern(CACHE_PATTERNS.ALL_ANALYTICS);
        console.log(`🗑️  Cleared ${cleared} analytics cache entries`);
      }
    } catch (error) {
      console.error(`Error invalidating analytics ${type}:`, error);
    }
  }

  /**
   * Invalidate cache when order is completed
   */
  async invalidateOnOrderComplete(userId: number, productIds: number[]): Promise<void> {
    try {
      const tasks = [
        // User-related invalidation
        this.invalidateUser(userId),

        // Analytics invalidation
        this.invalidateAnalytics('sales'),
        this.invalidateAnalytics('products'),

        // Product analytics
        cacheService.del(CACHE_KEYS.ANALYTICS_ORDERS_PENDING),
      ];

      // Invalidate specific products if stock changed
      productIds.forEach((productId) => {
        tasks.push(this.invalidateProduct(productId));
      });

      await Promise.all(tasks);

      console.log(`🗑️  Cache invalidated for order completion (user: ${userId})`);
    } catch (error) {
      console.error('Error invalidating cache on order complete:', error);
    }
  }

  /**
   * Clear all cache (nuclear option)
   */
  async clearAll(): Promise<void> {
    try {
      const cleared = await cacheService.clearPattern('uhq:*');
      console.log(`🗑️  Cleared all cache (${cleared} entries)`);
    } catch (error) {
      console.error('Error clearing all cache:', error);
    }
  }

  /**
   * Private helper: Clear product listings
   */
  private async clearProductLists(): Promise<void> {
    try {
      const cleared = await cacheService.clearPattern(`${CACHE_KEYS.PRODUCTS_LIST}:*`);
      console.log(`🗑️  Cleared ${cleared} product listing cache entries`);
    } catch (error) {
      console.error('Error clearing product lists:', error);
    }
  }

  /**
   * Scheduled cache cleanup (remove expired keys, etc.)
   */
  async performMaintenance(): Promise<void> {
    try {
      // Get cache stats
      const stats = cacheService.getStats();
      console.log(
        `📊 Cache maintenance: Hit rate ${stats.hitRate}% (${stats.hits}/${stats.total})`
      );

      // Reset stats for next period
      cacheService.resetStats();

      console.log('🧹 Cache maintenance completed');
    } catch (error) {
      console.error('Error during cache maintenance:', error);
    }
  }
}

// Export singleton instance
export const cacheInvalidation = new CacheInvalidationService();
export { CacheInvalidationService };
