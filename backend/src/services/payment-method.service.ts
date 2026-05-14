import { Prisma } from '@prisma/client';
import db from '../configs/db';
import { AppError } from '../middlewares/error-handler';
import { decrypt, encrypt, isEncrypted } from '../utils/encryption';
import type {
  CreatePaymentMethodInput,
  PaymentMethodQueryInput,
  UpdatePaymentMethodInput,
} from '../validations/zod/payment-method.schema';
import { cacheService } from './cache.service';

export class PaymentMethodService {
  private readonly CACHE_PREFIX = 'uhq:payment-method:';
  private readonly CACHE_TTL = 3600; // 1 hour

  /**
   * Mask sensitive credential values for display
   * Shows first 4 and last 4 characters, masks the rest
   */
  private maskCredential(value: string | null | undefined): string | null {
    if (!value) return null;
    if (value.length <= 8) return '••••••••';
    return `${value.substring(0, 4)}${'•'.repeat(Math.max(0, value.length - 8))}${value.substring(value.length - 4)}`;
  }

  /**
   * Decrypt and mask sensitive fields for API responses
   */
  private maskSensitiveFields(paymentMethod: any, includeMasked: boolean = true) {
    const masked: any = { ...paymentMethod };

    // Decrypt and mask credentials if they exist
    if (masked.apiKey) {
      try {
        if (isEncrypted(masked.apiKey)) {
          const decrypted = decrypt(masked.apiKey);
          masked.apiKey = includeMasked ? this.maskCredential(decrypted) : null;
        } else {
          masked.apiKey = includeMasked ? this.maskCredential(masked.apiKey) : null;
        }
      } catch {
        masked.apiKey = includeMasked ? '••••••••' : null;
      }
    }

    if (masked.apiSecret) {
      try {
        if (isEncrypted(masked.apiSecret)) {
          const decrypted = decrypt(masked.apiSecret);
          masked.apiSecret = includeMasked ? this.maskCredential(decrypted) : null;
        } else {
          masked.apiSecret = includeMasked ? this.maskCredential(masked.apiSecret) : null;
        }
      } catch {
        masked.apiSecret = includeMasked ? '••••••••' : null;
      }
    }

    if (masked.merchantId) {
      try {
        if (isEncrypted(masked.merchantId)) {
          const decrypted = decrypt(masked.merchantId);
          masked.merchantId = includeMasked ? this.maskCredential(decrypted) : null;
        } else {
          masked.merchantId = includeMasked ? this.maskCredential(masked.merchantId) : null;
        }
      } catch {
        masked.merchantId = includeMasked ? '••••••••' : null;
      }
    }

    if (masked.webhookSecret) {
      try {
        if (isEncrypted(masked.webhookSecret)) {
          const decrypted = decrypt(masked.webhookSecret);
          masked.webhookSecret = includeMasked ? this.maskCredential(decrypted) : null;
        } else {
          masked.webhookSecret = includeMasked ? this.maskCredential(masked.webhookSecret) : null;
        }
      } catch {
        masked.webhookSecret = includeMasked ? '••••••••' : null;
      }
    }

    return masked;
  }

  /**
   * Check if a value is a masked credential (contains bullet points)
   * Masked values should not be encrypted as they're just placeholders
   */
  private isMaskedCredential(value: any): boolean {
    if (typeof value !== 'string') return false;
    return value.includes('•');
  }

  /**
   * Validate Stripe credentials format
   */
  private validateStripeCredentials(data: any, gateway: string) {
    if (gateway !== 'stripe') return;

    // Validate API Key format for Stripe
    if (data.apiKey && typeof data.apiKey === 'string' && data.apiKey.trim()) {
      const trimmed = data.apiKey.trim();
      // Check if it's a publishable key (wrong type)
      if (trimmed.startsWith('pk_test_') || trimmed.startsWith('pk_live_')) {
        throw new Error(
          'Invalid Stripe API Key: You entered a PUBLISHABLE key (pk_test_ or pk_live_). ' +
          'Stripe requires a SECRET key (sk_test_ or sk_live_) for server-side operations. ' +
          'Please use your Stripe Secret Key from Dashboard → Developers → API keys → Secret key.'
        );
      }
      // Check if it's a valid secret key format
      if (!trimmed.startsWith('sk_test_') && !trimmed.startsWith('sk_live_')) {
        throw new Error(
          'Invalid Stripe API Key format: The API Key must start with "sk_test_" (test mode) or "sk_live_" (live mode). ' +
          'Please check your Stripe Secret Key from Dashboard → Developers → API keys.'
        );
      }
    }

    // Validate Webhook Secret format for Stripe
    if (data.webhookSecret && typeof data.webhookSecret === 'string' && data.webhookSecret.trim()) {
      const trimmed = data.webhookSecret.trim();
      if (!trimmed.startsWith('whsec_')) {
        throw new Error(
          'Invalid Stripe Webhook Secret format: The Webhook Secret must start with "whsec_". ' +
          'You can find it in Stripe Dashboard → Developers → Webhooks → [Your Webhook] → Signing secret.'
        );
      }
    }
  }

  /**
   * Encrypt sensitive fields before saving to database
   * Handles empty strings by converting them to null
   * Only updates fields that are explicitly provided
   * Skips masked values (they're placeholders from the frontend)
   */
  private encryptSensitiveFields(data: any, existing?: any) {
    const result: any = { ...data };

    // Validate Stripe credentials if gateway is Stripe
    if (data.gateway || (existing && existing.gateway)) {
      this.validateStripeCredentials(data, data.gateway || existing.gateway);
    }

    // Handle apiKey: empty string or null = null, masked = skip, otherwise encrypt
    if (data.apiKey !== undefined) {
      // If it's a masked value, don't update (preserve existing)
      if (this.isMaskedCredential(data.apiKey)) {
        if (existing && existing.apiKey) {
          result.apiKey = existing.apiKey;
        } else {
          delete result.apiKey; // Don't update if no existing value
        }
      } else {
        const trimmed = typeof data.apiKey === 'string' ? data.apiKey.trim() : data.apiKey;
        result.apiKey = trimmed && trimmed.length > 0 ? encrypt(trimmed) : null;
      }
    } else if (existing && existing.apiKey) {
      // Preserve existing value if not provided
      result.apiKey = existing.apiKey;
    }

    // Handle apiSecret
    if (data.apiSecret !== undefined) {
      if (this.isMaskedCredential(data.apiSecret)) {
        if (existing && existing.apiSecret) {
          result.apiSecret = existing.apiSecret;
        } else {
          delete result.apiSecret;
        }
      } else {
        const trimmed = typeof data.apiSecret === 'string' ? data.apiSecret.trim() : data.apiSecret;
        result.apiSecret = trimmed && trimmed.length > 0 ? encrypt(trimmed) : null;
      }
    } else if (existing && existing.apiSecret) {
      result.apiSecret = existing.apiSecret;
    }

    // Handle merchantId
    if (data.merchantId !== undefined) {
      if (this.isMaskedCredential(data.merchantId)) {
        if (existing && existing.merchantId) {
          result.merchantId = existing.merchantId;
        } else {
          delete result.merchantId;
        }
      } else {
        const trimmed = typeof data.merchantId === 'string' ? data.merchantId.trim() : data.merchantId;
        result.merchantId = trimmed && trimmed.length > 0 ? encrypt(trimmed) : null;
      }
    } else if (existing && existing.merchantId) {
      result.merchantId = existing.merchantId;
    }

    // Handle webhookSecret
    if (data.webhookSecret !== undefined) {
      if (this.isMaskedCredential(data.webhookSecret)) {
        if (existing && existing.webhookSecret) {
          result.webhookSecret = existing.webhookSecret;
        } else {
          delete result.webhookSecret;
        }
      } else {
        const trimmed = typeof data.webhookSecret === 'string' ? data.webhookSecret.trim() : data.webhookSecret;
        result.webhookSecret = trimmed && trimmed.length > 0 ? encrypt(trimmed) : null;
      }
    } else if (existing && existing.webhookSecret) {
      result.webhookSecret = existing.webhookSecret;
    }

    return result;
  }

  // ================================
  // CREATE
  // ================================
  async create(data: CreatePaymentMethodInput) {
    // Check if payment method with same name already exists
    const existing = await db.paymentMethod.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      throw new Error('Payment method with this name already exists');
    }

    // Encrypt sensitive fields
    const encryptedData = this.encryptSensitiveFields(data);

    const paymentMethod = await db.paymentMethod.create({
      data: encryptedData,
    });

    // Invalidate cache
    await this.invalidateCache();

    // Return masked version for API response
    return this.maskSensitiveFields(paymentMethod);
  }

  // ================================
  // READ
  // ================================
  async findById(id: number, maskSecrets: boolean = true) {
    const cacheKey = `${this.CACHE_PREFIX}${id}`;

    // Try to get from cache (but don't cache masked versions)
    if (!maskSecrets) {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const paymentMethod = await db.paymentMethod.findUnique({
      where: { id },
    });

    if (!paymentMethod) {
      throw new Error('Payment method not found');
    }

    // Mask secrets for API responses
    const result = maskSecrets ? this.maskSensitiveFields(paymentMethod) : paymentMethod;

    // Cache the unmasked version (internal use only)
    if (!maskSecrets) {
      await cacheService.set(cacheKey, paymentMethod, this.CACHE_TTL);
    }

    return result;
  }

  async findMany(query: PaymentMethodQueryInput, maskSecrets: boolean = true) {
    const { page, limit, search, gateway, isActive, sortBy, sortOrder } = query;

    // Build where clause
    const where: Prisma.PaymentMethodWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { gateway: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (gateway) {
      where.gateway = { contains: gateway, mode: 'insensitive' };
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    // Count total records
    const total = await db.paymentMethod.count({ where });

    // Fetch paginated data
    const paymentMethods = await db.paymentMethod.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Mask secrets in responses
    const maskedData = maskSecrets
      ? paymentMethods.map((pm) => this.maskSensitiveFields(pm))
      : paymentMethods;

    return {
      data: maskedData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findAll() {
    const cacheKey = `${this.CACHE_PREFIX}all`;

    // Try to get from cache
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const paymentMethods = await db.paymentMethod.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        gateway: true,
        thumbnail: true,
        isActive: true,
        minAmount: true,
        currencies: true,
        bonus: true,
        bonusThreshold: true,
        feeType: true,
        feeValue: true,
        testMode: true,
        meta: true,
      },
      orderBy: { name: 'asc' },
    });

    // Cache the result
    await cacheService.set(cacheKey, paymentMethods, this.CACHE_TTL);

    return paymentMethods;
  }

  // ================================
  // UPDATE
  // ================================
  async update(id: number, data: UpdatePaymentMethodInput) {
    // Check if payment method exists
    const existing = await db.paymentMethod.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error('Payment method not found');
    }

    // Check if name is being updated and if it already exists
    if (data.name && data.name !== existing.name) {
      const duplicate = await db.paymentMethod.findUnique({
        where: { name: data.name },
      });

      if (duplicate) {
        throw new Error('Payment method with this name already exists');
      }
    }

    // Encrypt sensitive fields if provided, preserving existing values if not provided
    const encryptedData = this.encryptSensitiveFields(data, existing);

    const paymentMethod = await db.paymentMethod.update({
      where: { id },
      data: encryptedData,
    });

    // Invalidate cache
    await this.invalidateCache();

    // Return masked version for API response
    return this.maskSensitiveFields(paymentMethod);
  }

  // ================================
  // DELETE
  // ================================
  async delete(id: number, force: boolean = false) {
    // Check if payment method exists
    const existing = await db.paymentMethod.findUnique({
      where: { id },
      include: {
        _count: {
          select: { payments: true },
        },
      },
    });

    if (!existing) {
      throw new AppError('Payment method not found', 404);
    }

    // Check if payment method is being used in payments
    if (existing._count.payments > 0 && !force) {
      throw new AppError(
        `Cannot delete payment method. It is used in ${existing._count.payments} payment(s). Consider deactivating it instead, or use force=true to delete anyway.`,
        400
      );
    }

    // If force delete and has payments, log a warning
    if (existing._count.payments > 0 && force) {
      console.warn(
        `⚠️ Force deleting payment method ${id} (${existing.name}) that is used in ${existing._count.payments} payment(s). This may affect payment history records.`
      );
    }

    await db.paymentMethod.delete({
      where: { id },
    });

    // Invalidate cache
    await this.invalidateCache();

    return { 
      message: force && existing._count.payments > 0
        ? `Payment method deleted successfully (force deleted - was used in ${existing._count.payments} payment(s))`
        : 'Payment method deleted successfully'
    };
  }

  // ================================
  // HELPER METHODS
  // ================================
  
  /**
   * Test NOWPayments API configuration
   * Validates the API key and webhook secret without requiring a payment
   */
  async testNOWPaymentsConnection(paymentMethodId: number) {
    // Fetch payment method from database
    const paymentMethod = await db.paymentMethod.findUnique({
      where: { id: paymentMethodId }
    })

    if (!paymentMethod) {
      throw new Error(`Payment method not found: ${paymentMethodId}`)
    }

    if (paymentMethod.gateway !== 'nowpayments') {
      throw new Error(`Payment method is not a NOWPayments method`)
    }

    // Decrypt credentials
    let apiKey: string | null = null
    let apiSecret: string | null = null

    try {
      if (paymentMethod.apiKey) {
        apiKey = decrypt(paymentMethod.apiKey)
      }
    } catch (error) {
      return {
        success: false,
        error: 'Failed to decrypt API key. The credentials may be corrupted.',
        details: {
          paymentMethodId,
          gateway: paymentMethod.gateway,
          testMode: paymentMethod.testMode,
        }
      }
    }

    try {
      if (paymentMethod.apiSecret) {
        apiSecret = decrypt(paymentMethod.apiSecret)
      }
    } catch (error) {
      return {
        success: false,
        error: 'Failed to decrypt API secret (webhook secret). The credentials may be corrupted.',
        details: {
          paymentMethodId,
          gateway: paymentMethod.gateway,
          testMode: paymentMethod.testMode,
        }
      }
    }

    if (!apiKey || !apiSecret) {
      return {
        success: false,
        error: 'Missing API key or API secret (webhook secret)',
        details: {
          paymentMethodId,
          gateway: paymentMethod.gateway,
          testMode: paymentMethod.testMode,
          hasApiKey: !!apiKey,
          hasApiSecret: !!apiSecret,
        }
      }
    }

    // Test the connection using a simple API call
    try {
      const axios = await import('axios')
      const client = axios.default.create({
        baseURL: paymentMethod.testMode
          ? 'https://api-sandbox.nowpayments.io/v1'
          : 'https://api.nowpayments.io/v1',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      })

      // Try to get available currencies as a simple test
      const response = await client.get('/currencies')

      return {
        success: true,
        message: 'NOWPayments API connection successful',
        details: {
          paymentMethodId,
          gateway: paymentMethod.gateway,
          testMode: paymentMethod.testMode,
          apiKeyLength: apiKey.length,
          apiKeyPrefix: apiKey.substring(0, 10) + '...',
          apiKeyType: apiKey.startsWith('tsk_') ? 'Sandbox (tsk_)' : apiKey.startsWith('psk_') ? 'Production (psk_)' : 'Unknown',
          modeMatch: this.checkModeMatch(apiKey, paymentMethod.testMode),
          availableCurrencies: response.data?.currencies?.length || 0,
        }
      }
    } catch (error: any) {
      const statusCode = error.response?.status
      const errorData = error.response?.data

      return {
        success: false,
        error: 'Failed to connect to NOWPayments API',
        details: {
          paymentMethodId,
          gateway: paymentMethod.gateway,
          testMode: paymentMethod.testMode,
          apiKeyLength: apiKey.length,
          apiKeyPrefix: apiKey.substring(0, 10) + '...',
          apiKeyType: apiKey.startsWith('tsk_') ? 'Sandbox (tsk_)' : apiKey.startsWith('psk_') ? 'Production (psk_)' : 'Unknown',
          modeMatch: this.checkModeMatch(apiKey, paymentMethod.testMode),
          statusCode,
          errorCode: errorData?.code,
          errorMessage: errorData?.message || error.message,
          diagnosticHint: this.getDiagnosticHint(statusCode, errorData, apiKey, paymentMethod.testMode),
        }
      }
    }
  }

  /**
   * Check if API key type matches test mode
   */
  private checkModeMatch(apiKey: string, testMode: boolean): boolean {
    const isTestKey = apiKey.startsWith('tsk_')
    const isProdKey = apiKey.startsWith('psk_')

    if (isTestKey && testMode) return true
    if (isProdKey && !testMode) return true
    return false
  }

  /**
   * Get diagnostic hint based on error
   */
  private getDiagnosticHint(
    statusCode: number | undefined,
    errorData: any,
    apiKey: string,
    testMode: boolean
  ): string {
    if (statusCode === 403 || errorData?.code === 'INVALID_API_KEY') {
      if (!this.checkModeMatch(apiKey, testMode)) {
        return `API key type mismatch. Key starts with '${apiKey.substring(0, 4)}' but testMode is ${testMode}. Use 'tsk_' keys with testMode=true and 'psk_' keys with testMode=false.`
      }
      return 'API key is invalid or has been revoked. Try generating a new API key from NOWPayments dashboard.'
    }

    if (statusCode === 401) {
      return 'Authentication failed. Check your API key format and ensure it\'s correctly configured.'
    }

    if (!statusCode) {
      return 'Connection failed. Check your internet connection and NOWPayments API status.'
    }

    return 'An unexpected error occurred. Check the error message above for details.'
  }

  private async invalidateCache() {
    await cacheService.clearPattern(`${this.CACHE_PREFIX}*`);
  }
}
