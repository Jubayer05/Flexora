/**
 * Telegram Duplicate Detector Service
 * Detects duplicate groups/channels and accounts to prevent conflicts
 */

import db from '../../configs/db';
import { TELEGRAM_TRANSFER_PRODUCT_TYPES } from '../../utils/product-type';

// ================================
// TYPES
// ================================

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingRecords?: DuplicateRecord[];
  message?: string;
}

export interface DuplicateRecord {
  type: 'product' | 'transfer' | 'account';
  id: number;
  name?: string;
  url?: string;
  status?: string;
  createdAt: Date;
}

export interface SearchResult {
  groups: GroupChannelResult[];
  accounts: AccountResult[];
  total: number;
}

export interface GroupChannelResult {
  id: number;
  productId?: number;
  productName?: string;
  url: string;
  type: 'group' | 'channel';
  status: string;
  isActive: boolean;
}

export interface AccountResult {
  id: number;
  phoneNumber: string;
  username?: string;
  productId?: number;
  productName?: string;
  status: string;
}

// ================================
// DUPLICATE DETECTOR SERVICE
// ================================

export class TelegramDuplicateDetectorService {
  /**
   * Parse and normalize Telegram URL
   */
  private normalizeUrl(url: string): string {
    let normalized = url.trim().toLowerCase();

    // Remove protocol
    normalized = normalized.replace(/^https?:\/\//, '');

    // Normalize domain
    normalized = normalized.replace(/^(www\.)?(t\.me|telegram\.me)\//, '');

    // Remove trailing slashes
    normalized = normalized.replace(/\/+$/, '');

    // Remove @ prefix if present
    if (normalized.startsWith('@')) {
      normalized = normalized.substring(1);
    }

    // Extract joinchat link ID if present
    const joinchatMatch = normalized.match(/joinchat\/([a-zA-Z0-9_-]+)/);
    if (joinchatMatch) {
      return `joinchat/${joinchatMatch[1]}`;
    }

    // Handle private links (+hash format)
    const privateLinkMatch = normalized.match(/\+([a-zA-Z0-9_-]+)/);
    if (privateLinkMatch) {
      return `+${privateLinkMatch[1]}`;
    }

    return normalized;
  }

  /**
   * Check if a group/channel URL already exists
   */
  async checkDuplicateGroupChannel(url: string): Promise<DuplicateCheckResult> {
    const normalizedUrl = this.normalizeUrl(url);
    const existingRecords: DuplicateRecord[] = [];

    try {
      // Check in products (telegramUrl field)
      const existingProducts = await db.product.findMany({
        where: {
          platform: 'TELEGRAM',
          OR: [
            { telegramUrl: { contains: normalizedUrl, mode: 'insensitive' } },
            { telegramUrl: { contains: url, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          telegramUrl: true,
          isActive: true,
          createdAt: true,
        },
      });

      for (const product of existingProducts) {
        existingRecords.push({
          type: 'product',
          id: product.id,
          name: product.name,
          url: product.telegramUrl || undefined,
          status: product.isActive ? 'active' : 'inactive',
          createdAt: product.createdAt,
        });
      }

      // Check in pending/active transfers
      const existingTransfers = await db.telegramTransfer.findMany({
        where: {
          OR: [
            { targetUrl: { contains: normalizedUrl, mode: 'insensitive' } },
            { targetUrl: { contains: url, mode: 'insensitive' } },
          ],
          status: {
            notIn: ['COMPLETED', 'FAILED'],
          },
        },
        select: {
          id: true,
          targetUrl: true,
          status: true,
          createdAt: true,
          order: {
            select: {
              product: {
                select: { name: true },
              },
            },
          },
        },
      });

      for (const transfer of existingTransfers) {
        existingRecords.push({
          type: 'transfer',
          id: transfer.id,
          name: transfer.order?.product?.name,
          url: transfer.targetUrl,
          status: transfer.status,
          createdAt: transfer.createdAt,
        });
      }

      const isDuplicate = existingRecords.length > 0;

      return {
        isDuplicate,
        existingRecords: isDuplicate ? existingRecords : undefined,
        message: isDuplicate
          ? `⚠️ This group/channel URL already exists in ${existingRecords.length} record(s)`
          : undefined,
      };
    } catch (error: any) {
      console.error('Duplicate check failed:', error.message);
      return {
        isDuplicate: false,
        message: `Error checking duplicates: ${error.message}`,
      };
    }
  }

  /**
   * Check if a phone number already exists
   */
  async checkDuplicatePhoneNumber(phoneNumber: string): Promise<DuplicateCheckResult> {
    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
    const existingRecords: DuplicateRecord[] = [];

    try {
      // Check in telegram sessions
      const existingSession = await db.telegramSession.findFirst({
        where: {
          phoneNumber: {
            in: [phoneNumber, normalizedPhone, `+${normalizedPhone}`],
          },
        },
        select: {
          id: true,
          phoneNumber: true,
          username: true,
          isAuthorized: true,
          createdAt: true,
        },
      });

      if (existingSession) {
        existingRecords.push({
          type: 'account',
          id: existingSession.id,
          name: existingSession.username || existingSession.phoneNumber,
          status: existingSession.isAuthorized ? 'authorized' : 'unauthorized',
          createdAt: existingSession.createdAt,
        });
      }

      // Check in accounts table
      const existingAccounts = await db.account.findMany({
        where: {
          platform: 'TELEGRAM',
          OR: [
            {
              meta: {
                path: ['phoneNumber'],
                string_contains: normalizedPhone,
              },
            },
          ],
        },
        select: {
          id: true,
          isUsed: true,
          isValid: true,
          createdAt: true,
          product: {
            select: { name: true },
          },
        },
      });

      for (const account of existingAccounts) {
        existingRecords.push({
          type: 'account',
          id: account.id,
          name: account.product?.name,
          status: account.isUsed ? 'used' : account.isValid ? 'valid' : 'invalid',
          createdAt: account.createdAt,
        });
      }

      const isDuplicate = existingRecords.length > 0;

      return {
        isDuplicate,
        existingRecords: isDuplicate ? existingRecords : undefined,
        message: isDuplicate
          ? `⚠️ This phone number already exists in ${existingRecords.length} record(s)`
          : undefined,
      };
    } catch (error: any) {
      console.error('Phone duplicate check failed:', error.message);
      return {
        isDuplicate: false,
        message: `Error checking duplicates: ${error.message}`,
      };
    }
  }

  /**
   * Search for groups/channels by URL or keyword
   */
  async searchGroupsChannels(query: string): Promise<SearchResult> {
    const normalizedQuery = query.toLowerCase().trim();
    const groups: GroupChannelResult[] = [];
    const accounts: AccountResult[] = [];

    try {
      // Search in products
      const products = await db.product.findMany({
        where: {
          platform: 'TELEGRAM',
          type: { in: Array.from(TELEGRAM_TRANSFER_PRODUCT_TYPES) },
          OR: [
            { name: { contains: normalizedQuery, mode: 'insensitive' } },
            { telegramUrl: { contains: normalizedQuery, mode: 'insensitive' } },
            { sku: { contains: normalizedQuery, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          telegramUrl: true,
          isActive: true,
          meta: true,
        },
        take: 50,
      });

      for (const product of products) {
        if (product.telegramUrl) {
          const meta = product.meta as any;
          groups.push({
            id: product.id,
            productId: product.id,
            productName: product.name,
            url: product.telegramUrl,
            type: meta?.transferType || 'group',
            status: product.isActive ? 'active' : 'inactive',
            isActive: product.isActive,
          });
        }
      }

      // Search in transfers
      const transfers = await db.telegramTransfer.findMany({
        where: {
          OR: [
            { targetUrl: { contains: normalizedQuery, mode: 'insensitive' } },
            { customerTelegram: { contains: normalizedQuery, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          targetUrl: true,
          transferType: true,
          status: true,
          order: {
            select: {
              product: {
                select: { id: true, name: true },
              },
            },
          },
        },
        take: 50,
      });

      for (const transfer of transfers) {
        // Avoid duplicates from products
        if (!groups.some((g) => g.url === transfer.targetUrl)) {
          groups.push({
            id: transfer.id,
            productId: transfer.order?.product?.id,
            productName: transfer.order?.product?.name,
            url: transfer.targetUrl,
            type: transfer.transferType as 'group' | 'channel',
            status: transfer.status,
            isActive: !['COMPLETED', 'FAILED'].includes(transfer.status),
          });
        }
      }

      // Search accounts
      const telegramAccounts = await db.account.findMany({
        where: {
          platform: 'TELEGRAM',
          OR: [
            {
              meta: {
                path: ['phoneNumber'],
                string_contains: normalizedQuery,
              },
            },
            {
              meta: {
                path: ['username'],
                string_contains: normalizedQuery,
              },
            },
          ],
        },
        select: {
          id: true,
          isUsed: true,
          isValid: true,
          meta: true,
          product: {
            select: { id: true, name: true },
          },
        },
        take: 50,
      });

      for (const account of telegramAccounts) {
        const meta = account.meta as any;
        accounts.push({
          id: account.id,
          phoneNumber: meta?.phoneNumber || 'Unknown',
          username: meta?.username,
          productId: account.product?.id,
          productName: account.product?.name,
          status: account.isUsed ? 'used' : account.isValid ? 'valid' : 'invalid',
        });
      }

      return {
        groups,
        accounts,
        total: groups.length + accounts.length,
      };
    } catch (error: any) {
      console.error('Search failed:', error.message);
      return { groups: [], accounts: [], total: 0 };
    }
  }

  /**
   * Normalize phone number
   */
  private normalizePhoneNumber(phone: string): string {
    // Remove all non-digit characters except leading +
    let normalized = phone.replace(/[^\d+]/g, '');

    // Remove leading + for comparison
    if (normalized.startsWith('+')) {
      normalized = normalized.substring(1);
    }

    return normalized;
  }

  /**
   * Get duplicate statistics
   */
  async getDuplicateStats(): Promise<{
    totalProducts: number;
    totalTransfers: number;
    totalAccounts: number;
    potentialDuplicates: number;
  }> {
    try {
      const [totalProducts, totalTransfers, totalAccounts] = await Promise.all([
        db.product.count({
          where: {
            platform: 'TELEGRAM',
            telegramUrl: { not: null },
          },
        }),
        db.telegramTransfer.count(),
        db.account.count({
          where: { platform: 'TELEGRAM' },
        }),
      ]);

      // Find potential duplicates (same URL in multiple products)
      const urlCounts = await db.product.groupBy({
        by: ['telegramUrl'],
        where: {
          platform: 'TELEGRAM',
          telegramUrl: { not: null },
        },
        _count: { id: true },
        having: {
          id: { _count: { gt: 1 } },
        },
      });

      return {
        totalProducts,
        totalTransfers,
        totalAccounts,
        potentialDuplicates: urlCounts.length,
      };
    } catch (error) {
      console.error('Failed to get duplicate stats:', error);
      return {
        totalProducts: 0,
        totalTransfers: 0,
        totalAccounts: 0,
        potentialDuplicates: 0,
      };
    }
  }
}

// ================================
// SINGLETON EXPORT
// ================================

export const telegramDuplicateDetectorService = new TelegramDuplicateDetectorService();
