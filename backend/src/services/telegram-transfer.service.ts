import type { TelegramTransferStatus } from '@prisma/client';
import db from '../configs/db';
import { sendEmail } from '../libs/email';
import type {
  CreateOwnershipTransfer,
  ManualCompleteOwnershipTransfer,
  RetryOwnershipTransfer,
  TelegramOwnershipTransferQuery,
  UpdateOwnershipTransfer,
} from '../validations/zod/telegram-transfer.schema';
import { telegramTransferBotService } from './telegram-transfer-bot.service';
import { auditLogService } from './audit-log.service';
import { telegramScreenshotService } from './telegram/screenshot.service';
import { isTelegramTransferProduct } from '../utils/product-type';

const DEFAULT_BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || '@uhqaccountsbot';

/**
 * TelegramTransferService
 *
 * Manages the complete lifecycle of Telegram group/channel ownership transfers:
 * - Creating transfer records from orders
 * - Customer verification (join check)
 * - Status management and updates
 * - Retry logic for failed transfers
 * - Admin manual interventions
 * - Proof generation and tracking
 */
export class TelegramTransferService {
  private async ensureTransferProof(transfer: {
    id: number;
    status: TelegramTransferStatus;
    targetUrl: string;
    customerTelegram: string;
    transferProofUrl?: string | null;
  }) {
    if (transfer.status !== 'COMPLETED' || transfer.transferProofUrl) {
      return transfer.transferProofUrl || null;
    }

    try {
      const proofResult = await telegramScreenshotService.generateTransferProof(
        transfer.id,
        transfer.targetUrl,
        transfer.customerTelegram
      );

      if (proofResult.success && proofResult.publicUrl) {
        return proofResult.publicUrl;
      }
    } catch (error) {
      console.error(`Failed to generate proof for transfer ${transfer.id}:`, error);
    }

    return null;
  }

  // ================================
  // CORE TRANSFER OPERATIONS
  // ================================

  /**
   * Create a new transfer record from order
   * Called automatically when order with transfer product is completed
   */
  async createTransfer(data: CreateOwnershipTransfer) {
    // Validate order exists and is for a transfer product
    const order = await db.order.findUnique({
      where: { id: data.orderId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            platform: true,
            type: true,
            telegramUrl: true,
            meta: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
          },
        },
      },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    if (!isTelegramTransferProduct(order.product)) {
      throw new Error('Order is not for a Telegram transfer product');
    }

    if (!order.product.telegramUrl) {
      throw new Error('Product does not have a Telegram URL');
    }

    // Check if transfer already exists
    const existing = await db.telegramTransfer.findUnique({
      where: { orderId: data.orderId },
    });

    if (existing) {
      throw new Error(`Transfer already exists for order ${data.orderId}`);
    }

    // Extract transfer metadata from product
    const productMeta = order.product.meta as any;
    const transferType = data.transferType || productMeta?.transferType || 'group';

    // Create transfer record
    const transfer = await db.telegramTransfer.create({
      data: {
        orderId: data.orderId,
        targetUrl: data.targetUrl,
        transferType,
        customerTelegram: data.customerTelegram,
        status: 'PENDING',
        meta: {
          ...data.meta,
          productId: order.product.id,
          productName: order.product.name,
          orderNumber: order.orderNumber,
          createdFrom: 'order_processing',
        },
      },
    });

    return transfer;
  }

  /**
   * Get transfer by ID with related data
   */
  async findById(id: number) {
    const transfer = await db.telegramTransfer.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                telegramUrl: true,
                meta: true,
              },
            },
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
              },
            },
          },
        },
      },
    });

    if (!transfer) {
      throw new Error('Transfer not found');
    }

    return transfer;
  }

  /**
   * Get transfer by order ID
   */
  async findByOrderId(orderId: number) {
    const transfer = await db.telegramTransfer.findUnique({
      where: { orderId },
      include: {
        order: {
          include: {
            product: true,
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
              },
            },
          },
        },
      },
    });

    return transfer;
  }

  /**
   * Get transfers by order IDs
   */
  async findByOrderIds(orderIds: number[]) {
    const transfers = await db.telegramTransfer.findMany({
      where: {
        orderId: { in: orderIds },
      },
      include: {
        order: {
          include: {
            product: true,
            user: true,
          },
        },
      },
    });

    return transfers;
  }

  /**
   * Get transfer by order item ID (DEPRECATED - use findByOrderId)
   * @deprecated Use findByOrderId instead
   */
  async findByOrderItemId(orderItemId: number) {
    // This method is kept for backward compatibility
    // In the new schema, orderItemId is actually orderId
    return this.findByOrderId(orderItemId);
  }

  /**
   * Get transfers by order item IDs (DEPRECATED - use findByOrderIds)
   * @deprecated Use findByOrderIds instead
   */
  async findByOrderItemIds(orderItemIds: number[]) {
    // This method is kept for backward compatibility
    // In the new schema, orderItemIds are actually orderIds
    return this.findByOrderIds(orderItemIds);
  }

  /**
   * Query transfers with filters and pagination
   */
  async findMany(query: TelegramOwnershipTransferQuery) {
    const {
      page = 1,
      limit = 20,
      status,
      transferType,
      customerTelegram,
      joinVerified,
      search,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;
    const where: any = {};

    // Status filter (supports multiple statuses)
    if (status) {
      if (Array.isArray(status)) {
        where.status = { in: status };
      } else {
        where.status = status;
      }
    }

    // Transfer type filter
    if (transferType) {
      where.transferType = transferType;
    }

    // Customer Telegram filter
    if (customerTelegram) {
      where.customerTelegram = { contains: customerTelegram, mode: 'insensitive' };
    }

    // Join verified filter
    if (joinVerified !== undefined) {
      where.joinVerified = joinVerified;
    }

    // Search filter (search in targetUrl, customerTelegram, order number)
    if (search) {
      where.OR = [
        { targetUrl: { contains: search, mode: 'insensitive' } },
        { customerTelegram: { contains: search, mode: 'insensitive' } },
        {
          orderItem: {
            order: {
              orderNumber: { contains: search, mode: 'insensitive' },
            },
          },
        },
      ];
    }

    // Date range filter
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    // Execute queries in parallel
    const [transfers, total] = await Promise.all([
      db.telegramTransfer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          customerTelegram: true,
          proofData: true,
          transferProofUrl: true,
          id: true,
          createdAt: true,
          status: true,
          targetUrl: true,
          transferType: true,
          order: {
            select: {
              customerName: true,
              guestEmail: true,
              user: {
                select: {
                  firstName: true,
                  telegramUsername: true,
                  email: true,
                },
              },
            },
          },
        },
      }),
      db.telegramTransfer.count({ where }),
    ]);

    await Promise.all(
      transfers.map(async (transfer) => {
        const proofUrl = await this.ensureTransferProof(transfer as any);
        if (proofUrl && !transfer.transferProofUrl) {
          (transfer as any).transferProofUrl = proofUrl;
          (transfer as any).proofData = proofUrl;
        }
      })
    );

    return {
      data: transfers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ================================
  // STATUS MANAGEMENT
  // ================================

  /**
   * Update transfer status with automatic tracking
   */
  async updateStatus(
    id: number,
    status: TelegramTransferStatus,
    metadata?: {
      failureReason?: string;
      adminNotes?: string;
      verifiedBy?: string;
    }
  ) {
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    // Track timestamps based on status
    switch (status) {
      case 'VERIFICATION_REQUIRED':
        // Initial status after order completion
        break;

      case 'CUSTOMER_JOINED':
        updateData.joinVerified = true;
        updateData.joinVerifiedAt = new Date();
        break;

      case 'TRANSFER_IN_PROGRESS':
        updateData.transferStartedAt = new Date();
        break;

      case 'WAITING_PERIOD':
        // 7-day waiting period started
        break;

      case 'COMPLETING':
        // Final ownership transfer in progress
        break;

      case 'COMPLETED':
        updateData.transferCompletedAt = new Date();
        updateData.completedAt = new Date();
        // Log transfer completion to audit log
        auditLogService.logTransferExecution(id, 'COMPLETED').catch(() => {
          // Ignore audit log errors
        });
        break;

      case 'FAILED':
        updateData.failureReason = metadata?.failureReason || 'Transfer failed';
        break;
    }

    // Add optional metadata
    if (metadata?.adminNotes) {
      updateData.adminNotes = metadata.adminNotes;
    }
    if (metadata?.verifiedBy) {
      updateData.verifiedBy = metadata.verifiedBy;
    }

    const transfer = await db.telegramTransfer.update({
      where: { id },
      data: updateData,
    });

    return transfer;
  }

  /**
   * Update transfer with custom data
   */
  async update(id: number, data: UpdateOwnershipTransfer) {
    const transfer = await db.telegramTransfer.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    return transfer;
  }

  private async ensureBotAdminConfigured(transfer: any) {
    const productMeta = (transfer.order.product.meta as Record<string, any> | null) ?? {};
    const chatIdentifier = transfer.order.product.telegramUrl || transfer.targetUrl;

    if (!chatIdentifier) {
      throw new Error('Transfer product is missing Telegram URL');
    }

    const botStatus = await telegramTransferBotService.verifyBotIsAdmin(chatIdentifier);

    if (!botStatus.success || !botStatus.isAdmin || !botStatus.canPromote) {
      throw new Error(
        botStatus.error ||
          'Transfer bot is not an admin with promotion permissions in this group/channel'
      );
    }

    if (!productMeta.botAdded) {
      await db.product.update({
        where: { id: transfer.order.product.id },
        data: {
          meta: {
            ...productMeta,
            botAdded: true,
          },
        },
      });
    }

    transfer.order.product.meta = {
      ...productMeta,
      botAdded: true,
    };
  }

  // ================================
  // VERIFICATION & VALIDATION
  // ================================

  /**
   * Verify customer has joined the target group/channel
   * This calls the Python microservice to check membership
   */
  async verifyCustomerJoined(id: number) {
    const transfer = await this.findById(id);
    console.log('transfer', transfer);

    if (transfer.status !== 'VERIFICATION_REQUIRED' && transfer.status !== 'PENDING') {
      throw new Error('Transfer is not in verification stage');
    }

    await this.ensureBotAdminConfigured(transfer);

    // Get customer user_id from meta or fetch from Prisma
    const transferMeta = transfer.meta as any;
    let customerUserId = transferMeta?.customerUserId;
    console.log('customer user id', customerUserId);

    // If no user_id stored, try to get it from Prisma CustomerTelegramData
    if (!customerUserId) {
      try {
        let customerData = null;

        // Prepare search conditions based on customerTelegram format
        if (transfer.customerTelegram) {
          const searchValue = transfer.customerTelegram;
          const whereConditions: any[] = [];

          // If it starts with @, search by username
          if (searchValue.startsWith('@')) {
            whereConditions.push({ username: searchValue.replace('@', '') });
          }
          // If it starts with + or is numeric, search by phone number
          else if (searchValue.startsWith('+') || /^\d+$/.test(searchValue)) {
            // Try with and without + prefix
            whereConditions.push({ phoneNumber: searchValue });
            whereConditions.push({ phoneNumber: searchValue.replace('+', '') });
            whereConditions.push({ phoneNumber: `+${searchValue.replace('+', '')}` });
          }
          // If none of above, try both username and phone
          else {
            whereConditions.push({ username: searchValue });
            whereConditions.push({ phoneNumber: searchValue });
          }

          console.log('[Verify Join] Searching for customer with conditions:', whereConditions);

          customerData = await db.customerTelegramData.findFirst({
            where: {
              OR: whereConditions,
            },
          });

          // If not found, let's check what customers exist in the database
          if (!customerData) {
            const allCustomers = await db.customerTelegramData.findMany({
              select: {
                userId: true,
                phoneNumber: true,
                username: true,
                firstName: true,
              },
              take: 10,
            });
            console.log('[Verify Join] Recent customers in database:', allCustomers);
          }
        }

        console.log('Customer data from Prisma:', customerData);

        if (customerData) {
          customerUserId = Number(customerData.userId);

          // Store user_id in transfer meta for future use
          await db.telegramTransfer.update({
            where: { id },
            data: {
              meta: {
                ...transferMeta,
                customerUserId,
              },
            },
          });
        } else {
          console.error('No customer found in database');
          console.error('Customer Telegram value:', transfer.customerTelegram);
        }
      } catch (error) {
        console.error('Failed to fetch customer data from Prisma:', error);
      }
    }

    if (!customerUserId) {
      // Provide more helpful error message based on input format
      const isPhone =
        transfer.customerTelegram.startsWith('+') || /^\d+$/.test(transfer.customerTelegram);

      if (isPhone) {
        throw new Error(
          `Customer with phone ${transfer.customerTelegram} has not shared their contact yet. ` +
            `Please ask the customer to:\n\n` +
            `1. Open ${DEFAULT_BOT_USERNAME} on Telegram\n` +
            `2. Send /start command (with the slash)\n` +
            `3. Click the "📱 Share My Contact" button\n` +
            `4. This will register their phone number for verification\n\n` +
            `⚠️ Important: The customer must share their contact using the button that appears after /start. ` +
            `The phone number must match ${transfer.customerTelegram} used during purchase.`
        );
      } else {
        throw new Error(
          `Customer ${transfer.customerTelegram} has not messaged the bot yet. ` +
            `Please ask the customer to open ${DEFAULT_BOT_USERNAME} and click START`
        );
      }
    }

    // Call Telegraf bot service to verify membership
    try {
      const result = await telegramTransferBotService.verifyCustomerJoined(
        transfer.targetUrl,
        customerUserId
      );

      console.log('Verify membership result:', result);

      if (!result.success || !result.isMember) {
        throw new Error(result.error || 'Customer has not joined the group/channel yet');
      }

      // Update transfer status to CUSTOMER_JOINED and send notification
      await this.updateStatusWithNotification(id, 'CUSTOMER_JOINED', {
        adminNotes: `Customer membership verified at ${new Date().toISOString()}. Status: ${result.status}`,
        verifiedBy: 'telegraf_bot_service',
      });

      // ✅ AUTO-EXECUTE: Immediately execute transfer after verification
      console.log(`🚀 Auto-executing transfer ${id} after successful verification`);

      try {
        const executedTransfer = await this.executeTransfer(id);
        console.log(`✅ Transfer ${id} auto-executed successfully`);
        return executedTransfer;
      } catch (executeError) {
        console.error(`⚠️ Auto-execution failed for transfer ${id}:`, executeError);
        // Don't throw - verification was successful, just log the execution failure
        // Admin can manually execute later
        return await this.findById(id);
      }
    } catch (error) {
      console.error('Error verifying customer joined:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to verify customer membership'
      );
    }
  }

  /**
   * Get proof URL for completed transfer
   */
  async getProofUrl(id: number) {
    const transfer = await this.findById(id);

    if (transfer.status !== 'COMPLETED') {
      throw new Error('Transfer is not completed yet');
    }

    if (!transfer.transferProofUrl) {
      throw new Error('Proof screenshot not available');
    }

    return {
      proofUrl: transfer.transferProofUrl,
      completedAt: transfer.completedAt,
    };
  }

  /**
   * Execute ownership transfer (promote customer to admin)
   * This calls the Python microservice to execute the transfer
   * Should be called after customer verification is complete
   */
  async executeTransfer(id: number) {
    const transfer = await this.findById(id);

    if (transfer.status !== 'CUSTOMER_JOINED') {
      throw new Error(
        'Transfer must be in CUSTOMER_JOINED status. Current status: ' + transfer.status
      );
    }

    await this.ensureBotAdminConfigured(transfer);

    // Get customer user_id from meta
    const transferMeta = transfer.meta as any;
    const customerUserId = transferMeta?.customerUserId;

    if (!customerUserId) {
      throw new Error('Customer user ID not found. Customer must message the bot first.');
    }

    // Call Telegraf bot service to execute transfer
    try {
      const membershipState = await telegramTransferBotService.verifyCustomerJoined(
        transfer.targetUrl,
        customerUserId
      );

      if (membershipState.success && membershipState.isMember) {
        if (membershipState.status === 'creator') {
          return await this.updateStatusWithNotification(id, 'COMPLETED', {
            adminNotes:
              'Customer is already the creator/owner of the group/channel. Marking transfer as completed.',
            verifiedBy: 'telegraf_bot_service',
          });
        }

        if (membershipState.status === 'administrator') {
          return await this.updateStatusWithNotification(id, 'WAITING_PERIOD', {
            adminNotes:
              'Customer is already an administrator in the group/channel. Starting waiting period without re-promoting.',
            verifiedBy: 'telegraf_bot_service',
          });
        }
      }

      // Update status to in-progress with notification
      await this.updateStatusWithNotification(id, 'TRANSFER_IN_PROGRESS', {
        adminNotes: `Transfer execution started at ${new Date().toISOString()}`,
      });

      const result = await telegramTransferBotService.promoteToAdmin(
        transfer.targetUrl,
        customerUserId,
        transfer.transferType as 'group' | 'channel'
      );

      console.log('Promotion result:', result);

      if (!result.success || !result.promoted) {
        // Mark as failed with notification
        await this.updateStatusWithNotification(id, 'FAILED', {
          failureReason: result.error || 'Failed to promote customer',
          adminNotes: `Transfer execution failed: ${result.error}`,
        });
        throw new Error(result.error || 'Failed to execute transfer');
      }

      // Transfer executed successfully - customer is now admin
      // Log transfer execution to audit log
      auditLogService.logTransferExecution(id, 'WAITING_PERIOD').catch(() => {
        // Ignore audit log errors
      });

      // Move to WAITING_PERIOD (7 days before ownership can be transferred)
      return await this.updateStatusWithNotification(id, 'WAITING_PERIOD', {
        adminNotes: `Customer promoted to admin with full permissions. Chat ID: ${result.chatId || 'N/A'}`,
      });
    } catch (error) {
      console.error('Error executing transfer:', error);

      // Update to failed status with notification
      await this.updateStatusWithNotification(id, 'FAILED', {
        failureReason: error instanceof Error ? error.message : 'Unknown error',
        adminNotes: `Transfer execution error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });

      throw new Error(
        error instanceof Error ? error.message : 'Failed to execute ownership transfer'
      );
    }
  }

  // ================================
  // RETRY & ERROR HANDLING
  // ================================

  /**
   * Retry failed transfer
   */
  async retryTransfer(id: number, data: RetryOwnershipTransfer) {
    const transfer = await this.findById(id);

    if (transfer.status !== 'FAILED') {
      throw new Error('Only failed transfers can be retried');
    }

    if (transfer.retryCount >= transfer.maxRetries) {
      throw new Error(
        `Maximum retry limit (${transfer.maxRetries}) reached. Use manual completion instead.`
      );
    }

    // Reset transfer to appropriate status with notification
    const newStatus: TelegramTransferStatus = transfer.joinVerified
      ? 'CUSTOMER_JOINED'
      : 'VERIFICATION_REQUIRED';

    const updated = await db.telegramTransfer.update({
      where: { id },
      data: {
        status: newStatus,
        retryCount: { increment: 1 },
        lastRetryAt: new Date(),
        failureReason: null,
        adminNotes: data.reason
          ? `Retry initiated: ${data.reason}${transfer.adminNotes ? '\n' + transfer.adminNotes : ''}`
          : transfer.adminNotes,
        meta: {
          ...(transfer.meta as any),
          lastRetryBy: data.adminUsername,
          lastRetryReason: data.reason,
        },
      },
    });

    // Send notification about retry (status reset)
    await this.sendTransferNotification(updated, newStatus);

    return updated;
  }

  /**
   * Get transfer details including retry history
   */
  async getTransferDetails(id: number) {
    const transfer = await this.findById(id);

    return {
      ...transfer,
      canRetry: transfer.status === 'FAILED' && transfer.retryCount < transfer.maxRetries,
      retryAttempts: transfer.retryCount,
      maxRetries: transfer.maxRetries,
      hasProof: !!transfer.transferProofUrl,
    };
  }

  // ================================
  // ADMIN OPERATIONS
  // ================================

  /**
   * Manually complete transfer (admin override)
   */
  async manualComplete(id: number, data: ManualCompleteOwnershipTransfer) {
    const transfer = await this.findById(id);

    if (transfer.status === 'COMPLETED') {
      throw new Error('Transfer is already completed');
    }

    const updated = await db.telegramTransfer.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        manualOverride: true,
        verifiedBy: data.adminUsername,
        transferProofUrl: data.proofUrl || transfer.transferProofUrl,
        completedAt: new Date(),
        transferCompletedAt: new Date(),
        adminNotes: data.notes
          ? `Manual completion: ${data.notes}${transfer.adminNotes ? '\n' + transfer.adminNotes : ''}`
          : transfer.adminNotes,
        meta: {
          ...(transfer.meta as any),
          manualCompletionBy: data.adminUsername,
          manualCompletionReason: data.notes,
          manualCompletionAt: new Date().toISOString(),
        },
      },
    });

    // Send completion notification to customer
    await this.sendTransferNotification(updated, 'COMPLETED');

    return updated;
  }

  /**
   * Get transfer statistics
   */
  async getStatistics() {
    const [total, pending, inProgress, completed, failed, avgCompletionTime] = await Promise.all([
      db.telegramTransfer.count(),
      db.telegramTransfer.count({
        where: { status: { in: ['PENDING', 'VERIFICATION_REQUIRED'] } },
      }),
      db.telegramTransfer.count({
        where: {
          status: {
            in: ['CUSTOMER_JOINED', 'TRANSFER_IN_PROGRESS', 'WAITING_PERIOD', 'COMPLETING'],
          },
        },
      }),
      db.telegramTransfer.count({ where: { status: 'COMPLETED' } }),
      db.telegramTransfer.count({ where: { status: 'FAILED' } }),
      this.calculateAverageCompletionTime(),
    ]);

    return {
      total,
      pending,
      inProgress,
      completed,
      failed,
      avgCompletionTime,
      successRate: total > 0 ? ((completed / total) * 100).toFixed(2) : 0,
    };
  }

  /**
   * Calculate average completion time for completed transfers
   */
  private async calculateAverageCompletionTime() {
    const completedTransfers = await db.telegramTransfer.findMany({
      where: {
        status: 'COMPLETED',
        completedAt: { not: null },
      },
      select: {
        createdAt: true,
        completedAt: true,
      },
    });

    if (completedTransfers.length === 0) return 0;

    const totalTime = completedTransfers.reduce((sum, transfer) => {
      if (!transfer.completedAt) return sum;
      const duration = transfer.completedAt.getTime() - transfer.createdAt.getTime();
      return sum + duration;
    }, 0);

    // Return average in hours
    return Math.round(totalTime / completedTransfers.length / (1000 * 60 * 60));
  }

  /**
   * Delete transfer record (admin only, use with caution)
   * Only allows deletion of FAILED or COMPLETED transfers
   */
  async deleteTransfer(id: number) {
    const transfer = await this.findById(id);

    if (!['FAILED', 'COMPLETED'].includes(transfer.status)) {
      return {
        success: false,
        message: 'Can only delete FAILED or COMPLETED transfers',
      };
    }

    await db.telegramTransfer.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Transfer deleted successfully',
    };
  }

  // ================================
  // NOTIFICATION SYSTEM
  // ================================

  /**
   * Send notification email based on transfer status
   */
  private async sendTransferNotification(transfer: any, status: TelegramTransferStatus) {
    try {
      // Get customer email
      const order = transfer.order;
      const customerEmail = order.user?.email || order.guestEmail;

      if (!customerEmail) {
        console.log('No customer email found for transfer notification');
        return;
      }

      const productName = order.product.name;
      const orderNumber = order.orderNumber;
      const targetUrl = transfer.targetUrl;

      let subject = '';
      let message = '';

      switch (status) {
        case 'VERIFICATION_REQUIRED':
          subject = '🔔 Action Required: Join Telegram Group/Channel';
          message = `Hello,

Your ownership transfer order has been received!

Order Number: ${orderNumber}
Product: ${productName}
Target: ${targetUrl}

📝 Next Steps:

Step 1: Register with our bot
1. Open @uhqaccountsbot on Telegram
2. Send /start command (with the slash)
3. Click the "📱 Share My Contact" button that appears
4. This registers your phone number (${transfer.customerTelegram}) for verification

Step 2: Join the group/channel
1. Join the Telegram group/channel using this link: ${targetUrl}
2. Make sure you're a member before proceeding

Step 3: Verify membership
1. Go to your order page
2. Click the "Verify Membership" button
3. Once verified, we'll proceed with the transfer automatically

⚠️ Important: You must share your contact with @uhqaccountsbot using the button. Simply sending /start is not enough - you need to share your phone number.

Need help? Contact our support team.

Best regards,
UHQ Accounts Team`;
          break;

        case 'CUSTOMER_JOINED':
          subject = '✅ Membership Verified - Transfer Starting';
          message = `Hello,

Great news! We've verified that you've joined the group/channel.

Order Number: ${orderNumber}
Product: ${productName}
Target: ${targetUrl}

🚀 What's Next:
We're now proceeding with the ownership transfer. You'll be promoted to admin with full permissions.

Expected completion: Within 24 hours

We'll send you another email once the transfer is complete.

Best regards,
UHQ Accounts Team`;
          break;

        case 'TRANSFER_IN_PROGRESS':
          subject = '⏳ Transfer In Progress';
          message = `Hello,

Your ownership transfer is now in progress.

Order Number: ${orderNumber}
Product: ${productName}
Target: ${targetUrl}

Current Status: Promoting you to admin with full permissions

This usually takes a few minutes. You'll receive a notification once complete.

Best regards,
UHQ Accounts Team`;
          break;

        case 'WAITING_PERIOD':
          subject = '⏰ Transfer Waiting Period Started';
          message = `Hello,

You've been successfully promoted to admin!

Order Number: ${orderNumber}
Product: ${productName}
Target: ${targetUrl}

🎉 What's Happened:
You now have full admin rights in the group/channel.

⏰ Waiting Period:
Telegram requires a 7-day waiting period before ownership can be fully transferred. This is a Telegram limitation.

📱 What You Can Do Now:
- Manage all group/channel settings
- Add/remove members
- Post messages
- And all other admin functions

After 7 days, you can complete the ownership transfer in Telegram settings.

Best regards,
UHQ Accounts Team`;
          break;

        case 'COMPLETED':
          subject = "🎉 Transfer Complete - You're Now the Owner!";
          message = `Hello,

Congratulations! Your ownership transfer is complete.

Order Number: ${orderNumber}
Product: ${productName}
Target: ${targetUrl}

✅ Transfer Status: COMPLETED
You are now the full owner of the group/channel!

What You Can Do:
- Full ownership control
- Transfer ownership to others (after 7 days)
- Delete the group/channel
- All admin functions

Thank you for choosing UHQ Accounts!

Need another transfer? Visit our website.

Best regards,
UHQ Accounts Team`;
          break;

        case 'FAILED':
          subject = '❌ Transfer Failed - Action Required';
          message = `Hello,

Unfortunately, your ownership transfer encountered an issue.

Order Number: ${orderNumber}
Product: ${productName}
Target: ${targetUrl}

Status: FAILED
Reason: ${transfer.failureReason || 'Unknown error occurred'}

What's Next:
1. Our team will retry the transfer automatically
2. If the issue persists, we'll contact you directly
3. You can also contact our support team for immediate assistance

We apologize for the inconvenience and are working to resolve this.

Best regards,
UHQ Accounts Team`;
          break;

        default:
          return; // Don't send email for other statuses
      }

      await sendEmail(customerEmail, message, subject);
      console.log(`Transfer notification sent: ${status} to ${customerEmail}`);
    } catch (error) {
      console.error('Error sending transfer notification:', error);
      // Don't throw error - notification failure shouldn't break the transfer process
    }
  }

  /**
   * Update status with automatic notification
   */
  async updateStatusWithNotification(
    id: number,
    status: TelegramTransferStatus,
    metadata?: {
      failureReason?: string;
      adminNotes?: string;
      verifiedBy?: string;
    }
  ) {
    // Update status first
    const transfer = await this.updateStatus(id, status, metadata);

    if (status === 'COMPLETED') {
      await this.ensureTransferProof({
        id: transfer.id,
        status: transfer.status,
        targetUrl: transfer.targetUrl,
        customerTelegram: transfer.customerTelegram,
        transferProofUrl: transfer.transferProofUrl,
      });
    }

    // Send email notification
    const fullTransfer = await this.findById(id);
    await this.sendTransferNotification(fullTransfer, status);

    // Send Telegram bot notification for transfer status changes
    try {
      const order = fullTransfer.order;
      const { telegramNotificationService } = await import('./telegram-notification.service');
      await telegramNotificationService.sendTransferNotification({
        orderId: order.id,
        transferId: id,
        orderNumber: order.orderNumber,
        productName: order.product?.name,
        customerEmail: order.user?.email || order.guestEmail || undefined,
        targetUrl: fullTransfer.targetUrl,
        customerTelegram: fullTransfer.customerTelegram,
        status,
        customerName: order.user?.firstName || undefined,
        error: metadata?.failureReason || fullTransfer.failureReason || undefined,
      });
    } catch (error) {
      console.error('Failed to send Telegram transfer notification:', error);
      // Don't fail the status update if notification fails
    }

    return transfer;
  }
}
