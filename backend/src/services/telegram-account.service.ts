import db from '../configs/db';
import type {
  CreateTelegramAccount,
  TelegramAccountDetails,
  TelegramAccountMeta,
  TelegramAccountStats,
  TelegramCredentials,
  UpdateTelegramAccount,
} from '../types/telegram.types';
import { decrypt, encrypt } from '../utils/encryption';
import { CacheInvalidationService } from './cache-invalidation.service';
import { OrderService } from './order.services';
import { auditLogService } from './audit-log.service';

export class TelegramAccountService {
  private cacheInvalidationService = new CacheInvalidationService();
  private _orderService?: OrderService; // Lazy initialization to avoid circular dependency

  // Getter for orderService with lazy initialization
  private get orderService(): OrderService {
    if (!this._orderService) {
      this._orderService = new OrderService();
    }
    return this._orderService;
  }

  // ================================
  // ACCOUNT MANAGEMENT
  // ================================

  async create(data: CreateTelegramAccount) {
    // Encrypt the credentials
    const encryptedCredentials = encrypt(JSON.stringify(data.credentials));

    // Create the account in database
    const account = await db.account.create({
      data: {
        platform: 'TELEGRAM',
        encryptedData: encryptedCredentials,
        isUsed: false,
        isValid: true,
        requiresOtp: true, // Always true for Telegram
        hasPremium: data.hasPremium || false,
        productId: data.productId || null,
        meta: data.meta as any, // Cast to satisfy JSON type
      } as any,
    });

    // Update product stock count only if productId is provided
    if (data.productId) {
      await this.updateProductStockCount(data.productId);
      // Invalidate related caches
      await this.cacheInvalidationService.invalidateProduct(data.productId);

      // Process any pending orders for this product (backorder fulfillment)
      await this.orderService.processPendingOrdersForProduct(data.productId);
    }

    return account;
  }

  async findById(id: number, includeCredentials = false): Promise<TelegramAccountDetails> {
    const account = await db.account.findUnique({
      where: { id },
      include: {
        product: {
          select: { id: true, name: true, sku: true },
        },
      },
    });

    if (!account) {
      throw new Error('Account not found');
    }

    if (account.platform !== 'TELEGRAM') {
      throw new Error('Account is not a Telegram account');
    }

    let credentials: TelegramCredentials | undefined = undefined;

    if (includeCredentials) {
      // Try to decrypt encrypted data if available and valid
      // Check if encryptedData exists and has the correct format (iv:authTag:encryptedText)
      if (
        account.encryptedData &&
        typeof account.encryptedData === 'string' &&
        account.encryptedData.trim().length > 0 &&
        account.encryptedData.split(':').length === 3
      ) {
        try {
          const decryptedData = decrypt(account.encryptedData);
          credentials = JSON.parse(decryptedData) as TelegramCredentials;
        } catch (error) {
          console.error('Failed to decrypt account credentials:', error);
          throw new Error('Failed to decrypt credentials');
        }
      } else {
        throw new Error('No encrypted credentials available for this account');
      }
    }

    const meta = account.meta as TelegramAccountMeta;

    return {
      id: account.id,
      productId: account.productId,
      productName: account.product?.name,
      productSku: account.product?.sku,
      platform: account.platform,
      requiresOtp: account.requiresOtp,
      hasPremium: account.hasPremium,
      isUsed: account.isUsed,
      usedAt: account.usedAt || undefined,
      meta,
      createdAt: account.createdAt,
      credentials,
    };
  }

  async findByProduct(productId: number, includeUsed = false) {
    const accounts = await db.account.findMany({
      where: {
        productId,
        platform: 'TELEGRAM',
        isValid: true,
        archived: false, // Exclude archived accounts
        ...(includeUsed ? {} : { isUsed: false }),
      },
      include: {
        product: {
          select: { id: true, name: true, sku: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return accounts.map((account) => ({
      id: account.id,
      productName: account.product?.name,
      productSku: account.product?.sku,
      platform: account.platform,
      requiresOtp: account.requiresOtp,
      hasPremium: account.hasPremium,
      isUsed: account.isUsed,
      usedAt: account.usedAt || undefined,
      meta: account.meta as TelegramAccountMeta,
      createdAt: account.createdAt,
      credentials: undefined, // Never include credentials in list view
    }));
  }

  async update(id: number, data: UpdateTelegramAccount | any) {
    // Get account from database first (not using findById which returns TelegramAccountDetails)
    const dbAccount = await db.account.findUnique({ where: { id } });
    if (!dbAccount) {
      throw new Error('Account not found');
    }

    const account = await this.findById(id);
    const oldProductId = account.productId;

    let updateData: any = {
      isValid: data.isValid,
      hasPremium: data.hasPremium,
    };

    // Handle isUsed and usedAt (for marking as sold)
    if (data.isUsed !== undefined) {
      updateData.isUsed = data.isUsed;
      if (data.isUsed && data.usedAt) {
        updateData.usedAt = new Date(data.usedAt);
      } else if (data.isUsed && !data.usedAt) {
        updateData.usedAt = new Date();
      } else if (!data.isUsed) {
        updateData.usedAt = null;
        // Optionally clear usedByOrderId when marking as not used
        // updateData.usedByOrderId = null;
      }
    }

    // Handle archived status change
    if (data.archived !== undefined) {
      updateData.archived = data.archived;
    }

    // Handle productId change
    if (data.productId !== undefined && data.productId !== oldProductId) {
      // Verify the account is not used before changing product
      if (dbAccount.isUsed) {
        throw new Error('Cannot change product ID for a used account');
      }

      // Verify the new product exists
      const newProduct = await db.product.findUnique({
        where: { id: data.productId },
      });

      if (!newProduct) {
        throw new Error(`Product with ID ${data.productId} not found`);
      }

      // Verify the new product is a Telegram product
      if (newProduct.platform !== 'TELEGRAM') {
        throw new Error('Target product must be a Telegram product');
      }

      updateData.productId = data.productId;
    }

    // If updating credentials, encrypt them
    if (data.credentials) {
      let currentCredentials: TelegramCredentials = { phone: '', sessionData: '' };

      try {
        // Get the actual account from database to access encryptedData
        if (
          dbAccount.encryptedData &&
          typeof dbAccount.encryptedData === 'string' &&
          dbAccount.encryptedData.trim().length > 0 &&
          dbAccount.encryptedData.split(':').length === 3
        ) {
          const decryptedData = decrypt(dbAccount.encryptedData);
          currentCredentials = JSON.parse(decryptedData);
        }
      } catch {
        // Use empty credentials as fallback
      }

      const newCredentials: TelegramCredentials = {
        ...currentCredentials,
        ...data.credentials,
      };

      updateData.encryptedData = encrypt(JSON.stringify(newCredentials));

      // If phone is updated, also update meta.phone for reference (session management/display)
      if (data.credentials.phone) {
        const currentMeta = (account.meta as TelegramAccountMeta) || {};
        updateData.meta = {
          ...currentMeta,
          phone: data.credentials.phone,
        };
      }
    }

    // Update meta
    if (data.meta) {
      updateData.meta = {
        ...(updateData.meta || (account.meta as TelegramAccountMeta)),
        ...data.meta,
      };
    }

    // Track old values for audit log
    const oldStatus = {
      isUsed: dbAccount.isUsed,
      isValid: dbAccount.isValid,
      archived: dbAccount.archived,
    };

    const updatedAccount = await db.account.update({
      where: { id },
      data: updateData,
    });

    // Log status changes to audit log
    if (data.isUsed !== undefined || data.isValid !== undefined || data.archived !== undefined) {
      const newStatus = {
        isUsed: updatedAccount.isUsed,
        isValid: updatedAccount.isValid,
        archived: updatedAccount.archived,
      };
      auditLogService.logAccountStatusChange(id, oldStatus, newStatus).catch(() => {
        // Ignore audit log errors
      });
    }

    // If productId changed, update stock counts for both products
    if (data.productId !== undefined && data.productId !== oldProductId) {
      await Promise.all([
        this.updateProductStockCount(oldProductId), // Decrease old product stock
        this.updateProductStockCount(data.productId), // Increase new product stock
      ]);
    } else if (data.archived !== undefined || data.isUsed !== undefined) {
      // If archived status or isUsed status changed, update stock count for current product
      await this.updateProductStockCount(account.productId);
    }

    return updatedAccount;
  }

  async markAsUsed(id: number, orderId?: number) {
    // Get old status before update
    const oldAccount = await db.account.findUnique({
      where: { id },
      select: { isUsed: true, isValid: true, archived: true }
    });

    const updateData: any = {
      isUsed: true,
      usedAt: new Date(),
    };

    if (orderId) {
      updateData.usedByOrderId = orderId;
    }

    const account = await db.account.update({
      where: { id },
      data: updateData,
    });

    // Create audit log for account assignment
    if (orderId) {
      const { auditLogService } = await import('./audit-log.service');
      await auditLogService.logAccountAssignment(id, orderId);
    }

    // Create audit log for status change
    if (oldAccount && !oldAccount.isUsed) {
      const { auditLogService } = await import('./audit-log.service');
      await auditLogService.logAccountStatusChange(
        id,
        { isUsed: oldAccount.isUsed, isValid: oldAccount.isValid, archived: oldAccount.archived },
        { isUsed: true, isValid: account.isValid, archived: account.archived }
      );
    }

    // Update product stock count
    await this.updateProductStockCount(account.productId);

    return account;
  }

  async validateAccount(id: number, isValid: boolean) {
    const account = await db.account.update({
      where: { id },
      data: {
        isValid,
      },
    });

    // Update product stock count
    await this.updateProductStockCount(account.productId);

    return account;
  }

  async delete(id: number) {
    const account = await db.account.findUnique({
      where: { id },
      select: { id: true, productId: true, isUsed: true, meta: true },
    });

    if (!account) {
      throw new Error('Account not found');
    }

    if (account.isUsed) {
      throw new Error('Cannot delete used account. Consider marking as invalid instead.');
    }

    // Get phone number from meta to delete session file
    const meta = account.meta as TelegramAccountMeta;
    const phoneNumber = meta?.phone;

    // Delete session from database if phone exists
    if (phoneNumber) {
      try {
        const { SessionService } = await import('./telegram/session');
        await SessionService.deleteSession(phoneNumber);
      } catch (error) {
        console.error('Error deleting Telegram session:', error);
        // Continue with account deletion even if session deletion fails
      }
    }

    await db.account.delete({
      where: { id },
    });

    // Update product stock count
    await this.updateProductStockCount(account.productId);

    return { success: true };
  }

  // ================================
  // ACCOUNT ASSIGNMENT
  // ================================

  async assignAccountToOrder(productId: number, quantity: number) {
    // Find available accounts for the product
    const availableAccounts = await db.account.findMany({
      where: {
        productId,
        platform: 'TELEGRAM',
        isUsed: false,
        isValid: true,
        archived: false, // Exclude archived accounts
      },
      take: quantity,
      orderBy: { createdAt: 'asc' }, // First in, first out
    });

    if (availableAccounts.length < quantity) {
      throw new Error(`Insufficient stock. Only ${availableAccounts.length} accounts available.`);
    }

    return availableAccounts.map((account) => ({
      id: account.id,
      hasPremium: account.hasPremium,
      meta: account.meta as TelegramAccountMeta,
    }));
  }

  async getAccountCredentials(
    accountId: number,
    orderId?: number
  ): Promise<TelegramCredentials | null> {
    const account = await db.account.findUnique({
      where: { id: accountId },
      select: { id: true, encryptedData: true, platform: true },
    });

    if (!account) {
      throw new Error('Account not found');
    }

    if (account.platform !== 'TELEGRAM') {
      throw new Error('Account is not a Telegram account');
    }

    // Check if encrypted credentials exist
    if (
      !account.encryptedData ||
      typeof account.encryptedData !== 'string' ||
      account.encryptedData.trim().length === 0 ||
      account.encryptedData.split(':').length !== 3
    ) {
      // No credentials available, return null instead of throwing error
      return null;
    }

    try {
      const decryptedData = decrypt(account.encryptedData);
      const credentials = JSON.parse(decryptedData) as TelegramCredentials;

      // Optional: Log access for audit trail
      if (orderId) {
        console.log(`Account ${accountId} accessed for order ${orderId}`);
      }

      return credentials;
    } catch (error) {
      console.error('Failed to decrypt account credentials:', error);
      // Return null instead of throwing error
      return null;
    }
  }

  // ================================
  // STATISTICS & ANALYTICS
  // ================================

  async getStats(productId?: number): Promise<TelegramAccountStats> {
    const whereCondition: any = {
      platform: 'TELEGRAM',
      archived: false, // Exclude archived accounts from stats
    };

    if (productId) {
      whereCondition.productId = productId;
    }

    const [totalAccounts, usedAccounts, validAccounts, premiumAccounts] = await Promise.all([
      db.account.count({ where: whereCondition }),
      db.account.count({ where: { ...whereCondition, isUsed: true } }),
      db.account.count({ where: { ...whereCondition, isValid: true } }),
      db.account.count({ where: { ...whereCondition, hasPremium: true } }),
    ]);

    const available = totalAccounts - usedAccounts;

    return {
      total: totalAccounts,
      available,
      used: usedAccounts,
      invalid: totalAccounts - validAccounts,
      premium: premiumAccounts,
      usageRate: totalAccounts > 0 ? (usedAccounts / totalAccounts) * 100 : 0,
    };
  }

  async getBulkStats(productIds: number[]) {
    const stats = await db.account.groupBy({
      by: ['productId'],
      where: {
        platform: 'TELEGRAM',
        productId: { in: productIds },
        archived: false, // Exclude archived accounts
      },
      _count: {
        _all: true,
      },
    });

    const result: Record<number, { total: number; available: number }> = {};

    for (const productId of productIds) {
      const stat = stats.find((s) => s.productId === productId);
      const total = stat?._count._all || 0;

      // Get available count separately
      const available = await db.account.count({
        where: {
          productId,
          platform: 'TELEGRAM',
          isUsed: false,
          isValid: true,
          archived: false, // Exclude archived accounts
        },
      });

      result[productId] = { total, available };
    }

    return result;
  }

  // ================================
  // UTILITY METHODS
  // ================================

  private async updateProductStockCount(productId: number) {
    const stockCount = await db.account.count({
      where: {
        productId,
        platform: 'TELEGRAM',
        isUsed: false,
        isValid: true,
        archived: false, // Exclude archived accounts from stock count
      },
    });

    await db.product.update({
      where: { id: productId },
      data: { stockCount },
    });
  }

  async bulkImport(accounts: CreateTelegramAccount[]) {
    const results = {
      created: 0,
      errors: [] as string[],
    };

    const affectedProductIds = new Set<number>();

    for (const accountData of accounts) {
      try {
        await this.create(accountData);
        results.created++;
        if (accountData.productId && typeof accountData.productId === 'number') {
          affectedProductIds.add(accountData.productId);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(
          `Failed to import account ${accountData.credentials.phone}: ${errorMessage}`
        );
      }
    }

    // Process pending orders for all affected products (backorder fulfillment)
    for (const productId of affectedProductIds) {
      try {
        await this.orderService.processPendingOrdersForProduct(productId);
      } catch (error) {
        console.error('Failed to process pending orders for product', {
          productId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  async validateBulk(accountIds: number[], isValid: boolean) {
    const result = await db.account.updateMany({
      where: {
        id: { in: accountIds },
        platform: 'TELEGRAM',
      },
      data: {
        isValid,
      },
    });

    // Update stock counts for affected products
    const products = await db.account.findMany({
      where: { id: { in: accountIds } },
      select: { productId: true },
      distinct: ['productId'],
    });

    for (const product of products) {
      if (product.productId) {
        await this.updateProductStockCount(product.productId);
      }
    }

    return {
      success: true,
      updatedCount: result.count,
      message: `Updated ${result.count} accounts`,
    };
  }

  async bulkAssignToProduct(accountIds: number[], productId: number) {
    // Get old product IDs for stock count updates
    const accounts = await db.account.findMany({
      where: { id: { in: accountIds }, platform: 'TELEGRAM' },
      select: { productId: true },
    });

    const oldProductIds = [...new Set(accounts.map((acc) => acc.productId).filter(Boolean))];

    // Update accounts
    const result = await db.account.updateMany({
      where: {
        id: { in: accountIds },
        platform: 'TELEGRAM',
      },
      data: {
        productId,
      },
    });

    // Update stock counts for old products (decrease)
    for (const oldProductId of oldProductIds) {
      if (oldProductId) {
        await this.updateProductStockCount(oldProductId);
      }
    }

    // Update stock count for new product (increase)
    await this.updateProductStockCount(productId);

    // Invalidate caches
    await this.cacheInvalidationService.invalidateProduct(productId);
    for (const oldProductId of oldProductIds) {
      if (oldProductId) {
        await this.cacheInvalidationService.invalidateProduct(oldProductId);
      }
    }

    return {
      success: true,
      updatedCount: result.count,
      message: `Assigned ${result.count} accounts to product`,
    };
  }

  async bulkChangeProxy(accountIds: number[], proxyConfig: {
    host: string;
    port: number;
    type: 'SOCKS5' | 'HTTP';
    username?: string;
    password?: string;
  }) {
    // Get accounts with their current meta
    const accounts = await db.account.findMany({
      where: { id: { in: accountIds }, platform: 'TELEGRAM' },
      select: { id: true, meta: true },
    });

    // Update each account's proxy
    const updatePromises = accounts.map((account) => {
      const currentMeta = (account.meta as any) || {};
      const updatedMeta = {
        ...currentMeta,
        proxy: proxyConfig,
      };

      return db.account.update({
        where: { id: account.id },
        data: { meta: updatedMeta as any },
      });
    });

    await Promise.all(updatePromises);

    return {
      success: true,
      updatedCount: accounts.length,
      message: `Updated proxy for ${accounts.length} accounts`,
    };
  }

  async bulkTestSessions(accountIds: number[]): Promise<{
    success: boolean;
    results: Array<{
      accountId: number;
      phone: string;
      valid: boolean;
      error?: string;
    }>;
  }> {
    const { OtpService } = await import('../services/telegram/otp');
    
    // Get accounts with phone numbers
    const accounts = await db.account.findMany({
      where: { id: { in: accountIds }, platform: 'TELEGRAM' },
      select: { id: true, meta: true },
    });

    const results = await Promise.all(
      accounts.map(async (account) => {
        const meta = account.meta as any;
        const phone = meta?.phone;
        const proxy = meta?.proxy;

        if (!phone) {
          await db.account.update({
            where: { id: account.id },
            data: {
              isValid: false,
              meta: {
                ...meta,
                accountHealthStatus: 'BROKE',
                accountHealthMessage: 'Phone number is missing from account metadata',
                lastStatusCheckedAt: new Date().toISOString(),
              } as any,
            },
          });

          return {
            accountId: account.id,
            phone: 'N/A',
            valid: false,
            error: 'No phone number found',
          };
        }

        try {
          const testResult = await OtpService.testSessionConnection(phone, proxy);

          const nextStatus =
            testResult.success && testResult.authorized
              ? {
                  isValid: true,
                  accountHealthStatus: 'AVAILABLE',
                  accountHealthMessage: 'Account is available',
                }
              : testResult.message?.toLowerCase().includes('no session') ||
                  testResult.message?.toLowerCase().includes('not authorized')
                ? {
                    isValid: false,
                    accountHealthStatus: 'RELOGIN_REQUIRED',
                    accountHealthMessage:
                      testResult.message || 'Session is logged out or no longer authorized',
                  }
                : {
                    isValid: false,
                    accountHealthStatus: 'BROKE',
                    accountHealthMessage: testResult.message || 'Account session is broken',
                  };

          await db.account.update({
            where: { id: account.id },
            data: {
              isValid: nextStatus.isValid,
              meta: {
                ...meta,
                accountHealthStatus: nextStatus.accountHealthStatus,
                accountHealthMessage: nextStatus.accountHealthMessage,
                lastStatusCheckedAt: new Date().toISOString(),
              } as any,
            },
          });

          return {
            accountId: account.id,
            phone,
            valid: testResult.authorized || false,
            error: testResult.message,
          };
        } catch (error: any) {
          return {
            accountId: account.id,
            phone,
            valid: false,
            error: error.message || 'Test failed',
          };
        }
      })
    );

    // Update stock counts for affected products
    const productIds = await db.account.findMany({
      where: { id: { in: accountIds } },
      select: { productId: true },
      distinct: ['productId'],
    });

    for (const product of productIds) {
      if (product.productId) {
        await this.updateProductStockCount(product.productId);
      }
    }

    return {
      success: true,
      results,
    };
  }
}
