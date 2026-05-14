/**
 * OTP Delivery Service
 * Handles sending OTP codes to customers via Telegram bot
 * Now uses Node.js Telegram services instead of Python
 */

import { BotService } from './telegram/bot';
import db from '../configs/db';

export class OTPDeliveryService {
  /**
   * Send OTP to customer via Telegram bot
   * Uses stored chat ID from when customer first messaged the bot
   */
  async sendOTPToCustomer(
    phoneNumber: string,
    otpCode: string
  ): Promise<{
    success: boolean;
    message: string;
    chatId?: number;
  }> {
    try {
      // Look up customer's Telegram chat ID from database
      const customerChat = await db.customerTelegramData.findUnique({
        where: { phoneNumber },
      });

      if (!customerChat) {
        return {
          success: false,
          message: 'Customer has not registered with the Telegram bot',
        };
      }

      // Use the Telegram bot to send the OTP message
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!botToken) {
        return {
          success: false,
          message: 'Telegram bot token not configured',
        };
      }

      // Send message via Telegram Bot API
      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: customerChat.chatId,
            text: `🔐 Your verification code is: ${otpCode}\n\nThis code will expire in 5 minutes.`,
            parse_mode: 'HTML',
          }),
        }
      );

      const result = (await response.json()) as any;

      if (result.ok) {
        console.log(`✅ OTP sent to customer ${phoneNumber}: ${otpCode}`);
        return {
          success: true,
          message: 'OTP delivered to customer via Telegram bot',
          chatId: Number(customerChat.chatId),
        };
      } else {
        console.error(`❌ Failed to send OTP to ${phoneNumber}:`, result.description);
        return {
          success: false,
          message: result.description || 'Failed to send OTP via bot',
        };
      }
    } catch (error) {
      console.error(`❌ Error sending OTP to ${phoneNumber}:`, error);
      return {
        success: false,
        message: 'Failed to communicate with OTP delivery service',
      };
    }
  }

  /**
   * Check if customer has registered their chat ID with the bot
   * Returns true if customer can receive OTP via bot
   */
  async isCustomerRegistered(phoneNumber: string): Promise<{
    registered: boolean;
    chatData?: any;
  }> {
    try {
      const customerChat = await db.customerTelegramData.findUnique({
        where: { phoneNumber },
      });

      if (customerChat) {
        return {
          registered: true,
          chatData: {
            chatId: customerChat.chatId,
            username: customerChat.username,
            firstName: customerChat.firstName,
            registeredAt: customerChat.createdAt,
          },
        };
      } else {
        return {
          registered: false,
        };
      }
    } catch (error) {
      console.error(`❌ Error checking customer registration for ${phoneNumber}:`, error);
      return {
        registered: false,
      };
    }
  }

  /**
   * Get all registered customers for admin purposes
   */
  async getAllRegisteredCustomers(): Promise<{
    success: boolean;
    customers: any[];
    total: number;
  }> {
    try {
      const customers = await db.customerTelegramData.findMany({
        orderBy: { createdAt: 'desc' },
      });

      return {
        success: true,
        customers: customers.map((c: any) => ({
          phoneNumber: c.phoneNumber,
          chatId: c.chatId,
          username: c.username,
          firstName: c.firstName,
          registeredAt: c.createdAt,
        })),
        total: customers.length,
      };
    } catch (error) {
      console.error('❌ Error getting registered customers:', error);
      return {
        success: false,
        customers: [],
        total: 0,
      };
    }
  }
}
