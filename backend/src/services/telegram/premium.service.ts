/**
 * Telegram Premium Service
 * Integrates with Fragment.com API (via Robynhood) for Premium subscription activation
 * Reference: https://robynhood.parssms.info/swagger/index.html
 * GitHub: https://github.com/iw4p/Ton-Fragment
 */

import axios, { type AxiosInstance } from 'axios';
import db from '../../configs/db';
import { auditLogService } from '../audit-log.service';

// ================================
// TYPES
// ================================

export type PremiumDuration = '1-month' | '3-month' | '6-month' | '12-month';

export interface PremiumPurchaseRequest {
  telegramUsername: string; // @username or phone number
  duration: PremiumDuration;
  orderId?: number;
  customerId?: number;
}

export interface PremiumPurchaseResult {
  success: boolean;
  transactionId?: string;
  status: 'pending' | 'completed' | 'failed';
  message: string;
  activatedAt?: Date;
  expiresAt?: Date;
  error?: string;
}

export interface PremiumStatusResult {
  success: boolean;
  hasPremium: boolean;
  expiresAt?: Date;
  daysRemaining?: number;
  error?: string;
}

export interface PremiumConfig {
  apiKey: string;
  baseUrl: string;
  enabled: boolean;
}

export interface FragmentPriceResponse {
  success: boolean;
  prices?: {
    '1-month': number;
    '3-month': number;
    '6-month': number;
    '12-month': number;
  };
  error?: string;
}

// ================================
// DURATION MAPPING
// ================================

const DURATION_MONTHS: Record<PremiumDuration, number> = {
  '1-month': 1,
  '3-month': 3,
  '6-month': 6,
  '12-month': 12,
};

// ================================
// PREMIUM SERVICE CLASS
// ================================

export class TelegramPremiumService {
  private client: AxiosInstance | null = null;
  private config: PremiumConfig | null = null;
  private configLoaded: boolean = false;

  /**
   * Load configuration from database
   */
  private async loadConfig(): Promise<PremiumConfig | null> {
    try {
      const setting = await db.settings.findUnique({
        where: { key: 'telegram_premium_config' },
      });

      if (!setting || !setting.value) {
        console.warn('⚠️ Telegram Premium config not found in settings');
        return null;
      }

      const config = setting.value as any as PremiumConfig;

      if (!config.apiKey || !config.baseUrl) {
        console.warn('⚠️ Telegram Premium config is incomplete - API Key:', config.apiKey ? '✓' : '✗', 'Base URL:', config.baseUrl ? '✓' : '✗');
        return null;
      }

      this.config = config;
      this.configLoaded = true;

      // Initialize HTTP client with proper Fragment API headers
      // Fragment API (Robynhood) uses X-API-Key header for authentication
      this.client = axios.create({
        baseURL: config.baseUrl,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': config.apiKey,
        },
        timeout: 30000,
      });

      console.log('✅ Telegram Premium service configured with baseURL:', config.baseUrl);
      return config;
    } catch (error) {
      console.error('❌ Failed to load Premium config:', error);
      return null;
    }
  }

  /**
   * Get configuration (lazy load)
   */
  private async getConfig(): Promise<PremiumConfig | null> {
    if (!this.configLoaded) {
      await this.loadConfig();
    }
    return this.config;
  }

  /**
   * Check if Premium service is enabled and configured
   */
  async isEnabled(): Promise<boolean> {
    const config = await this.getConfig();
    return !!(config?.enabled && config?.apiKey && config?.baseUrl);
  }

  /**
   * Get current Premium prices from Fragment API
   */
  async getPrices(): Promise<FragmentPriceResponse> {
    try {
      const config = await this.getConfig();
      if (!config || !this.client) {
        const msg = 'Premium service not configured';
        console.error('❌', msg);
        return { success: false, error: msg };
      }

      console.log('📡 Fetching prices from Fragment API...');
      const response = await this.client.get('/api/prices/list');

      // Extract premium prices from response
      const priceList = response.data?.prices || [];
      const premiumPrices = priceList.filter((item: any) => item.product_type === 'premium');

      if (!premiumPrices || premiumPrices.length === 0) {
        console.error('❌ No premium prices found in response');
        return { success: false, error: 'No premium prices available' };
      }

      // Map API response to expected format
      const prices: any = {};
      premiumPrices.forEach((item: any) => {
        // Extract duration from item_name
        if (item.item_name.includes('3 months')) {
          prices['3-month'] = parseFloat(item.price);
        } else if (item.item_name.includes('6 months')) {
          prices['6-month'] = parseFloat(item.price);
        } else if (item.item_name.includes('1 year')) {
          prices['12-month'] = parseFloat(item.price);
        }
      });

      // Add 1-month if not present (fallback)
      if (!prices['1-month']) {
        prices['1-month'] = prices['3-month'] ? prices['3-month'] / 3 : 0;
      }

      if (Object.keys(prices).length === 0) {
        console.error('❌ Failed to parse premium prices');
        return { success: false, error: 'Failed to parse premium prices' };
      }

      console.log('✅ Successfully fetched Premium prices:', prices);
      return {
        success: true,
        prices,
      };
    } catch (error: any) {
      const errorDetails = {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      };
      console.error('❌ Failed to fetch Premium prices:', JSON.stringify(errorDetails, null, 2));
      
      // Provide helpful error messages based on status code
      if (error.response?.status === 401) {
        return { 
          success: false, 
          error: 'Authentication failed - Invalid or missing API key. Please check Premium configuration.' 
        };
      } else if (error.response?.status === 404) {
        return { 
          success: false, 
          error: 'Fragment API endpoint not found. Check baseURL configuration.' 
        };
      }
      
      return { success: false, error: error.message };
    }
  }

  /**
   * Purchase Premium subscription for a Telegram user
   */
  async purchasePremium(request: PremiumPurchaseRequest): Promise<PremiumPurchaseResult> {
    try {
      const config = await this.getConfig();

      if (!config || !this.client) {
        return {
          success: false,
          status: 'failed',
          message: 'Premium service not configured',
          error: 'Service not available',
        };
      }

      if (!config.enabled) {
        return {
          success: false,
          status: 'failed',
          message: 'Premium service is disabled',
          error: 'Service disabled by admin',
        };
      }

      // Clean username
      const username = this.cleanUsername(request.telegramUsername);

      console.log(`📱 Initiating Premium purchase for ${username} (${request.duration})`);

      // Call Fragment API
      const response = await this.client.post('/api/premium/purchase', {
        username,
        duration: DURATION_MONTHS[request.duration],
      });

      if (response.data?.success) {
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + DURATION_MONTHS[request.duration]);

        // Log the purchase
        await this.logPremiumPurchase({
          username,
          duration: request.duration,
          orderId: request.orderId,
          customerId: request.customerId,
          transactionId: response.data.transactionId,
          status: 'completed',
          expiresAt,
        });

        // Also log to audit log
        if (request.orderId) {
          auditLogService.logPremiumPurchase(
            request.orderId,
            username,
            request.duration,
            request.customerId
          ).catch(() => {
            // Ignore audit log errors
          });
        }

        console.log(`✅ Premium activated for ${username}`);

        // Send Telegram notification
        try {
          const { telegramNotificationService } = await import('../telegram-notification.service');
          await telegramNotificationService.sendPremiumNotification({
            username,
            duration: request.duration,
            orderId: request.orderId,
            status: 'completed',
            transactionId: response.data.transactionId,
          });
        } catch (error) {
          console.error('Failed to send Premium notification:', error);
          // Don't fail the premium activation if notification fails
        }

        return {
          success: true,
          transactionId: response.data.transactionId,
          status: 'completed',
          message: `Premium activated successfully for ${request.duration}`,
          activatedAt: new Date(),
          expiresAt,
        };
      }

      // Handle failure
      await this.logPremiumPurchase({
        username,
        duration: request.duration,
        orderId: request.orderId,
        customerId: request.customerId,
        status: 'failed',
        error: response.data?.message,
      });

      // Send Telegram notification for failure
      try {
        const { telegramNotificationService } = await import('../telegram-notification.service');
        await telegramNotificationService.sendPremiumNotification({
          username,
          duration: request.duration,
          orderId: request.orderId,
          status: 'failed',
          error: response.data?.message,
        });
      } catch (error) {
        console.error('Failed to send Premium failure notification:', error);
      }

      return {
        success: false,
        status: 'failed',
        message: response.data?.message || 'Failed to activate Premium',
        error: response.data?.error,
      };
    } catch (error: any) {
      console.error('❌ Premium purchase failed:', error.message);

      // Log failed attempt
      await this.logPremiumPurchase({
        username: request.telegramUsername,
        duration: request.duration,
        orderId: request.orderId,
        customerId: request.customerId,
        status: 'failed',
        error: error.message,
      });

      // Send Telegram notification for unexpected failure as well
      try {
        const { telegramNotificationService } = await import('../telegram-notification.service');
        await telegramNotificationService.sendPremiumNotification({
          username: request.telegramUsername,
          duration: request.duration,
          orderId: request.orderId,
          status: 'failed',
          error: error.message,
        });
      } catch (notifyErr) {
        console.error('Failed to send Premium unexpected failure notification:', notifyErr);
      }

      return {
        success: false,
        status: 'failed',
        message: 'Failed to process Premium purchase',
        error: error.message,
      };
    }
  }

  /**
   * Check Premium status for a Telegram user
   */
  async checkPremiumStatus(telegramUsername: string): Promise<PremiumStatusResult> {
    try {
      const config = await this.getConfig();

      if (!config || !this.client) {
        return { success: false, hasPremium: false, error: 'Service not configured' };
      }

      const username = this.cleanUsername(telegramUsername);

      const response = await this.client.get(`/api/premium/status/${username}`);

      if (response.data?.success) {
        const expiresAt = response.data.expiresAt ? new Date(response.data.expiresAt) : undefined;
        const daysRemaining = expiresAt
          ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : undefined;

        return {
          success: true,
          hasPremium: response.data.hasPremium,
          expiresAt,
          daysRemaining,
        };
      }

      return {
        success: false,
        hasPremium: false,
        error: response.data?.message,
      };
    } catch (error: any) {
      console.error('❌ Failed to check Premium status:', error.message);
      return {
        success: false,
        hasPremium: false,
        error: error.message,
      };
    }
  }

  /**
   * Process Premium orders from order queue
   * Called by cron job or order completion webhook
   */
  async processPremiumOrder(
    orderId: number
  ): Promise<{ success: boolean; message: string; result?: PremiumPurchaseResult }> {
    try {
      // Get order details
      const order = await db.order.findUnique({
        where: { id: orderId },
        include: {
          product: true,
          user: true,
        },
      });

      if (!order) {
        return { success: false, message: 'Order not found' };
      }

      // Check if product is a Premium subscription
      const isPremiumProduct = ['PREMIUM_1M', 'PREMIUM_3M', 'PREMIUM_6M', 'PREMIUM_12M'].includes(
        order.product.type
      );
      
      if (!isPremiumProduct) {
        return { success: false, message: 'Not a Premium subscription order' };
      }

      // Get premium targets from order meta or user profile
      const orderMeta = order.meta as any;
      const explicitTargets = Array.isArray(orderMeta?.premiumTargets)
        ? orderMeta.premiumTargets.map((value: unknown) => String(value).trim()).filter(Boolean)
        : []
      const linkedTargets = Array.isArray(orderMeta?.linkedAccounts)
        ? orderMeta.linkedAccounts.map((value: unknown) => String(value).trim()).filter(Boolean)
        : []
      const fallbackTarget =
        orderMeta?.telegramUsername || order.user?.telegramUsername || order.user?.username || null

      const targets = explicitTargets.length
        ? explicitTargets
        : linkedTargets.length
          ? linkedTargets
          : fallbackTarget
            ? [String(fallbackTarget).trim()]
            : []

      if (targets.length === 0) {
        return { success: false, message: 'No Telegram username or account number found for order' };
      }

      // Get duration from product type
      const typeToDuration: Record<string, PremiumDuration> = {
        PREMIUM_1M: '1-month',
        PREMIUM_3M: '3-month',
        PREMIUM_6M: '6-month',
        PREMIUM_12M: '12-month'
      };
      const duration = typeToDuration[order.product.type] || '1-month';

      const results: PremiumPurchaseResult[] = []

      for (const target of targets) {
        const result = await this.purchasePremium({
          telegramUsername: target,
          duration,
          orderId: order.id,
          customerId: order.userId || undefined,
        })

        results.push(result)
      }

      const successCount = results.filter((result) => result.success).length
      const allSucceeded = successCount === results.length
      const latestExpiry = results
        .map((result) => result.expiresAt)
        .filter(Boolean)
        .sort((left, right) => right!.getTime() - left!.getTime())[0]
      const firstSuccess = results.find((result) => result.success)

      await db.order.update({
        where: { id: orderId },
        data: {
          status: 'COMPLETED',
          deliveredAt: firstSuccess ? new Date() : order.deliveredAt ?? null,
          meta: {
            ...orderMeta,
            premiumTargets: targets,
            premiumActivated: allSucceeded,
            premiumActivationSummary: {
              totalTargets: targets.length,
              successCount,
              failedCount: targets.length - successCount,
              processedAt: new Date().toISOString()
            },
            premiumActivationResults: results.map((result, index) => ({
              target: targets[index],
              success: result.success,
              status: result.status,
              message: result.message,
              transactionId: result.transactionId,
              expiresAt: result.expiresAt?.toISOString() ?? null
            })),
            premiumTransactionId: firstSuccess?.transactionId,
            premiumExpiresAt: latestExpiry?.toISOString(),
          },
        },
      });

      return {
        success: allSucceeded,
        message: allSucceeded
          ? `Premium activated for ${successCount} target${successCount === 1 ? '' : 's'}`
          : `Premium activated for ${successCount}/${targets.length} target${targets.length === 1 ? '' : 's'}`,
        result: {
          success: allSucceeded,
          transactionId: firstSuccess?.transactionId,
          status: allSucceeded ? 'completed' : 'failed',
          message: firstSuccess?.message || 'Premium processing finished',
          activatedAt: firstSuccess?.activatedAt,
          expiresAt: latestExpiry
        }
      };
    } catch (error: any) {
      console.error('❌ Failed to process Premium order:', error.message);
      return { success: false, message: error.message };
    }
  }

  /**
   * Clean and normalize Telegram username
   */
  private cleanUsername(username: string): string {
    let cleaned = username.trim();

    // Remove @ prefix if present
    if (cleaned.startsWith('@')) {
      cleaned = cleaned.substring(1);
    }

    // Remove t.me/ prefix if present
    cleaned = cleaned.replace(/^(https?:\/\/)?(t\.me\/|telegram\.me\/)/i, '');

    return cleaned;
  }

  /**
   * Log Premium purchase to database
   */
  private async logPremiumPurchase(data: {
    username: string;
    duration: PremiumDuration;
    orderId?: number;
    customerId?: number;
    transactionId?: string;
    status: 'pending' | 'completed' | 'failed';
    expiresAt?: Date;
    error?: string;
  }): Promise<void> {
    try {
      // Store in a general audit log or create a specific table
      await db.settings.upsert({
        where: { key: `premium_log_${Date.now()}` },
        update: {},
        create: {
          key: `premium_log_${Date.now()}`,
          value: {
            ...data,
            createdAt: new Date().toISOString(),
          } as any,
        },
      });
    } catch (error) {
      console.error('Failed to log Premium purchase:', error);
    }
  }

  /**
   * Reload configuration (call after admin updates settings)
   */
  async reloadConfig(): Promise<void> {
    this.configLoaded = false;
    this.config = null;
    this.client = null;
    await this.loadConfig();
  }

  /**
   * Get service status for health check
   */
  async getServiceStatus(): Promise<{
    configured: boolean;
    enabled: boolean;
    apiConnected: boolean;
    error?: string;
  }> {
    try {
      const config = await this.getConfig();

      if (!config) {
        return { configured: false, enabled: false, apiConnected: false };
      }

      if (!config.enabled) {
        return { configured: true, enabled: false, apiConnected: false };
      }

      // Try a simple API call to check connectivity
      if (this.client) {
        try {
          // Use /api/balance endpoint to test connection (this is a safe read-only endpoint)
          await this.client.get('/api/balance', { timeout: 5000 });
          return { configured: true, enabled: true, apiConnected: true };
        } catch (error: any) {
          console.error('❌ API Connection test failed:', error.message);
          return {
            configured: true,
            enabled: true,
            apiConnected: false,
            error: `API not reachable: ${error.message}`,
          };
        }
      }

      return { configured: true, enabled: true, apiConnected: false };
    } catch (error: any) {
      return {
        configured: false,
        enabled: false,
        apiConnected: false,
        error: error.message,
      };
    }
  }
}

// ================================
// SINGLETON EXPORT
// ================================

export const telegramPremiumService = new TelegramPremiumService();
