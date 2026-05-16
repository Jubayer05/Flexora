import type { BalanceTransactionType } from '@prisma/client';
import { Prisma } from '@prisma/client';
import db from '../configs/db';
import { sendEmail } from '../libs/email';
import { decrypt } from '../utils/encryption';
import { PayGateProviderService } from './paygate-provider.service';
import { PayGateGatewayService } from './payment-gateways/paygate.gateway';
import { PaymentService } from './payment.service';
import { SettingService } from './setting.services';


interface TransactionOptions {
  reference?: string;
  orderId?: number;
  createdBy?: string;
  meta?: Record<string, any>;
}

interface PayGatePendingMeta {
  ipnToken: string;
  addressIn: string;
  addressInEncrypted?: string;
  method: string;
  amountCoin: number;
  expiresAt: string;
  providerCode?: string;
  providerName?: string;
  providerType?: string;
}

export class BalanceService {
  private settingService = new SettingService();
  private payGateProviderService = new PayGateProviderService();
  private paymentService: PaymentService | null = null;

  private getPaymentService() {
    if (!this.paymentService) {
      this.paymentService = new PaymentService();
    }

    return this.paymentService;
  }
  // ================================
  // CORE BALANCE OPERATIONS
  // ================================

  /**
   * Add balance to user account
   * @param userId - User ID
   * @param amount - Amount to add (must be positive)
   * @param description - Transaction description
   * @param options - Additional options (reference, createdBy, meta)
   */
  async addBalance(
    userId: number,
    amount: number,
    type: BalanceTransactionType,
    description: string,
    options: TransactionOptions = {}
  ) {
    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    return await db.$transaction(async (tx) => {
      // Get current user balance with lock
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { balance: true, email: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      const balanceBefore = Number(user.balance);
      const balanceAfter = balanceBefore + amount;

      // Update user balance
      await tx.user.update({
        where: { id: userId },
        data: { balance: balanceAfter },
      });

      // Create transaction record
      const transaction = await tx.balanceTransaction.create({
        data: {
          userId,
          type,
          amount,
          balanceBefore,
          balanceAfter,
          reference: options.reference,
          description,
          createdBy: options.createdBy,
          meta: options.meta,
        },
      });


      return {
        success: true,
        transaction,
        balanceBefore,
        balanceAfter,
      };
    });
  }

  /**
   * Deduct balance from user account
   * @param userId - User ID
   * @param amount - Amount to deduct (must be positive)
   * @param description - Transaction description
   * @param options - Additional options (reference, createdBy, meta)
   */
  async deductBalance(
    userId: number,
    amount: number,
    type: BalanceTransactionType,
    description: string,
    options: TransactionOptions = {}
  ) {
    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    return await db.$transaction(async (tx) => {
      // Get current user balance with lock
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { balance: true, email: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      const balanceBefore = Number(user.balance);
      const balanceAfter = balanceBefore - amount;

      // Validate sufficient balance
      if (balanceAfter < 0) {
        throw new Error(
          `Insufficient balance. Available: $${balanceBefore.toFixed(2)}, Required: $${amount.toFixed(2)}`
        );
      }

      // Update user balance
      await tx.user.update({
        where: { id: userId },
        data: { balance: balanceAfter },
      });

      // Create transaction record (amount stored as negative for deduction)
      const transaction = await tx.balanceTransaction.create({
        data: {
          userId,
          type,
          amount: -amount, // Store as negative
          balanceBefore,
          balanceAfter,
          reference: options.reference,
          description,
          createdBy: options.createdBy,
          meta: options.meta,
        },
      });


      return {
        success: true,
        transaction,
        balanceBefore,
        balanceAfter,
      };
    });
  }

  /**
   * Get user's current balance
   */
  async getBalance(userId: number): Promise<number> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { balance: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return Number(user.balance);
  }

  /**
   * Get user balance with additional info
   */
  async getBalanceDetails(userId: number) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        balance: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Get last transaction
    const lastTransaction = await db.balanceTransaction.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      balance: Number(user.balance),
      lastTransaction,
    };
  }

  // ================================
  // TRANSACTION HISTORY
  // ================================

  /**
   * Get user's transaction history with pagination
   */
  async getTransactionHistory(
    userId: number,
    options: {
      page?: number;
      limit?: number;
      type?: BalanceTransactionType;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ) {
    const { page = 1, limit = 20, type, startDate, endDate } = options;

    const where: any = { userId };

    if (type) {
      where.type = type;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [transactions, totalCount] = await Promise.all([
      db.balanceTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.balanceTransaction.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      transactions,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  // ================================
  // REFUND OPERATIONS
  // ================================

  /**
   * Refund order amount to user balance
   */
  async refundToBalance(orderId: number, amount?: number, reason?: string) {
    // Get order details
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: { id: true, email: true },
        },
      },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status === 'REFUNDED') {
      throw new Error('Order is already refunded');
    }

    if (!order.userId) {
      throw new Error('Cannot refund guest orders to balance');
    }

    const refundAmount = amount || Number(order.total);

    // Add balance
    const result = await this.addBalance(
      order.userId,
      refundAmount,
      'REFUND',
      reason || `Refund for order ${order.orderNumber}`,
      {
        reference: order.orderNumber,
        orderId: order.id,
        meta: {
          orderNumber: order.orderNumber,
          originalAmount: Number(order.total),
          refundedAmount: refundAmount,
        },
      }
    );

    // Note: Order status update handled by OrderService.refundOrder()
    return result;
  }

  // ================================
  // ADMIN OPERATIONS
  // ================================

  /**
   * Manual balance adjustment by admin
   */
  async adminAddBalance(
    userId: number,
    amount: number,
    description: string,
    adminUsername: string,
    type: 'BONUS' | 'ADJUSTMENT' = 'ADJUSTMENT'
  ) {
    return await this.addBalance(userId, amount, type, description, {
      createdBy: adminUsername,
      meta: {
        adminAction: true,
        adminUsername,
      },
    });
  }

  /**
   * Manual balance deduction by admin
   */
  async adminDeductBalance(
    userId: number,
    amount: number,
    description: string,
    adminUsername: string
  ) {
    return await this.deductBalance(userId, amount, 'ADJUSTMENT', description, {
      createdBy: adminUsername,
      meta: {
        adminAction: true,
        adminUsername,
      },
    });
  }

  /**
   * Bulk add balance to multiple users
   */
  async bulkAddBalance(
    userIds: number[],
    amount: number,
    description: string,
    adminUsername: string,
    type: 'BONUS' | 'ADJUSTMENT' = 'BONUS'
  ) {
    const results = [];
    const errors = [];

    for (const userId of userIds) {
      try {
        const result = await this.adminAddBalance(userId, amount, description, adminUsername, type);
        results.push({ userId, success: true, result });
      } catch (error) {
        errors.push({
          userId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      success: errors.length === 0,
      processed: results.length + errors.length,
      successful: results.length,
      failed: errors.length,
      results,
      errors,
    };
  }

  // ================================
  // STATISTICS
  // ================================

  /**
   * Get balance system statistics
   */
  async getStatistics() {
    const [totalBalance, transactionStats, userStats] = await Promise.all([
      // Total balance across all users
      db.user.aggregate({
        _sum: { balance: true },
        _avg: { balance: true },
        _max: { balance: true },
      }),
      // Transaction statistics
      db.balanceTransaction.groupBy({
        by: ['type'],
        _sum: { amount: true },
        _count: true,
      }),
      // User balance statistics
      db.user.groupBy({
        by: ['isActive'],
        _sum: { balance: true },
        _count: true,
        where: {
          balance: { gt: 0 },
        },
      }),
    ]);

    return {
      totalBalance: Number(totalBalance._sum.balance || 0),
      averageBalance: Number(totalBalance._avg.balance || 0),
      maxBalance: Number(totalBalance._max.balance || 0),
      transactionStats,
      usersWithBalance: userStats.reduce((sum, stat) => sum + stat._count, 0),
    };
  }

  /**
   * Get users with high/low balances
   */
  async getUsersByBalance(options: { sortBy?: 'high' | 'low'; limit?: number } = {}) {
    const { sortBy = 'high', limit = 10 } = options;

    return await db.user.findMany({
      where: {
        balance: { gt: 0 },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        balance: true,
        totalSpent: true,
        totalOrders: true,
      },
      orderBy: {
        balance: sortBy === 'high' ? 'desc' : 'asc',
      },
      take: limit,
    });
  }

  // ================================
  // VALIDATION
  // ================================

  /**
   * Validate balance operation constraints
   */
  async validateBalanceOperation(userId: number, amount: number, operation: 'add' | 'deduct') {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { balance: true, isBanned: true, isActive: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.isBanned) {
      throw new Error('Cannot perform balance operation on banned user');
    }

    if (!user.isActive) {
      throw new Error('Cannot perform balance operation on inactive user');
    }

    // Get limits from settings
    const [minTopupSetting, maxTopupSetting, maxTransactionSetting] = await Promise.all([
      this.settingService.findByKey('balance_min_topup').catch(() => ({ value: 1.0 })),
      this.settingService.findByKey('balance_max_topup').catch(() => ({ value: 10000.0 })),
      this.settingService.findByKey('balance_max_transaction').catch(() => ({ value: 50000.0 })),
    ]);

    const MIN_TRANSACTION = Number(minTopupSetting?.value || 1);
    const MAX_BALANCE = Number(maxTopupSetting?.value || 10000);
    const MAX_TRANSACTION = Number(maxTransactionSetting?.value || 50000);

    if (amount < MIN_TRANSACTION) {
      throw new Error(`Minimum transaction amount is $${MIN_TRANSACTION}`);
    }

    if (amount > MAX_TRANSACTION) {
      throw new Error(`Maximum transaction amount is $${MAX_TRANSACTION}`);
    }

    if (operation === 'add') {
      const newBalance = Number(user.balance) + amount;
      if (newBalance > MAX_BALANCE) {
        throw new Error(`Maximum balance limit is $${MAX_BALANCE}`);
      }
    }

    if (operation === 'deduct') {
      const newBalance = Number(user.balance) - amount;
      if (newBalance < 0) {
        throw new Error('Insufficient balance');
      }
    }

    return { valid: true };
  }

  // ================================
  // TOPUP REQUEST OPERATIONS
  // ================================

  /**
   * Create a topup request
   */
  async createTopupRequest(data: {
    userId: number;
    amount: number;
    reason: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    requestedAt: Date;
  }) {
    // Validate user exists
    const user = await db.user.findUnique({
      where: { id: data.userId },
      select: { id: true, email: true, firstName: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Check minimum amount
    if (data.amount < 10) {
      throw new Error('Minimum topup amount is $10');
    }

    // Check if user has a pending request (prevent spam)
    const existingRequest = await db.topupRequest.findFirst({
      where: {
        userId: data.userId,
        status: 'PENDING',
        createdAt: {
          gte: new Date(Date.now() - 3600000), // Last 1 hour
        },
      },
    });

    if (existingRequest) {
      throw new Error('You already have a pending topup request. Please wait or contact support.');
    }

    // Create the topup request
    const topupRequest = await db.topupRequest.create({
      data: {
        userId: data.userId,
        amount: data.amount,
        reason: data.reason,
        status: data.status,
        requestedAt: data.requestedAt,
      },
    });


    // Send email notification to all admins
    this.notifyAdminsOfTopupRequest(topupRequest.id, user, data.amount, data.reason)
      .catch((err: any) => console.error('Failed to send admin notification:', err));

    return topupRequest;
  }

  /**
   * Send email notification to all admins about a new topup request
   */
  private async notifyAdminsOfTopupRequest(
    topupRequestId: number,
    user: { id: number; email: string; firstName?: string | null },
    amount: number,
    reason: string
  ) {
    try {
      // Get all admin users
      const admins = await db.user.findMany({
        where: {
          role: 'ADMIN',
          isActive: true,
          isVerified: true,
          isBanned: false,
        },
        select: {
          email: true,
          firstName: true,
        },
      });

      if (admins.length === 0) {
        console.log('No active admins found to notify');
        return;
      }

      // Build email content
      const adminPanel = process.env.ADMIN_PANEL_URL || 'http://localhost:3000/admin';
      const manageLink = `${adminPanel}/payment-settings/payment-gateways`;

      const emailSubject = `[New Topup Request] User ${user.firstName || user.email} - $${amount.toFixed(2)}`;

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
          <div style="background-color: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
            <h2 style="margin: 0;">New Topup Request</h2>
          </div>
          
          <div style="background-color: white; padding: 30px; border-radius: 0 0 8px 8px;">
            <p style="font-size: 16px; margin-bottom: 20px; color: #333;">
              A new balance topup request has been submitted and requires your review.
            </p>

            <div style="background-color: #f0f9ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 5px 0; color: #333;">
                <strong>Request ID:</strong> #${topupRequestId}
              </p>
              <p style="margin: 5px 0; color: #333;">
                <strong>User:</strong> ${user.firstName ? `${user.firstName} (${user.email})` : user.email}
              </p>
              <p style="margin: 5px 0; color: #333;">
                <strong>Amount:</strong> <span style="color: #16a34a; font-weight: bold; font-size: 18px;">$${amount.toFixed(2)}</span>
              </p>
              <p style="margin: 5px 0; color: #333;">
                <strong>Reason:</strong> ${reason}
              </p>
              <p style="margin: 5px 0; color: #999; font-size: 12px;">
                <strong>Submitted:</strong> ${new Date().toLocaleString('en-US', { 
                  dateStyle: 'medium', 
                  timeStyle: 'short' 
                })}
              </p>
            </div>

            <div style="margin: 30px 0; text-align: center;">
              <a href="${manageLink}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px;">
                Review Request
              </a>
            </div>

            <p style="font-size: 13px; color: #666; border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 20px;">
              This is an automated notification from UHQ Accounts. Please do not reply to this email.
            </p>
          </div>
        </div>
      `;

      const emailText = `
New Topup Request
================

Request ID: #${topupRequestId}
User: ${user.firstName ? `${user.firstName} (${user.email})` : user.email}
Amount: $${amount.toFixed(2)}
Reason: ${reason}
Submitted: ${new Date().toLocaleString()}

Please review this request on the admin panel: ${manageLink}
      `;

      // Send email to all admins in parallel
      const emailPromises = admins.map((admin) =>
        sendEmail(admin.email, emailText, emailSubject, emailHtml)
          .then(() => {
            console.log(`✅ Admin notification sent to ${admin.email}`);
          })
          .catch((err) => {
            console.error(`❌ Failed to send admin notification to ${admin.email}:`, err);
          })
      );

      await Promise.all(emailPromises);
    } catch (error) {
      console.error('Error notifying admins of topup request:', error);
      // Don't throw - we don't want email errors to fail the topup request creation
    }
  }

  /**
   * Get user's topup requests
   */
  async getTopupRequests(userId: number, options: { limit?: number } = {}) {
    const { limit = 10 } = options;

    return await db.topupRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get all topup requests (admin view)
   */
  async getTopupRequestsList(options: { status?: string } = {}) {
    const { status = 'all' } = options;

    let where: any = {};

    if (status && status !== 'all') {
      where.status = status;
    }

    return await db.topupRequest.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            balance: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Approve topup request and add balance to user
   */
  async approveTopupRequest(requestId: number, approvedBy: string) {
    const topupRequest = await db.topupRequest.findUnique({
      where: { id: requestId },
      include: {
        user: {
          select: { id: true, email: true, balance: true },
        },
      },
    });

    if (!topupRequest) {
      throw new Error('Topup request not found');
    }

    if (topupRequest.status !== 'PENDING') {
      throw new Error('Only pending requests can be approved');
    }

    // Update request status and add balance in transaction
    return await db.$transaction(async (tx) => {
      // Update topup request
      const updatedRequest = await tx.topupRequest.update({
        where: { id: requestId },
        data: {
          status: 'APPROVED',
          approvedAt: new Date(),
          approvedBy,
        },
      });

      // Add balance to user
      const balanceUpdate = await this.addBalance(
        topupRequest.user.id,
        Number(topupRequest.amount),
        'TOPUP',
        `Topup request approved - ${approvedBy}`,
        {
          reference: `topup_request_${requestId}`,
          createdBy: approvedBy,
          meta: { topupRequestId: requestId },
        }
      );

      return {
        success: true,
        topupRequest: updatedRequest,
        balanceUpdate,
      };
    });
  }

  /**
   * Reject topup request
   */
  async rejectTopupRequest(requestId: number, reason?: string) {
    const topupRequest = await db.topupRequest.findUnique({
      where: { id: requestId },
    });

    if (!topupRequest) {
      throw new Error('Topup request not found');
    }

    if (topupRequest.status !== 'PENDING') {
      throw new Error('Only pending requests can be rejected');
    }

    // Update request status
    const updatedRequest = await db.topupRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        rejectionReason: reason,
      },
    });

    // Note: notifyAdminsOfStripeTopup removed here as it referenced undefined variables
    console.log(`[Stripe Topup] Rejected topup request ${requestId}`);
  }

  /**
   * Send email notification to admins about Stripe topup
   */
  private async notifyAdminsOfStripeTopup(
    userId: number,
    user: { id: number; email: string; firstName?: string | null },
    amount: number,
    paymentIntentId: string
  ) {
    try {
      // Get all admin users
      const admins = await db.user.findMany({
        where: {
          role: 'ADMIN',
          isActive: true,
          isVerified: true,
          isBanned: false,
        },
        select: {
          email: true,
          firstName: true,
        },
      });

      if (admins.length === 0) {
        console.log('No active admins found to notify');
        return;
      }

      // Build email content
      const adminPanel = process.env.ADMIN_PANEL_URL || 'http://localhost:3000/admin';
      const userLink = `${adminPanel}/users/${userId}`;

      const htmlContent = `
        <h2 style="color: #2563eb;">✅ Stripe Wallet Topup Completed</h2>
        <p>A user has successfully topped up their wallet via Stripe card payment.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background: #f3f4f6;">
            <td style="padding: 12px; border: 1px solid #d1d5db; font-weight: bold;">User Name:</td>
            <td style="padding: 12px; border: 1px solid #d1d5db;">${user.firstName || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border: 1px solid #d1d5db; font-weight: bold;">User ID:</td>
            <td style="padding: 12px; border: 1px solid #d1d5db;"><a href="${userLink}" style="color: #2563eb; text-decoration: none;">${user.id}</a></td>
          </tr>
          <tr style="background: #f3f4f6;">
            <td style="padding: 12px; border: 1px solid #d1d5db; font-weight: bold;">Email:</td>
            <td style="padding: 12px; border: 1px solid #d1d5db;">${user.email}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border: 1px solid #d1d5db; font-weight: bold;">Amount Credited:</td>
            <td style="padding: 12px; border: 1px solid #d1d5db; color: #22c55e; font-weight: bold;">$${amount.toFixed(2)}</td>
          </tr>
          <tr style="background: #f3f4f6;">
            <td style="padding: 12px; border: 1px solid #d1d5db; font-weight: bold;">Payment ID:</td>
            <td style="padding: 12px; border: 1px solid #d1d5db;"><code style="background: #f3f4f6; padding: 2px 6px; border-radius: 3px;">${paymentIntentId}</code></td>
          </tr>
          <tr>
            <td style="padding: 12px; border: 1px solid #d1d5db; font-weight: bold;">Status:</td>
            <td style="padding: 12px; border: 1px solid #d1d5db;"><span style="background: #dcfce7; color: #166534; padding: 4px 8px; border-radius: 4px; font-weight: bold;">AUTO-APPROVED</span></td>
          </tr>
          <tr style="background: #f3f4f6;">
            <td style="padding: 12px; border: 1px solid #d1d5db; font-weight: bold;">Payment Method:</td>
            <td style="padding: 12px; border: 1px solid #d1d5db;">💳 Stripe (Credit/Debit Card)</td>
          </tr>
          <tr>
            <td colspan="2" style="padding: 12px; border: 1px solid #d1d5db; background: #f0f9ff; text-align: center;">
              <a href="${userLink}" style="color: #2563eb; text-decoration: none; font-weight: bold;">View User Profile →</a>
            </td>
          </tr>
        </table>
        <p style="color: #6b7280; font-size: 14px;">
          <strong>Note:</strong> This topup was processed automatically via Stripe payment gateway. The balance has been instantly credited to the user's account.
        </p>
      `;

      const textContent = `
Stripe Wallet Topup Completed

User: ${user.firstName || 'N/A'}
User ID: ${user.id}
Email: ${user.email}
Amount Credited: $${amount.toFixed(2)}
Payment ID: ${paymentIntentId}
Status: AUTO-APPROVED
Payment Method: Stripe (Credit/Debit Card)

View user profile: ${userLink}

Note: This topup was processed automatically via Stripe payment gateway. The balance has been instantly credited to the user's account.
      `;

      // Send emails to all admins
      const emailPromises = admins.map((admin) =>
        sendEmail(
          admin.email,
          textContent,
          `💰 Stripe Topup: $${amount.toFixed(2)} - User ${user.id}`,
          htmlContent
        ).catch((error: any) => {
          console.error(`Failed to send email to ${admin.email}:`, error);
        })
      );

      await Promise.all(emailPromises);
      console.log(`[Stripe Topup] Email notifications sent to ${admins.length} admins`);
    } catch (error) {
      console.error('[Stripe Topup] Failed to send admin notifications:', error);
      throw error;
    }
  }

  private normalizeTopupGateway(paymentMethod?: string | null) {
    const raw = String(paymentMethod || '').trim().toLowerCase();
    if (!raw) return '';
    if (raw.startsWith('paygate')) return 'paygate';
    return raw.split(':')[0] || raw;
  }

  private getTopupPaymentMethodId(paymentMethod?: string | null) {
    const raw = String(paymentMethod || '').trim();
    const [, id] = raw.split(':');
    const parsed = Number(id);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }

  private async findTopupPaymentMethod(paymentMethod?: string | null) {
    const paymentMethodId = this.getTopupPaymentMethodId(paymentMethod);
    if (paymentMethodId) {
      const method = await db.paymentMethod.findUnique({ where: { id: paymentMethodId } });
      if (method) return method;
    }

    const gateway = this.normalizeTopupGateway(paymentMethod);
    if (!gateway) return null;

    return db.paymentMethod.findFirst({
      where: {
        gateway,
        isActive: true
      },
      orderBy: { id: 'asc' }
    });
  }

  private async calculateTopupCreditAmount(topup: { amount: Prisma.Decimal; paymentMethod?: string | null }) {
    const baseAmount = Number(topup.amount);
    const paymentMethod = await this.findTopupPaymentMethod(topup.paymentMethod);
    if (!paymentMethod) return baseAmount;

    const breakdown = await this.getPaymentService().calculatePaymentBreakdown(baseAmount, paymentMethod.id);
    return Number(breakdown.walletCreditAmount || baseAmount);
  }

  async initiateGatewayTopup(
    userId: number,
    amount: number,
    paymentMethodId: number,
    paygateProviderCode?: string
  ) {
    if (!Number.isFinite(amount) || amount < 1 || amount > 50000) {
      throw new Error('Invalid amount. Range: $1-$50,000');
    }

    const [user, paymentMethod] = await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, firstName: true }
      }),
      db.paymentMethod.findUnique({
        where: { id: paymentMethodId }
      })
    ]);

    if (!user) throw new Error('User not found');
    if (!paymentMethod || !paymentMethod.isActive) {
      throw new Error('Payment method not available');
    }
    if (paymentMethod.gateway.toLowerCase() === 'balance') {
      throw new Error('Wallet balance cannot be used to top up itself');
    }

    const minAmount = Number(paymentMethod.minAmount || 0);
    if (amount < minAmount) {
      throw new Error(
        `Minimum payment amount is ${minAmount.toFixed(2)} ${paymentMethod.currencies?.[0] || 'USD'}`
      );
    }

    let paygateProvider: any = null;
    if (paymentMethod.gateway.toLowerCase() === 'paygate' && paygateProviderCode) {
      const providerList = await this.payGateProviderService.listProviders({ includeInactive: true });
      paygateProvider = providerList.providers.find(
        (provider) => provider.code.toLowerCase() === paygateProviderCode.toLowerCase()
      );

      if (!paygateProvider) {
        throw new Error(`Invalid PayGate provider: ${paygateProviderCode}`);
      }

      if (!paygateProvider.isActive) {
        throw new Error(`PayGate provider is disabled: ${paygateProviderCode}`);
      }

      if (paygateProvider.type !== 'card') {
        throw new Error('PayGate only supports card checkout for customer top-ups');
      }
    }

    const breakdown = await this.getPaymentService().calculatePaymentBreakdown(amount, paymentMethodId);

    const topupRequest = await db.topupRequest.create({
      data: {
        userId,
        amount: new Prisma.Decimal(amount),
        reason: `Wallet top-up via ${paymentMethod.name}`,
        status: 'PENDING',
        paymentMethod: `${paymentMethod.gateway.toUpperCase()}:${paymentMethod.id}`
      }
    });

    try {
      const { paymentResponse } = await this.getPaymentService().createGatewayPaymentForMethod(
        paymentMethod.id,
        {
          orderId: topupRequest.id,
          amount: breakdown.finalAmount,
          currency: paymentMethod.currencies?.[0] || 'USD',
          customerEmail: user.email,
          customerName: user.firstName || user.email,
          description: `Wallet Top-up #${topupRequest.id}`,
          metadata: {
            type: 'wallet_topup',
            topupRequestId: topupRequest.id.toString(),
            userId: userId.toString(),
            topupAmount: amount.toString(),
            chargedAmount: String(breakdown.finalAmount),
            bonusAmount: String(breakdown.bonusAmount || 0),
            walletCreditAmount: String(breakdown.walletCreditAmount || amount),
            paygateProviderCode: paygateProvider?.code || paygateProviderCode || undefined,
            paygateProviderType: paygateProvider?.type || undefined,
            paygateMethod: paygateProvider?.method || undefined
          }
        }
      );

      const updatedTopup = await db.topupRequest.update({
        where: { id: topupRequest.id },
        data: {
          transactionId: paymentResponse.gatewayTxnId,
          ...(paymentMethod.gateway.toLowerCase() === 'paygate'
            ? {
                paygateLinkId: paymentResponse.gatewayTxnId,
                paygateCryptoType: String(
                  paymentResponse.metadata?.coin || paygateProvider?.method || 'polygon/usdc'
                )
              }
            : {})
        }
      });

      return {
        success: true,
        topupRequestId: updatedTopup.id,
        status: updatedTopup.status,
        gateway: paymentMethod.gateway,
        gatewayTxnId: paymentResponse.gatewayTxnId,
        paymentUrl: paymentResponse.paymentUrl,
        address: paymentResponse.address,
        qrCode: paymentResponse.qrCode,
        expiresAt: paymentResponse.expiresAt,
        breakdown,
        metadata: paymentResponse.metadata || null
      };
    } catch (error) {
      await db.topupRequest.update({
        where: { id: topupRequest.id },
        data: {
          status: 'FAILED',
          rejectionReason: error instanceof Error ? error.message : 'Top-up initiation failed'
        }
      });
      throw error;
    }
  }

  async processGatewayTopupWebhook(gateway: string, paymentData: any) {
    const normalizedGateway = this.normalizeTopupGateway(gateway);
    if (!normalizedGateway) return { handled: false };

    let topup = paymentData?.gatewayTxnId
      ? await db.topupRequest.findFirst({
          where: {
            transactionId: paymentData.gatewayTxnId
          }
        })
      : null;

    if (!topup && paymentData?.orderId) {
      topup = await db.topupRequest.findFirst({
        where: {
          id: paymentData.orderId,
          status: { in: ['PENDING', 'FAILED'] }
        }
      });

      if (topup && this.normalizeTopupGateway(topup.paymentMethod) !== normalizedGateway) {
        topup = null;
      }
    }

    if (!topup) {
      return { handled: false };
    }

    const incomingStatus = String(paymentData?.status || '').toUpperCase();

    if (incomingStatus === 'FAILED' && topup.status === 'PENDING') {
      await db.topupRequest.update({
        where: { id: topup.id },
        data: {
          status: 'FAILED',
          transactionId: paymentData?.gatewayTxnId || topup.transactionId
        }
      });

      return {
        handled: true,
        topupRequestId: topup.id,
        message: 'Wallet topup marked as failed'
      };
    }

    if (incomingStatus !== 'COMPLETED' && incomingStatus !== 'PARTIAL') {
      if (paymentData?.gatewayTxnId && topup.transactionId !== paymentData.gatewayTxnId) {
        await db.topupRequest.update({
          where: { id: topup.id },
          data: { transactionId: paymentData.gatewayTxnId }
        });
      }
      return { handled: true, topupRequestId: topup.id, message: 'Wallet topup still pending' };
    }

    if (topup.status === 'COMPLETED') {
      return { handled: true, topupRequestId: topup.id, message: 'Wallet topup already processed' };
    }

    const existingBalanceTxn = paymentData?.gatewayTxnId
      ? await db.balanceTransaction.findFirst({
          where: {
            userId: topup.userId,
            reference: paymentData.gatewayTxnId
          }
        })
      : null;

    if (existingBalanceTxn) {
      await db.topupRequest.update({
        where: { id: topup.id },
        data: {
          status: 'COMPLETED',
          approvedAt: new Date(),
          approvedBy: `${normalizedGateway.toUpperCase()}_AUTO`,
          transactionId: paymentData.gatewayTxnId || topup.transactionId
        }
      });

      return { handled: true, topupRequestId: topup.id, message: 'Wallet topup already credited' };
    }

    await db.topupRequest.update({
      where: { id: topup.id },
      data: {
        status: 'COMPLETED',
        approvedAt: new Date(),
        approvedBy: `${normalizedGateway.toUpperCase()}_AUTO`,
        transactionId: paymentData?.gatewayTxnId || topup.transactionId
      }
    });

    const amountToCredit = await this.calculateTopupCreditAmount(topup);

    await this.addBalance(
      topup.userId,
      amountToCredit,
      'TOPUP',
      `${normalizedGateway.toUpperCase()} wallet top-up completed`,
      {
        reference: paymentData?.gatewayTxnId || topup.transactionId || undefined,
        meta: {
          gateway: normalizedGateway,
          topupRequestId: topup.id,
          topupAmount: Number(topup.amount),
          bonusAmount: Number((amountToCredit - Number(topup.amount)).toFixed(2)),
          ...(paymentData?.metadata && typeof paymentData.metadata === 'object'
            ? paymentData.metadata
            : {})
        }
      }
    );

    return {
      handled: true,
      topupRequestId: topup.id,
      message: 'Wallet topup processed successfully'
    };
  }

  async getGatewayTopupStatus(topupRequestId: number, userId: number) {
    let topup = await db.topupRequest.findFirst({
      where: {
        id: topupRequestId,
        userId
      }
    });

    if (!topup) {
      throw new Error('Topup request not found');
    }

    const gateway = this.normalizeTopupGateway(topup.paymentMethod);

    if (gateway === 'paygate' && topup.paygateLinkId) {
      return await this.getPayGatePaymentStatus(topup.paygateLinkId, userId);
    }

    if (topup.status === 'PENDING' && topup.transactionId && gateway && gateway !== 'paygate') {
      const paymentMethod = await this.findTopupPaymentMethod(topup.paymentMethod);

      if (paymentMethod) {
        try {
          if (!(gateway === 'nowpayments' && !/^\d+$/.test(topup.transactionId || ''))) {
            const { statusResponse } = await this.getPaymentService().getGatewayStatusForMethod(
              paymentMethod.id,
              topup.transactionId
            );

            await this.processGatewayTopupWebhook(gateway, {
              gatewayTxnId: topup.transactionId,
              orderId: topup.id,
              amount: Number(topup.amount),
              paidAmount: statusResponse.paidAmount,
              status: statusResponse.status,
              currency: statusResponse.currency,
              metadata: statusResponse.metadata
            });

            topup = await db.topupRequest.findFirst({
              where: {
                id: topupRequestId,
                userId
              }
            });
          }
        } catch (error) {
          console.error('[Topup Status] Gateway status check failed:', error);
        }
      }
    }

    if (!topup) {
      throw new Error('Topup request not found');
    }

    return {
      topupRequestId: topup.id,
      status: topup.status,
      amount: Number(topup.amount),
      gateway,
      transactionId: topup.transactionId,
      createdAt: topup.createdAt,
      completedAt: topup.approvedAt
    };
  }

  async verifyBinanceTopup(topupRequestId: number, userId: number, binanceOrderId: string) {
    const topup = await db.topupRequest.findFirst({
      where: {
        id: topupRequestId,
        userId
      }
    });

    if (!topup) {
      throw new Error('Topup request not found');
    }

    if (this.normalizeTopupGateway(topup.paymentMethod) !== 'binance') {
      throw new Error('This topup is not a Binance payment');
    }

    if (topup.status === 'COMPLETED' || topup.status === 'APPROVED') {
      throw new Error('This topup has already been completed');
    }

    if (topup.status === 'FAILED' || topup.status === 'REJECTED') {
      throw new Error(`Cannot verify topup with status: ${topup.status}`);
    }

    const trimmedOrderId = binanceOrderId.trim();
    if (!/^\d{10,20}$/.test(trimmedOrderId)) {
      throw new Error(
        `Invalid Binance Order ID format "${trimmedOrderId}". Order ID must be a numeric value between 10-20 digits.`
      );
    }

    const existingTransaction = await db.balanceTransaction.findFirst({
      where: {
        reference: trimmedOrderId
      }
    });

    if (existingTransaction) {
      throw new Error(
        `This Binance Order ID "${trimmedOrderId}" has already been used for another balance top-up.`
      );
    }

    let verificationResult: {
      verified: boolean
      transfer?: any
      error?: string
    } | null = null;

    try {
      const { verifyBinanceTransfer } = await import('../lib/binance');
      verificationResult = await verifyBinanceTransfer(trimmedOrderId, Number(topup.amount));
    } catch (error: any) {
      if (
        error?.message?.includes('SESSION_EXPIRED') ||
        error?.message?.includes('NO_SESSION_COOKIES')
      ) {
        verificationResult = null;
      } else {
        verificationResult = {
          verified: false,
          error: error?.message || 'VERIFICATION_ERROR'
        };
      }
    }

    if (verificationResult && !verificationResult.verified) {
      const isTechnicalFailure =
        verificationResult.error?.includes('Timeout') ||
        verificationResult.error?.includes('launch') ||
        verificationResult.error?.includes('SESSION_EXPIRED') ||
        verificationResult.error?.includes('NO_SESSION_COOKIES') ||
        verificationResult.error?.includes('VERIFICATION_ERROR') ||
        verificationResult.error?.includes('Failed to fetch');

      if (!isTechnicalFailure) {
        const errorMessages: Record<string, string> = {
          ORDER_NOT_FOUND:
            'Order ID not found in Binance transfer history. Please verify the Order ID is correct.',
          AMOUNT_MISMATCH: `Amount mismatch. Expected ${Number(topup.amount)} USDT, but Binance returned a different amount.`,
          RECIPIENT_MISMATCH:
            'Transfer recipient does not match the configured Binance recipient.'
        };

        throw new Error(
          errorMessages[verificationResult.error || ''] ||
            'Verification failed. Please check the Binance Order ID and try again.'
        );
      }

      verificationResult = null;
    }

    await db.topupRequest.update({
      where: { id: topup.id },
      data: {
        status: 'COMPLETED',
        approvedAt: new Date(),
        transactionId: trimmedOrderId,
        rejectionReason: null
      }
    });

    const amountToCredit = await this.calculateTopupCreditAmount(topup);

    await this.addBalance(topup.userId, amountToCredit, 'TOPUP', 'Binance wallet top-up', {
      reference: trimmedOrderId,
      meta: {
        topupRequestId: topup.id,
        gateway: 'binance',
        topupAmount: Number(topup.amount),
        bonusAmount: Number((amountToCredit - Number(topup.amount)).toFixed(2)),
        verifiedBy: verificationResult?.verified ? 'playwright' : 'manual',
        transfer: verificationResult?.transfer || null
      }
    });

    return {
      success: true,
      topupRequestId: topup.id,
      status: 'COMPLETED',
      transactionId: trimmedOrderId
    };
  }

  // ================================
  // PAYGATE TOPUP OPERATIONS
  // ================================

  private normalizePayGateMethod(value: string): string {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) return process.env.PAYGATE_METHOD || 'polygon/usdc';

    if (raw.includes('/')) {
      return raw
        .split('/')
        .map((part) => part.trim())
        .filter(Boolean)
        .join('/');
    }

    if (raw.includes('_')) {
      const [chain, token] = raw.split('_');
      if (chain && token) return `${chain}/${token}`;
    }

    return raw;
  }

  private encodePendingPayGateState(state: PayGatePendingMeta): string {
    const payload = Buffer.from(JSON.stringify(state), 'utf8').toString('base64url');
    return `pg_pending:${payload}`;
  }

  private decodePendingPayGateState(raw?: string | null): PayGatePendingMeta | null {
    if (!raw || !raw.startsWith('pg_pending:')) return null;
    try {
      const encoded = raw.slice('pg_pending:'.length);
      const json = Buffer.from(encoded, 'base64url').toString('utf8');
      const parsed = JSON.parse(json);

      if (!parsed || typeof parsed !== 'object') return null;
      if (!parsed.ipnToken || !parsed.addressIn) return null;

      return parsed as PayGatePendingMeta;
    } catch {
      return null;
    }
  }

  private async getPayGateGatewayService(): Promise<PayGateGatewayService> {
    const paymentMethod = await db.paymentMethod.findFirst({
      where: { gateway: 'paygate', isActive: true },
      orderBy: { id: 'asc' }
    });

    if (!paymentMethod) {
      throw new Error('No active PayGate payment method found in payment settings');
    }

    const envWalletAddress =
      (process.env.PAYGATE_WALLET_ADDRESS || '').trim() ||
      (process.env.PAYGATE_RECEIVING_WALLET || '').trim();

    let walletAddress = envWalletAddress;

    if (!walletAddress) {
      if (!paymentMethod.apiKey) {
        throw new Error('PayGate payment method is missing wallet address in API Key field');
      }

      walletAddress = String(paymentMethod.apiKey);
      try {
        walletAddress = decrypt(paymentMethod.apiKey);
      } catch {
        walletAddress = String(paymentMethod.apiKey);
      }
    } else {
      console.log('[PayGate Topup] Using PayGate wallet from environment override');
    }

    if (!walletAddress?.trim()) {
      throw new Error('PayGate wallet address is empty after configuration resolution');
    }

    return new PayGateGatewayService({
      walletAddress: walletAddress.trim(),
      testMode: Boolean(paymentMethod.testMode)
    });
  }

  private async resolvePayGateProvider(
    type: 'card' | 'crypto',
    options: { providerCode?: string; region?: string; methodHint?: string }
  ) {
    const { providerCode, region, methodHint } = options;
    const providersResult = await this.payGateProviderService.listProviders({
      type,
      region,
      includeInactive: false
    });

    const providers = providersResult.providers.filter((provider) => provider.isActive);
    if (!providers.length) {
      throw new Error(`No active PayGate ${type} providers available`);
    }

    if (providerCode) {
      const byCode = providers.find(
        (provider) => provider.code.toLowerCase() === providerCode.toLowerCase()
      );
      if (byCode) return byCode;
      throw new Error(`PayGate provider not found or inactive: ${providerCode}`);
    }

    if (methodHint) {
      const normalizedHint = this.normalizePayGateMethod(methodHint);
      const byMethod = providers.find(
        (provider) => this.normalizePayGateMethod(provider.method) === normalizedHint
      );
      if (byMethod) return byMethod;
    }

    return providers.sort((a, b) => a.sortOrder - b.sortOrder)[0]!;
  }

  /**
   * Create PayGate card topup (crypto payment link)
   */
  async initiatePayGateCardTopup(
    userId: number,
    amount: number,
    providerCode?: string,
    region?: string
  ) {
    try {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { email: true, firstName: true },
      });

      if (!user) throw new Error('User not found');
      if (amount < 1 || amount > 50000) throw new Error('Invalid amount (1-50000)');

      const provider = await this.resolvePayGateProvider('card', { providerCode, region });
      const gateway = await this.getPayGateGatewayService();

      const paygateLinkId = `pgc_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const session = await gateway.createWalletSession({
        referenceId: paygateLinkId,
        amount,
        currency: 'USD',
        method: provider.method,
        callbackParams: {
          paygateLinkId,
          flow: 'wallet_topup',
          topupType: 'card',
          providerCode: provider.code,
          providerType: provider.type
        }
      });

      const pendingState: PayGatePendingMeta = {
        ipnToken: session.ipnToken,
        addressIn: session.addressIn,
        addressInEncrypted: session.addressInEncrypted,
        method: session.method,
        amountCoin: session.amountCoin,
        expiresAt: session.expiresAt.toISOString(),
        providerCode: provider.code,
        providerName: provider.name,
        providerType: provider.type
      };

      // Create TopupRequest record
      await db.topupRequest.create({
        data: {
          userId,
          amount: new Prisma.Decimal(amount),
          reason: `PayGate Card Payment - ${provider.name}`,
          status: 'PENDING',
          paymentMethod: 'PAYGATE_CARD',
          paygateLinkId,
          paygateCryptoType: session.method,
          transactionId: this.encodePendingPayGateState(pendingState)
        },
      });

      console.log(`[PayGate Card] Initiated topup ${paygateLinkId} for user ${userId}, amount: $${amount}`, {
        providerCode: provider.code,
        method: session.method,
        addressIn: session.addressIn
      });

      return {
        success: true,
        paymentId: paygateLinkId,
        amount,
        provider,
        status: 'PENDING',
        paygate: {
          gatewayTxnId: session.gatewayTxnId,
          address: session.addressIn,
          addressEncrypted: session.addressInEncrypted,
          ipnToken: session.ipnToken,
          amountCoin: session.amountCoin,
          coin: session.method,
          expiresAt: session.expiresAt,
          qrCodeData: `${session.method}:${session.addressIn}?amount=${session.amountCoin}`
        }
      };
    } catch (error: any) {
      console.error('[PayGate Card] Error:', error.message);
      throw error;
    }
  }

  /**
   * Create PayGate crypto topup (unique wallet address)
   */
  async initiatePayGateCryptoTopup(
    userId: number,
    fiatAmount: number,
    cryptoType: string = 'polygon/usdc',
    providerCode?: string,
    region?: string
  ) {
    try {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { email: true, firstName: true },
      });

      if (!user) throw new Error('User not found');
      if (fiatAmount < 1 || fiatAmount > 50000) throw new Error('Invalid amount (1-50000)');

      const methodHint = this.normalizePayGateMethod(cryptoType);
      const provider = await this.resolvePayGateProvider('crypto', {
        providerCode,
        region,
        methodHint
      });
      const gateway = await this.getPayGateGatewayService();

      const paygateLinkId = `pgcr_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const session = await gateway.createWalletSession({
        referenceId: paygateLinkId,
        amount: fiatAmount,
        currency: 'USD',
        method: provider.method,
        callbackParams: {
          paygateLinkId,
          flow: 'wallet_topup',
          topupType: 'crypto',
          providerCode: provider.code,
          providerType: provider.type
        }
      });

      const pendingState: PayGatePendingMeta = {
        ipnToken: session.ipnToken,
        addressIn: session.addressIn,
        addressInEncrypted: session.addressInEncrypted,
        method: session.method,
        amountCoin: session.amountCoin,
        expiresAt: session.expiresAt.toISOString(),
        providerCode: provider.code,
        providerName: provider.name,
        providerType: provider.type
      };

      // Create TopupRequest record
      await db.topupRequest.create({
        data: {
          userId,
          amount: new Prisma.Decimal(fiatAmount),
          reason: `PayGate Crypto ${provider.name} - Automatic`,
          status: 'PENDING',
          paymentMethod: 'PAYGATE_CRYPTO',
          paygateLinkId,
          paygateCryptoType: session.method,
          transactionId: this.encodePendingPayGateState(pendingState)
        },
      });

      console.log(
        `[PayGate Crypto] Initiated topup ${paygateLinkId} for user ${userId}, amount: $${fiatAmount}, coin: ${session.method}`
      );

      return {
        success: true,
        paymentId: paygateLinkId,
        cryptoType: session.method,
        provider,
        fiatAmount,
        status: 'PENDING',
        paygate: {
          gatewayTxnId: session.gatewayTxnId,
          address: session.addressIn,
          addressEncrypted: session.addressInEncrypted,
          ipnToken: session.ipnToken,
          amountCoin: session.amountCoin,
          coin: session.method,
          expiresAt: session.expiresAt,
          qrCodeData: `${session.method}:${session.addressIn}?amount=${session.amountCoin}`
        }
      };
    } catch (error: any) {
      console.error('[PayGate Crypto] Error:', error.message);
      throw error;
    }
  }

  /**
   * Process PayGate webhook callback - updates balance immediately
   */
  async processPayGateCallback(callbackData: any) {
    try {
      const callbackSecret = String(callbackData?.cb_secret || '');
      const expectedSecret = process.env.PAYGATE_CALLBACK_SECRET || '';
      if (expectedSecret && callbackSecret && callbackSecret !== expectedSecret) {
        throw new Error('Invalid PayGate callback secret');
      }

      const paygateLinkId = String(callbackData?.paygateLinkId || callbackData?.number || '');
      const { value_coin, coin, txid_in, txid_out } = callbackData;

      if (!paygateLinkId) throw new Error('Missing paygateLinkId');

      // Find topup request
      const topup = await db.topupRequest.findFirst({
        where: { paygateLinkId },
        include: { user: true },
      });

      if (!topup) throw new Error(`Topup not found: ${paygateLinkId}`);

      const pendingState = this.decodePendingPayGateState(topup.transactionId);
      if (pendingState?.ipnToken && callbackData?.ipn_token) {
        if (String(callbackData.ipn_token) !== pendingState.ipnToken) {
          throw new Error('PayGate callback ipn_token mismatch');
        }
      }

      if (pendingState?.addressIn && callbackData?.address_in) {
        if (String(callbackData.address_in).toLowerCase() !== pendingState.addressIn.toLowerCase()) {
          throw new Error('PayGate callback address mismatch');
        }
      }

      // Prevent duplicate processing
      if (topup.status === 'COMPLETED') {
        console.log(`[PayGate Callback] Already processed: ${paygateLinkId}`);
        return { success: true, already_processed: true };
      }

      const userId = topup.userId;
      const amountToCredit = await this.calculateTopupCreditAmount(topup);

      // Update TopupRequest with transaction details
      await db.topupRequest.update({
        where: { id: topup.id },
        data: {
          status: 'COMPLETED',
          approvedBy: 'PAYGATE_AUTO',
          approvedAt: new Date(),
          transactionId: txid_in || txid_out || `${coin || pendingState?.method || 'paygate'}-${Date.now()}`,
        },
      });

      // Add balance immediately (no verification needed)
      await this.addBalance(userId, amountToCredit, 'TOPUP', 'PayGate payment completed', {
        reference: paygateLinkId,
        meta: {
          gateway: topup.paymentMethod,
          topupAmount: Number(topup.amount),
          bonusAmount: Number((amountToCredit - Number(topup.amount)).toFixed(2)),
          crypto: coin || pendingState?.method,
          txid: txid_in || txid_out,
          paygateValueCoin: value_coin ? Number(value_coin) : undefined,
          paygateIpnToken: callbackData?.ipn_token || pendingState?.ipnToken,
          paygateAddressIn: callbackData?.address_in || pendingState?.addressIn
        },
      });

      console.log(`[PayGate Callback] ✅ Processed ${paygateLinkId}: $${amountToCredit} added for user ${userId}`);

      // Send notification
      await this.notifyPayGateTopupCompletion(topup.user, amountToCredit, topup.paymentMethod || '');

      return { success: true, userId, amountAdded: amountToCredit };
    } catch (error: any) {
      console.error('[PayGate Callback] Error:', error.message);
      throw error;
    }
  }

  /**
   * Get PayGate payment status by paygateLinkId
   */
  async getPayGatePaymentStatus(paygateLinkId: string, userId: number) {
    try {
      const topup = await db.topupRequest.findFirst({
        where: { paygateLinkId, userId },
      });

      if (!topup) {
        return { status: 'NOT_FOUND' };
      }

      return {
        paymentId: topup.paygateLinkId,
        status: topup.status,
        amount: Number(topup.amount),
        transactionId: topup.status === 'COMPLETED' ? topup.transactionId : undefined,
        cryptoType: topup.paygateCryptoType,
        paygate: topup.status === 'PENDING'
          ? {
              address: this.decodePendingPayGateState(topup.transactionId)?.addressIn,
              amountCoin: this.decodePendingPayGateState(topup.transactionId)?.amountCoin,
              coin: this.decodePendingPayGateState(topup.transactionId)?.method,
              ipnToken: this.decodePendingPayGateState(topup.transactionId)?.ipnToken,
              providerCode: this.decodePendingPayGateState(topup.transactionId)?.providerCode,
              providerName: this.decodePendingPayGateState(topup.transactionId)?.providerName,
              providerType: this.decodePendingPayGateState(topup.transactionId)?.providerType,
              expiresAt: this.decodePendingPayGateState(topup.transactionId)?.expiresAt,
              qrCodeData: (() => {
                const pending = this.decodePendingPayGateState(topup.transactionId);
                if (!pending?.addressIn || !pending?.method) return undefined;
                return `${pending.method}:${pending.addressIn}?amount=${pending.amountCoin}`;
              })()
            }
          : undefined,
        completedAt: topup.approvedAt,
        createdAt: topup.requestedAt,
      };
    } catch (error: any) {
      console.error('[PayGate Status] Error:', error.message);
      throw error;
    }
  }

  /**
   * Send PayGate topup completion notification
   */
  async createStripePaymentIntent(params: { userId: number; amount: number }) {
    const Stripe = (await import('stripe')).default
    const stripeKey = process.env.STRIPE_SECRET_KEY
    if (!stripeKey) {
      throw new Error('Stripe is not configured')
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2025-09-30.clover' })
    const fee = params.amount * 0.02
    const totalAmount = params.amount + fee

    return stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100),
      currency: 'usd',
      metadata: {
        userId: String(params.userId),
        topupAmount: String(params.amount)
      }
    })
  }

  async processStripeTopup(paymentIntent: { id: string; metadata?: Record<string, string>; amount: number }) {
    const userId = Number(paymentIntent.metadata?.userId)
    const topupAmount = Number(paymentIntent.metadata?.topupAmount)
    if (!userId || !topupAmount) {
      throw new Error('Invalid Stripe payment metadata')
    }

    const existing = await db.balanceTransaction.findFirst({
      where: { userId, reference: paymentIntent.id }
    })
    if (existing) {
      return existing
    }

    return this.addBalance(
      userId,
      topupAmount,
      'TOPUP' as BalanceTransactionType,
      'Stripe wallet topup',
      { reference: paymentIntent.id, meta: { paymentIntentId: paymentIntent.id } }
    )
  }

  async verifyStripeWebhook(signature: string, req: { body: Buffer | string }) {
    const Stripe = (await import('stripe')).default
    const stripeKey = process.env.STRIPE_SECRET_KEY
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!stripeKey || !webhookSecret) {
      return false
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2025-09-30.clover' })
    try {
      stripe.webhooks.constructEvent(
        typeof req.body === 'string' ? req.body : req.body,
        signature,
        webhookSecret
      )
      return true
    } catch {
      return false
    }
  }

  private async notifyPayGateTopupCompletion(user: any, amount: number, paymentMethod: string) {
    try {
      const htmlContent = `
        <h2 style="color: #10b981;">🎉 PayGate Payment Received!</h2>
        <p>Your ${paymentMethod} payment has been processed successfully.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
          <tr>
            <td style="padding: 12px; border: 1px solid #d1d5db; font-weight: bold;">User:</td>
            <td style="padding: 12px; border: 1px solid #d1d5db;">${user.firstName || user.email}</td>
          </tr>
          <tr style="background: #f3f4f6;">
            <td style="padding: 12px; border: 1px solid #d1d5db; font-weight: bold;">Amount Added:</td>
            <td style="padding: 12px; border: 1px solid #d1d5db; color: #22c55e; font-weight: bold;">$${amount.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border: 1px solid #d1d5db; font-weight: bold;">Payment Method:</td>
            <td style="padding: 12px; border: 1px solid #d1d5db;">${paymentMethod}</td>
          </tr>
          <tr style="background: #f3f4f6;">
            <td style="padding: 12px; border: 1px solid #d1d5db; font-weight: bold;">Status:</td>
            <td style="padding: 12px; border: 1px solid #d1d5db;"><span style="background: #dcfce7; color: #166534; padding: 4px 8px; border-radius: 4px; font-weight: bold;">AUTO-APPROVED</span></td>
          </tr>
        </table>
        <p style="color: #6b7280; font-size: 14px;">Your balance has been instantly updated.</p>
      `;

      // Send email to user
      await sendEmail(
        user.email,
        `Your ${paymentMethod} payment of $${amount.toFixed(2)} has been received and processed!`,
        `💰 PayGate Payment Received: $${amount.toFixed(2)}`,
        htmlContent
      ).catch((err: any) => console.error('Failed to notify user:', err));
    } catch (error: any) {
      console.error('[PayGate Notification] Error:', error.message);
      // Non-blocking, don't throw
    }
  }
}
