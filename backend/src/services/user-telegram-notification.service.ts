import prisma from '../configs/db';
import { telegramBotService } from './telegram-bot.service';

interface SendMessageOptions {
  parseMode?: 'Markdown' | 'HTML';
  disableNotification?: boolean;
}

/**
 * UserTelegramNotificationService
 *
 * Handles sending Telegram messages to individual users via the bot.
 * Users must have initiated contact with the bot first (Telegram requirement).
 * Falls back to in-app notifications if Telegram chatId not available.
 */
export class UserTelegramNotificationService {
  private normalizeTelegramUsername(username?: string | null): string | null {
    if (!username) return null;

    const normalized = username.trim().replace(/^@+/, '').toLowerCase();
    return normalized || null;
  }

  private normalizePhoneNumber(phone?: string | null): string | null {
    if (!phone) return null;

    const digitsOnly = phone.replace(/[^\d+]/g, '');
    if (!digitsOnly) return null;

    return digitsOnly.startsWith('+') ? digitsOnly : `+${digitsOnly}`;
  }

  private async findTelegramChatId(params: {
    telegramUsername?: string | null;
    phone?: string | null;
  }): Promise<number | null> {
    const normalizedUsername = this.normalizeTelegramUsername(params.telegramUsername);
    const normalizedPhone = this.normalizePhoneNumber(params.phone);

    if (normalizedUsername) {
      const usernameMatches = await prisma.customerTelegramData.findFirst({
        where: {
          OR: [
            { username: normalizedUsername },
            { username: `@${normalizedUsername}` },
            { username: { equals: normalizedUsername, mode: 'insensitive' } },
            { username: { equals: `@${normalizedUsername}`, mode: 'insensitive' } },
          ],
        },
        select: { chatId: true },
        orderBy: { updatedAt: 'desc' },
      });

      if (usernameMatches?.chatId) {
        return Number(usernameMatches.chatId);
      }
    }

    if (normalizedPhone) {
      const plainPhone = normalizedPhone.replace(/^\+/, '');
      const phoneMatch = await prisma.customerTelegramData.findFirst({
        where: {
          phoneNumber: {
            in: [normalizedPhone, plainPhone, `+${plainPhone}`],
          },
        },
        select: { chatId: true },
        orderBy: { updatedAt: 'desc' },
      });

      if (phoneMatch?.chatId) {
        return Number(phoneMatch.chatId);
      }
    }

    return null;
  }

  /**
   * Send message to a specific user by userId
   * Looks up user's chatId from CustomerTelegramData table and sends via bot
   */
  async sendToUser(
    userId: number,
    message: string,
    options?: {
      parseMode?: 'Markdown' | 'HTML';
      disableNotification?: boolean;
    }
  ): Promise<{ success: boolean; method: 'telegram' | 'none' }> {
    try {
      // Get user's telegram username / phone for lookup fallback
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { telegramUsername: true, phone: true, email: true, firstName: true },
      });

      if (!user) {
        console.log(`⚠️  User ${userId} not found`);
        return { success: false, method: 'none' };
      }

      if (!user.telegramUsername && !user.phone) {
        console.log(
          `ℹ️  User ${userId} (${user.email}) has no Telegram username or phone - message not sent`
        );
        return { success: false, method: 'none' };
      }

      const chatId = await this.findTelegramChatId({
        telegramUsername: user.telegramUsername,
        phone: user.phone,
      });

      if (!chatId) {
        console.log(
          `ℹ️  User ${userId} (${user.email}) has no matched Telegram chatId - message not sent`
        );
        return { success: false, method: 'none' };
      }

      // Send via Telegram bot
      await telegramBotService.sendMessage(chatId, message, options);

      console.log(
        `✅ Telegram message sent to user ${userId} (${user.firstName || user.email}) at chatId ${chatId}`
      );

      return { success: true, method: 'telegram' };
    } catch (error: any) {
      console.error(`❌ Failed to send Telegram message to user ${userId}:`, error?.message);
      return { success: false, method: 'none' };
    }
  }

  /**
   * Send message to multiple users
   * @param userIds - Array of user IDs
   * @param message - Message content
   * @param options - Optional sending options
   * @returns Summary of delivery results
   */
  async sendToMultipleUsers(
    userIds: number[],
    message: string,
    options?: SendMessageOptions
  ): Promise<{
    total: number;
    sent: number;
    failed: number;
    notConnected: number;
    results: Array<{ userId: number; success: boolean; method: 'telegram' | 'none' }>;
  }> {
    const results: Array<{ userId: number; success: boolean; method: 'telegram' | 'none' }> = [];
    let sent = 0;
    let failed = 0;
    let notConnected = 0;

    for (const userId of userIds) {
      const result = await this.sendToUser(userId, message, options);

      results.push({
        userId,
        success: result.success,
        method: result.method,
      });

      if (result.success) {
        sent++;
      } else if (result.method === 'none') {
        notConnected++;
      } else {
        failed++;
      }

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log(
      `📊 Bulk message results: ${sent} sent, ${failed} failed, ${notConnected} not connected (total: ${userIds.length})`
    );

    return {
      total: userIds.length,
      sent,
      failed,
      notConnected,
      results,
    };
  }

  /**
   * Send formatted notification message
   * @param userId - User ID
   * @param title - Notification title
   * @param message - Notification message
   * @param data - Optional structured data
   */
  async sendNotification(
    userId: number,
    title: string,
    message: string,
    data?: Record<string, any>
  ): Promise<{ success: boolean; method: 'telegram' | 'none' }> {
    const formattedMessage = `
🔔 <b>${title}</b>

${message}
${
  data
    ? `
<i>Details:</i>
${Object.entries(data)
  .map(([key, value]) => `• ${key}: ${value}`)
  .join('\n')}
`
    : ''
}
    `.trim();

    return await this.sendToUser(userId, formattedMessage, { parseMode: 'HTML' });
  }

  /**
   * Send balance transaction notification
   * @param userId - User ID
   * @param amount - Transaction amount
   * @param newBalance - New balance after transaction
   * @param type - Transaction type
   * @param description - Transaction description
   */
  async sendBalanceNotification(
    userId: number,
    amount: number,
    newBalance: number,
    type: string,
    description: string
  ): Promise<{ success: boolean; method: 'telegram' | 'none' }> {
    const isCredit = amount > 0;
    const emoji = isCredit ? '💰' : '💸';
    const action = isCredit ? 'Added' : 'Deducted';

    const message = `
${emoji} <b>Balance ${action}</b>

<b>Amount:</b> $${Math.abs(amount).toFixed(2)}
<b>New Balance:</b> $${newBalance.toFixed(2)}
<b>Type:</b> ${type}
${description ? `<b>Description:</b> ${description}` : ''}

<i>View your balance history in your account dashboard.</i>
    `.trim();

    return await this.sendToUser(userId, message, { parseMode: 'HTML' });
  }

  /**
   * Send order status update notification
   * @param userId - User ID
   * @param orderNumber - Order number
   * @param status - New order status
   * @param total - Order total amount
   */
  async sendOrderStatusUpdate(
    userId: number,
    orderNumber: string,
    status: string,
    total: number
  ): Promise<{ success: boolean; method: 'telegram' | 'none' }> {
    const statusEmojis: Record<string, string> = {
      PENDING: '⏳',
      CONFIRMED: '✅',
      PROCESSING: '⚙️',
      COMPLETED: '🎉',
      CANCELLED: '❌',
      REFUNDED: '💰',
      FAILED: '⚠️',
    };

    const emoji = statusEmojis[status] || '📦';

    const message = `
${emoji} <b>Order Status Update</b>

<b>Order:</b> ${orderNumber}
<b>Status:</b> ${status}
<b>Amount:</b> $${total.toFixed(2)}

<i>Check your order details in the dashboard for more information.</i>
    `.trim();

    return await this.sendToUser(userId, message, { parseMode: 'HTML' });
  }

  /**
   * Send payment confirmation notification
   * @param userId - User ID
   * @param orderNumber - Order number
   * @param amount - Payment amount
   * @param method - Payment method
   */
  async sendPaymentConfirmation(
    userId: number,
    orderNumber: string,
    amount: number,
    method: string
  ): Promise<{ success: boolean; method: 'telegram' | 'none' }> {
    const message = `
💳 <b>Payment Confirmed</b>

<b>Order:</b> ${orderNumber}
<b>Amount:</b> $${amount.toFixed(2)}
<b>Method:</b> ${method}

✅ Your payment has been successfully processed. Your order is being prepared for delivery.

<i>Thank you for your purchase!</i>
    `.trim();

    return await this.sendToUser(userId, message, { parseMode: 'HTML' });
  }

  /**
   * Send refund notification
   * @param userId - User ID
   * @param orderNumber - Order number
   * @param amount - Refund amount
   * @param refundTo - Where refund was sent (BALANCE or GATEWAY)
   */
  async sendRefundNotification(
    userId: number,
    orderNumber: string,
    amount: number,
    refundTo: 'BALANCE' | 'GATEWAY'
  ): Promise<{ success: boolean; method: 'telegram' | 'none' }> {
    const destination =
      refundTo === 'BALANCE' ? 'your account balance' : 'your original payment method';

    const message = `
💰 <b>Refund Processed</b>

<b>Order:</b> ${orderNumber}
<b>Amount:</b> $${amount.toFixed(2)}
<b>Refunded to:</b> ${destination}

Your refund has been successfully processed. ${
      refundTo === 'BALANCE'
        ? 'The funds are now available in your balance.'
        : 'Please allow 5-10 business days for the refund to appear in your account.'
    }

<i>If you have any questions, please contact our support team.</i>
    `.trim();

    return await this.sendToUser(userId, message, { parseMode: 'HTML' });
  }

  /**
   * Send account delivery notification
   * @param userId - User ID
   * @param orderNumber - Order number
   * @param accountCount - Number of accounts delivered
   * @param productName - Product name
   */
  async sendAccountDeliveryNotification(
    userId: number,
    orderNumber: string,
    accountCount: number,
    productName: string
  ): Promise<{ success: boolean; method: 'telegram' | 'none' }> {
    const message = `
🎁 <b>Accounts Delivered!</b>

<b>Order:</b> ${orderNumber}
<b>Product:</b> ${productName}
<b>Quantity:</b> ${accountCount} account${accountCount > 1 ? 's' : ''}

Your accounts are now ready! Check your order details to access your account credentials.

<i>Enjoy your purchase!</i>
    `.trim();

    return await this.sendToUser(userId, message, { parseMode: 'HTML' });
  }

  /**
   * Send topup request notification
   * @param userId - User ID
   * @param amount - Topup amount requested
   */
  async sendTopupRequestNotification(
    userId: number,
    amount: number
  ): Promise<{ success: boolean; method: 'telegram' | 'none' }> {
    const message = `
💳 <b>Topup Request Submitted</b>

<b>Amount:</b> $${amount.toFixed(2)}

Your topup request has been submitted and is now pending review by our team. We will process your request shortly and notify you once it's approved.

<i>Thank you for your patience!</i>
    `.trim();

    return await this.sendToUser(userId, message, { parseMode: 'HTML' });
  }

  /**
   * Send notification when Stripe topup is successful
   * @param userId - User ID
   * @param amount - Topup amount credited
   */
  async sendStripeTopupSuccessNotification(
    userId: number,
    amount: number
  ): Promise<{ success: boolean; method: 'telegram' | 'none' }> {
    const message = `
✅ <b>Wallet Topup Successful!</b>

<b>Amount Credited:</b> $${amount.toFixed(2)}

Your wallet has been successfully topped up! You can now use this balance to purchase products.

Thank you for using our service! 🙏
    `.trim();

    return await this.sendToUser(userId, message, { parseMode: 'HTML' });
  }

  /**
   * Send notification when topup request is rejected
   * @param userId - User ID
   * @param amount - Topup amount that was rejected
   * @param reason - Rejection reason
   */
  async sendTopupRejectionNotification(
    userId: number,
    amount: number,
    reason: string
  ): Promise<{ success: boolean; method: 'telegram' | 'none' }> {
    const message = `
❌ <b>Topup Request Rejected</b>

<b>Amount:</b> $${amount.toFixed(2)}
<b>Reason:</b> ${reason}

Your topup request has been rejected. Please contact support if you have any questions.
    `.trim();

    return await this.sendToUser(userId, message, { parseMode: 'HTML' });
  }
}

// Export singleton instance
export const userTelegramNotificationService = new UserTelegramNotificationService();
