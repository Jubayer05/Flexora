import axios from 'axios';
import db from '../configs/db';

interface TelegramConfig {
  order: {
    token: string;
    chatId: string;
  };
  general: {
    token: string;
    chatId: string;
  };
  transfer?: {
    token: string;
    chatId: string;
  };
  premium?: {
    token: string;
    chatId: string;
  };
}

export type NotificationType =
  | 'order'
  | 'transfer'
  | 'premium'
  | 'system_error'
  | 'session_issue'
  | 'general';

export class TelegramNotificationService {
  private config: TelegramConfig | null = null;

  /**
   * Load Telegram configuration from settings database
   */
  private async loadConfig(): Promise<TelegramConfig | null> {
    try {
      const setting = await db.settings.findUnique({
        where: { key: 'telegram_config' },
      });

      if (!setting || !setting.value) {
        console.warn('⚠️  Telegram config not found in settings table');
        return null;
      }

      this.config = setting.value as any as TelegramConfig;
      console.log('✅ Telegram config loaded successfully');
      console.log(
        '📱 Order bot configured:',
        !!this.config.order?.token && !!this.config.order?.chatId
      );
      console.log(
        '📱 General bot configured:',
        !!this.config.general?.token && !!this.config.general?.chatId
      );

      return this.config;
    } catch (error) {
      console.error('❌ Failed to load Telegram config:', error);
      return null;
    }
  }

  /**
   * Get cached config or reload if needed
   */
  private async getConfig(): Promise<TelegramConfig | null> {
    if (!this.config) {
      await this.loadConfig();
    }
    return this.config;
  }

  /**
   * Send message to Telegram using bot API
   */
  private async sendMessage(
    token: string,
    chatId: string,
    message: string,
    parseMode: 'HTML' | 'Markdown' = 'HTML'
  ): Promise<boolean> {
    try {
      const url = `https://api.telegram.org/bot${token}/sendMessage`;

      const response = await axios.post(url, {
        chat_id: chatId,
        text: message,
        parse_mode: parseMode,
      });

      console.log('📤 Telegram message sent successfully');
      return true;
    } catch (error: any) {
      console.error('❌ Failed to send Telegram message:', error.response?.data || error.message);
      return false;
    }
  }

  /**
   * Send a direct test message using explicit token/chatId values
   */
  async sendCustomTestNotification(
    type: 'general' | 'order' | 'transfer' | 'premium',
    token: string,
    chatId: string
  ): Promise<boolean> {
    const titleMap = {
      general: 'General Notification',
      order: 'Order Notification',
      transfer: 'Transfer Notification',
      premium: 'Premium Notification',
    } as const;

    const message = `
🧪 <b>Telegram Config Test</b>

<b>Type:</b> ${titleMap[type]}
<b>Status:</b> Connected successfully
<b>Time:</b> ${new Date().toLocaleString()}
    `.trim();

    return await this.sendMessage(token, chatId, message, 'HTML');
  }

  /**
   * Send order creation notification to business owner
   */
  async sendOrderNotification(orderData: {
    orderId?: number;
    orderNumber: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    total: number;
    subtotal: number;
    discount: number;
    itemsCount: number;
    customer?: {
      id: number;
      email: string;
      firstName: string;
    };
    items: Array<{
      productName: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>;
    status: string;
    createdAt: Date;
  }): Promise<boolean> {
    try {
      console.log('📨 Attempting to send order notification for:', orderData.orderNumber);

      const config = await this.getConfig();

      if (!config) {
        console.warn('⚠️  Config is null, cannot send notification');
        return false;
      }

      if (!config.order?.token || !config.order?.chatId) {
        console.warn('⚠️  Order notification config not configured properly');
        console.warn('   Token exists:', !!config.order?.token);
        console.warn('   ChatId exists:', !!config.order?.chatId);
        return false;
      }

      console.log('✅ Config validated, preparing message...');

      // Format items list
      const itemsList = orderData.items
        .map(
          (item, index) =>
            `${index + 1}. <b>${item.productName}</b>\n` +
            `   • Quantity: ${item.quantity}\n` +
            `   • Unit Price: $${item.unitPrice.toFixed(2)}\n` +
            `   • Total: $${item.totalPrice.toFixed(2)}`
        )
        .join('\n\n');

      // Build notification message
      const message = `
🛒 <b>NEW ORDER RECEIVED</b>

📋 <b>Order Details:</b>
• Order ID: <code>#${orderData.orderId || 'N/A'}</code>
• Order Number: <code>${orderData.orderNumber}</code>
• Status: <b>${orderData.status}</b>
• Date: ${orderData.createdAt.toLocaleString()}

👤 <b>Customer Information:</b>
• Name/Username: ${orderData.customerName || orderData.customer?.firstName || 'N/A'}
• Email: ${orderData.customerEmail || orderData.customer?.email || 'N/A'}

🛍️ <b>Order Items (${orderData.itemsCount}):</b>
${itemsList}

💰 <b>Payment Summary:</b>
• Subtotal: $${orderData.subtotal.toFixed(2)}
• Discount: -$${orderData.discount.toFixed(2)}
• <b>Total: $${orderData.total.toFixed(2)}</b>

---
View order details in admin panel.
      `.trim();

      const success = await this.sendMessage(
        config.order.token,
        config.order.chatId,
        message,
        'HTML'
      );

      if (success) {
        console.log(`✅ Order notification sent for ${orderData.orderNumber}`);
      } else {
        console.error(`❌ Failed to send order notification for ${orderData.orderNumber}`);
      }

      return success;
    } catch (error) {
      console.error('Error sending order notification:', error);
      return false;
    }
  }

  /**
   * Send general notification using general bot config
   */
  async sendGeneralNotification(message: string): Promise<boolean> {
    try {
      const config = await this.getConfig();
      if (!config?.general?.token || !config?.general?.chatId) {
        console.warn('General notification config not configured');
        return false;
      }

      return await this.sendMessage(config.general.token, config.general.chatId, message, 'HTML');
    } catch (error) {
      console.error('Error sending general notification:', error);
      return false;
    }
  }

  /**
   * Reload configuration from database (useful after settings update)
   */
  async reloadConfig(): Promise<void> {
    this.config = null;
    await this.loadConfig();
  }

  // ================================
  // TRANSFER NOTIFICATIONS
  // ================================

  /**
   * Send transfer status notification to admin
   */
  async sendTransferNotification(data: {
    orderId?: number;
    transferId: number;
    orderNumber: string;
    productName?: string;
    customerEmail?: string;
    targetUrl: string;
    customerTelegram: string;
    status: string;
    customerName?: string;
    error?: string;
  }): Promise<boolean> {
    try {
      const config = await this.getConfig();
      const botConfig = config?.transfer || config?.general;

      if (!botConfig?.token || !botConfig?.chatId) {
        console.warn('Transfer notification config not configured');
        return false;
      }

      const statusEmoji: Record<string, string> = {
        PENDING: '⏳',
        VERIFICATION_REQUIRED: '🔔',
        CUSTOMER_JOINED: '✅',
        TRANSFER_IN_PROGRESS: '⚡',
        WAITING_PERIOD: '⏰',
        COMPLETING: '🔄',
        COMPLETED: '🎉',
        FAILED: '❌',
      };

      const emoji = statusEmoji[data.status] || '📋';

      const message = `
${emoji} <b>TRANSFER UPDATE</b>

📋 <b>Transfer Details:</b>
• Transfer ID: <code>#${data.transferId}</code>
${data.orderId ? `• Order ID: <code>#${data.orderId}</code>` : ''}
• Order: <code>${data.orderNumber}</code>
• Status: <b>${data.status}</b>
${data.productName ? `• Product: <b>${data.productName}</b>` : ''}

🎯 <b>Target:</b>
• Group/Channel: ${data.targetUrl}
• Customer: ${data.customerTelegram}
${data.customerName ? `• Name: ${data.customerName}` : ''}
${data.customerEmail ? `• Email: ${data.customerEmail}` : ''}

${data.error ? `\n❌ <b>Error:</b> ${data.error}` : ''}

🕐 Time: ${new Date().toLocaleString()}
      `.trim();

      return await this.sendMessage(botConfig.token, botConfig.chatId, message, 'HTML');
    } catch (error) {
      console.error('Error sending transfer notification:', error);
      return false;
    }
  }

  // ================================
  // PREMIUM NOTIFICATIONS
  // ================================

  /**
   * Send premium subscription notification
   */
  async sendPremiumNotification(data: {
    username: string;
    duration: string;
    orderId?: number;
    customerEmail?: string;
    productName?: string;
    status: 'pending' | 'completed' | 'failed';
    transactionId?: string;
    error?: string;
  }): Promise<boolean> {
    try {
      const config = await this.getConfig();
      const botConfig = config?.premium || config?.general;

      if (!botConfig?.token || !botConfig?.chatId) {
        console.warn('Premium notification config not configured');
        return false;
      }

      const statusEmoji = data.status === 'completed' ? '✅' : data.status === 'failed' ? '❌' : '⏳';

      // Hydrate optional fields from order when not provided
      let resolvedEmail = data.customerEmail;
      let resolvedProductName = data.productName;
      if (data.orderId && (!resolvedEmail || !resolvedProductName)) {
        const order = await db.order.findUnique({
          where: { id: data.orderId },
          include: {
            product: {
              select: {
                name: true,
              },
            },
            user: {
              select: {
                email: true,
              },
            },
          },
        });

        if (order) {
          resolvedEmail = resolvedEmail || order.user?.email || order.guestEmail || undefined;
          resolvedProductName = resolvedProductName || order.product?.name || undefined;
        }
      }

      const message = `
${statusEmoji} <b>PREMIUM SUBSCRIPTION</b>

👤 <b>User:</b> @${data.username}
${resolvedEmail ? `📧 <b>Email:</b> ${resolvedEmail}` : ''}
${resolvedProductName ? `📦 <b>Product:</b> ${resolvedProductName}` : ''}
📅 <b>Duration:</b> ${data.duration}
📊 <b>Status:</b> ${data.status.toUpperCase()}
${data.orderId ? `📋 <b>Order ID:</b> #${data.orderId}` : ''}
${data.transactionId ? `🔗 <b>Transaction:</b> ${data.transactionId}` : ''}
${data.error ? `\n❌ <b>Error:</b> ${data.error}` : ''}

🕐 Time: ${new Date().toLocaleString()}
      `.trim();

      return await this.sendMessage(botConfig.token, botConfig.chatId, message, 'HTML');
    } catch (error) {
      console.error('Error sending premium notification:', error);
      return false;
    }
  }

  // ================================
  // SYSTEM NOTIFICATIONS
  // ================================

  /**
   * Send system error notification
   */
  async sendErrorNotification(data: {
    type: string;
    message: string;
    details?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
  }): Promise<boolean> {
    try {
      const config = await this.getConfig();
      if (!config?.general?.token || !config?.general?.chatId) {
        return false;
      }

      const severityEmoji: Record<string, string> = {
        low: '⚠️',
        medium: '🔶',
        high: '🔴',
        critical: '🚨',
      };

      const emoji = severityEmoji[data.severity || 'medium'];

      const notification = `
${emoji} <b>SYSTEM ALERT</b>

📛 <b>Type:</b> ${data.type}
📝 <b>Message:</b> ${data.message}
${data.details ? `\n📋 <b>Details:</b>\n<pre>${data.details}</pre>` : ''}
⏰ <b>Severity:</b> ${(data.severity || 'medium').toUpperCase()}

🕐 Time: ${new Date().toLocaleString()}
      `.trim();

      return await this.sendMessage(config.general.token, config.general.chatId, notification, 'HTML');
    } catch (error) {
      console.error('Error sending error notification:', error);
      return false;
    }
  }

  /**
   * Send session issue notification (kicked, expired, etc.)
   */
  async sendSessionIssueNotification(data: {
    phoneNumber: string;
    issue: 'kicked' | 'expired' | 'unauthorized' | 'error';
    productName?: string;
    orderId?: number;
    details?: string;
  }): Promise<boolean> {
    try {
      const config = await this.getConfig();
      if (!config?.general?.token || !config?.general?.chatId) {
        return false;
      }

      const issueEmoji: Record<string, string> = {
        kicked: '🚫',
        expired: '⏰',
        unauthorized: '🔒',
        error: '❌',
      };

      const message = `
${issueEmoji[data.issue]} <b>SESSION ISSUE</b>

📱 <b>Phone:</b> <code>${data.phoneNumber}</code>
⚠️ <b>Issue:</b> ${data.issue.toUpperCase()}
${data.productName ? `📦 <b>Product:</b> ${data.productName}` : ''}
${data.orderId ? `📋 <b>Order:</b> #${data.orderId}` : ''}
${data.details ? `\n📝 <b>Details:</b> ${data.details}` : ''}

🕐 Time: ${new Date().toLocaleString()}

⚡ Action may be required.
      `.trim();

      return await this.sendMessage(config.general.token, config.general.chatId, message, 'HTML');
    } catch (error) {
      console.error('Error sending session issue notification:', error);
      return false;
    }
  }

  // ================================
  // BULK NOTIFICATIONS
  // ================================

  /**
   * Send notification to multiple chats
   */
  async sendBulkNotification(
    chatIds: string[],
    message: string,
    type: NotificationType = 'general'
  ): Promise<{ success: number; failed: number }> {
    const config = await this.getConfig();
    const botConfig = type === 'order' ? config?.order : config?.general;

    if (!botConfig?.token) {
      return { success: 0, failed: chatIds.length };
    }

    let success = 0;
    let failed = 0;

    for (const chatId of chatIds) {
      try {
        await this.sendMessage(botConfig.token, chatId, message, 'HTML');
        success++;
        // Add delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch {
        failed++;
      }
    }

    return { success, failed };
  }

  /**
   * Send daily summary notification
   */
  async sendDailySummary(data: {
    totalOrders: number;
    totalRevenue: number;
    newCustomers: number;
    completedTransfers: number;
    failedTransfers: number;
    premiumActivations: number;
  }): Promise<boolean> {
    try {
      const config = await this.getConfig();
      if (!config?.general?.token || !config?.general?.chatId) {
        return false;
      }

      const message = `
📊 <b>DAILY SUMMARY</b>

📅 Date: ${new Date().toLocaleDateString()}

🛒 <b>Orders:</b>
• Total Orders: ${data.totalOrders}
• Revenue: $${data.totalRevenue.toFixed(2)}
• New Customers: ${data.newCustomers}

📲 <b>Telegram:</b>
• Completed Transfers: ${data.completedTransfers}
• Failed Transfers: ${data.failedTransfers}
• Premium Activations: ${data.premiumActivations}

---
Generated at ${new Date().toLocaleTimeString()}
      `.trim();

      return await this.sendMessage(config.general.token, config.general.chatId, message, 'HTML');
    } catch (error) {
      console.error('Error sending daily summary:', error);
      return false;
    }
  }
}

// Export singleton instance
export const telegramNotificationService = new TelegramNotificationService();
