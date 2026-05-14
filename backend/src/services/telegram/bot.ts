/**
 * Telegram Bot Messaging Service
 * Send messages to Telegram bots using user sessions
 */

import { TelegramService } from './client';
import type { ProxyConfig } from './types';
import db from '../../configs/db';

export interface BotMessageResult {
  success: boolean;
  message: string;
  messageId?: number;
  botUsername?: string;
  phoneNumber?: string;
}

export interface BotMessageRequest {
  phoneNumber: string;
  botUsername: string;
  message: string;
  proxy?: ProxyConfig;
}

/**
 * Bot Service Class
 * Handles sending messages to Telegram bots using user sessions
 */
export class BotService {
  /**
   * Send a message to a Telegram bot using a user's session
   * @param phoneNumber - Phone number of the user session to use
   * @param botUsername - Username of the bot to message (without @)
   * @param message - Message text to send
   * @param proxy - Optional proxy configuration
   */
  static async sendBotMessage(
    phoneNumber: string,
    botUsername: string,
    message: string,
    proxy?: ProxyConfig
  ): Promise<BotMessageResult> {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const cleanBotUsername = botUsername.replace('@', '');

    // Get session from database
    const session = await db.telegramSession.findUnique({
      where: { phoneNumber: cleanPhone },
    });

    if (!session || !session.sessionString) {
      return {
        success: false,
        message: 'No session found for this phone number',
        phoneNumber: cleanPhone,
      };
    }

    if (!session.isAuthorized) {
      return {
        success: false,
        message: 'Session is not authorized',
        phoneNumber: cleanPhone,
      };
    }

    const telegram = new TelegramService({
      phoneNumber: cleanPhone,
      sessionString: session.sessionString,
      proxy,
    });

    try {
      await telegram.connect();

      if (!(await telegram.isAuthorized())) {
        await telegram.disconnect();
        return {
          success: false,
          message: 'Session is no longer authorized',
          phoneNumber: cleanPhone,
        };
      }

      // Send message to the bot
      const sentMessage = await telegram.sendMessage(cleanBotUsername, message);

      await telegram.disconnect();

      return {
        success: true,
        message: 'Message sent successfully',
        messageId: sentMessage.id,
        botUsername: cleanBotUsername,
        phoneNumber: cleanPhone,
      };
    } catch (error: any) {
      await telegram.disconnect().catch(() => {});

      // Handle specific errors
      if (error.message?.includes('USERNAME_NOT_OCCUPIED')) {
        return {
          success: false,
          message: `Bot @${cleanBotUsername} not found`,
          botUsername: cleanBotUsername,
          phoneNumber: cleanPhone,
        };
      }

      if (error.message?.includes('USER_IS_BLOCKED')) {
        return {
          success: false,
          message: `Bot @${cleanBotUsername} has blocked this user`,
          botUsername: cleanBotUsername,
          phoneNumber: cleanPhone,
        };
      }

      if (error.message?.includes('PEER_FLOOD')) {
        return {
          success: false,
          message: 'Too many messages sent. Please wait before sending more.',
          botUsername: cleanBotUsername,
          phoneNumber: cleanPhone,
        };
      }

      return {
        success: false,
        message: `Error sending message: ${error.message}`,
        botUsername: cleanBotUsername,
        phoneNumber: cleanPhone,
      };
    }
  }

  /**
   * Send message and capture the bot's response (for getting user IDs, etc.)
   * @param phoneNumber - Phone number of the user session
   * @param botUsername - Username of the bot
   * @param message - Message to send
   * @param waitForResponse - Whether to wait for bot response
   * @param timeoutMs - Timeout for waiting (default: 10 seconds)
   * @param proxy - Optional proxy
   */
  static async sendMessageAndGetResponse(
    phoneNumber: string,
    botUsername: string,
    message: string,
    waitForResponse: boolean = true,
    timeoutMs: number = 10000,
    proxy?: ProxyConfig
  ): Promise<BotMessageResult & { botResponse?: string }> {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const cleanBotUsername = botUsername.replace('@', '');

    // Get session from database
    const session = await db.telegramSession.findUnique({
      where: { phoneNumber: cleanPhone },
    });

    if (!session || !session.sessionString) {
      return {
        success: false,
        message: 'No session found for this phone number',
        phoneNumber: cleanPhone,
      };
    }

    const telegram = new TelegramService({
      phoneNumber: cleanPhone,
      sessionString: session.sessionString,
      proxy,
    });

    try {
      await telegram.connect();

      if (!(await telegram.isAuthorized())) {
        await telegram.disconnect();
        return {
          success: false,
          message: 'Session is not authorized',
          phoneNumber: cleanPhone,
        };
      }

      // Send message to the bot
      const sentMessage = await telegram.sendMessage(cleanBotUsername, message);

      let botResponse: string | undefined;

      if (waitForResponse) {
        // Wait a bit for bot to respond
        await new Promise((resolve) => setTimeout(resolve, Math.min(timeoutMs, 5000)));

        // Get recent messages from the bot
        const messages = await telegram.getMessages(cleanBotUsername, 5);

        // Find messages newer than ours
        const sentTime = sentMessage.date;
        for (const msg of messages) {
          if (msg.date > sentTime && msg.message) {
            botResponse = msg.message;
            break;
          }
        }
      }

      await telegram.disconnect();

      return {
        success: true,
        message: waitForResponse && botResponse
          ? 'Message sent and response received'
          : 'Message sent successfully',
        messageId: sentMessage.id,
        botUsername: cleanBotUsername,
        phoneNumber: cleanPhone,
        botResponse,
      };
    } catch (error: any) {
      await telegram.disconnect().catch(() => {});

      return {
        success: false,
        message: `Error: ${error.message}`,
        botUsername: cleanBotUsername,
        phoneNumber: cleanPhone,
      };
    }
  }
}
