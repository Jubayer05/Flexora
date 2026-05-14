import { Prisma } from '@prisma/client';
import { CACHE_KEYS, CACHE_TTL } from '../configs/cache.config';
import prisma from '../configs/db';
import type { SettingQuery, UpsertSettingData } from '../validations/zod/setting.schema';
import { cacheService } from './cache.service';

const db = prisma;

export class SettingService {
  // ================================
  // CRUD OPERATIONS
  // ================================

  async upsertSetting(key: string, data: UpsertSettingData) {
    const setting = await db.settings.upsert({
      where: { key },
      update: { value: data.value },
      create: { key, value: data.value },
    });

    // Invalidate cache
    await this.invalidateCache();

    return setting;
  }

  async findByKey(key: string) {
    const cacheKey = `${CACHE_KEYS.SETTINGS_SYSTEM}:key:${key}`;

    const setting = await cacheService.getOrFetch(
      cacheKey,
      async () => {
        const setting = await db.settings.findFirst({
          where: { key },
        });

        // if (!setting) {
        //   throw new Error(`Setting with key "${key}" not found`);
        // }

        return setting;
      },
      CACHE_TTL.SETTINGS
    );

    return setting;
  }

  async findMany(query: SettingQuery) {
    const { page, limit, search } = query;
    const skip = (page - 1) * limit;

    const cacheKey = `${CACHE_KEYS.SETTINGS_SYSTEM}:list:${page}:${limit}:${search || ''}`;

    return await cacheService.getOrFetch(
      cacheKey,
      async () => {
        // Build where clause
        const where: Prisma.SettingsWhereInput = {};

        if (search) {
          where.key = { contains: search, mode: 'insensitive' };
        }

        const [settings, total] = await Promise.all([
          db.settings.findMany({
            where,
            skip,
            take: limit,
            orderBy: { key: 'asc' },
          }),
          db.settings.count({ where }),
        ]);

        return {
          data: settings,
          meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            hasNextPage: page < Math.ceil(total / limit),
            hasPrevPage: page > 1,
          },
        };
      },
      CACHE_TTL.SETTINGS
    );
  }

  async deleteByKey(key: string) {
    // Check if setting exists
    await this.findByKey(key);

    await db.settings.delete({
      where: { key },
    });

    // Invalidate cache
    await this.invalidateCache();

    return { success: true, message: 'Setting deleted successfully' };
  }

  // ================================
  // UTILITY METHODS
  // ================================

  async getMultipleByKeys(keys: string[]) {
    const cacheKey = `${CACHE_KEYS.SETTINGS_SYSTEM}:multi:${keys.sort().join(',')}`;

    return await cacheService.getOrFetch(
      cacheKey,
      async () => {
        const settings = await db.settings.findMany({
          where: { key: { in: keys } },
          orderBy: { key: 'asc' },
        });

        // Convert to key-value pairs for easier consumption
        const settingsMap: Record<string, any> = {};
        settings.forEach((setting) => {
          settingsMap[setting.key] = setting.value;
        });

        // Include missing keys with null values
        keys.forEach((key) => {
          if (!(key in settingsMap)) {
            settingsMap[key] = null;
          }
        });

        return settingsMap;
      },
      CACHE_TTL.SETTINGS
    );
  }

  // ================================
  // CACHE MANAGEMENT
  // ================================

  private async invalidateCache() {
    // Clear all settings-related cache
    await cacheService.clearPattern('uhq:settings:*');
  }
}
