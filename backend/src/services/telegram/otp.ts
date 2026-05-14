/**
 * OTP Detection Service
 * Detects and extracts OTP codes from Telegram messages
 */

import { TelegramService } from './client';
import {
  TELEGRAM_OFFICIAL_IDS,
  OTP_KEYWORDS,
  OTP_PATTERNS,
} from './types';
import type {
  OtpResult,
  OtpDetectionResult,
  ProxyConfig,
} from './types';
import db from '../../configs/db';

/**
 * OTP Service Class
 * Handles OTP detection, extraction, and validation
 */
export class OtpService {
  /**
   * Check for recent OTP messages in Telegram
   * @param phoneNumber - Phone number to check
   * @param customerId - Customer ID for tracking
   * @param minutesBack - How many minutes back to search (default: 30)
   * @param proxy - Optional proxy configuration
   */
  static async checkRecentOtp(
    phoneNumber: string,
    customerId: number,
    minutesBack: number = 30,
    proxy?: ProxyConfig
  ): Promise<OtpResult> {
    const cleanPhone = phoneNumber.replace(/\D/g, '');

    // Get session from database
    const session = await db.telegramSession.findUnique({
      where: { phoneNumber: cleanPhone },
    });

    if (!session || !session.sessionString) {
      return {
        success: false,
        message: 'No session found for this phone number',
      };
    }

    const telegram = new TelegramService({
      phoneNumber,
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
        };
      }

      const cutoffTime = new Date(Date.now() - minutesBack * 60 * 1000);

      // Check messages from each Telegram official account
      for (const senderId of TELEGRAM_OFFICIAL_IDS) {
        try {
          const messages = await telegram.getMessages(senderId, 10);

          for (const msg of messages) {
            if (!msg.message) continue;

            // Check message timestamp
            const msgDate = new Date(msg.date * 1000);
            if (msgDate < cutoffTime) continue;

            // Check if this is an OTP message
            if (this.isOtpMessage(msg.message, senderId)) {
              const otp = this.extractOtp(msg.message);
              if (otp) {
                await telegram.disconnect();
                return {
                  success: true,
                  otp,
                  message: 'OTP found',
                  timestamp: msgDate,
                  expiresAt: new Date(msgDate.getTime() + 5 * 60 * 1000), // OTP typically expires in 5 mins
                };
              }
            }
          }
        } catch (error) {
          // Continue to next sender ID if this one fails
          continue;
        }
      }

      await telegram.disconnect();
      return {
        success: false,
        message: 'No OTP found in recent messages',
      };
    } catch (error: any) {
      await telegram.disconnect().catch(() => {});
      return {
        success: false,
        message: `Error checking OTP: ${error.message}`,
      };
    }
  }

  /**
   * Check if a message is an OTP message
   * @param message - Message text to check
   * @param senderId - Sender ID to validate
   */
  static isOtpMessage(message: string, senderId: number): boolean {
    // Must be from official Telegram account
    if (!TELEGRAM_OFFICIAL_IDS.includes(senderId)) {
      return false;
    }

    const lowerMessage = message.toLowerCase();

    // Must contain at least one OTP keyword
    const hasKeyword = OTP_KEYWORDS.some((keyword) =>
      lowerMessage.includes(keyword)
    );

    // Must contain a digit sequence (potential OTP)
    const hasDigits = OTP_PATTERNS.DIGIT_CODE.test(message);

    // Reset regex lastIndex
    OTP_PATTERNS.DIGIT_CODE.lastIndex = 0;

    return hasKeyword && hasDigits;
  }

  /**
   * Extract OTP code from message
   * @param message - Message text to extract OTP from
   */
  static extractOtp(message: string): string | null {
    // Find all 4-8 digit numbers
    const matches = message.match(OTP_PATTERNS.DIGIT_CODE);
    if (!matches) return null;

    // Filter and prioritize codes
    const validCodes: string[] = [];

    for (const match of matches) {
      // Filter out years (2020-2035)
      if (OTP_PATTERNS.YEAR_PATTERN.test(match)) continue;

      // Filter out repeated digits (1111, 0000)
      if (OTP_PATTERNS.REPEATED_DIGITS.test(match)) continue;

      // Filter out leading zeros for short codes (likely not OTPs)
      if (match.length <= 5 && match.startsWith('0')) continue;

      validCodes.push(match);
    }

    if (validCodes.length === 0) return null;

    // Prefer 5-6 digit codes (standard Telegram OTP length)
    const preferredCode = validCodes.find(
      (code) => code.length >= 5 && code.length <= 6
    );

    return preferredCode ?? validCodes[0] ?? null;
  }

  /**
   * Test OTP detection logic (for debugging)
   * @param message - Test message
   * @param senderId - Test sender ID
   */
  static testOtpDetection(
    message: string,
    senderId: number = 777000
  ): OtpDetectionResult {
    return {
      isOtpMessage: this.isOtpMessage(message, senderId),
      extractedOtp: this.extractOtp(message),
      senderId,
      messageText: message,
    };
  }

  /**
   * Fetch recent messages for debugging
   * @param phoneNumber - Phone number
   * @param limit - Number of messages to fetch
   * @param proxy - Optional proxy
   */
  static async fetchRecentMessages(
    phoneNumber: string,
    limit: number = 5,
    proxy?: ProxyConfig
  ): Promise<{ success: boolean; messages?: any[]; message?: string }> {
    const cleanPhone = phoneNumber.replace(/\D/g, '');

    const session = await db.telegramSession.findUnique({
      where: { phoneNumber: cleanPhone },
    });

    if (!session || !session.sessionString) {
      return {
        success: false,
        message: 'No session found for this phone number',
      };
    }

    const telegram = new TelegramService({
      phoneNumber,
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
        };
      }

      const allMessages: any[] = [];

      // Fetch from each official Telegram account
      for (const senderId of TELEGRAM_OFFICIAL_IDS) {
        try {
          const messages = await telegram.getMessages(senderId, limit);
          for (const msg of messages) {
            if (msg.message) {
              allMessages.push({
                senderId,
                text: msg.message,
                date: new Date(msg.date * 1000),
                isOtp: this.isOtpMessage(msg.message, senderId),
                extractedOtp: this.extractOtp(msg.message),
              });
            }
          }
        } catch (error) {
          continue;
        }
      }

      await telegram.disconnect();

      return {
        success: true,
        messages: allMessages.sort(
          (a, b) => b.date.getTime() - a.date.getTime()
        ),
      };
    } catch (error: any) {
      await telegram.disconnect().catch(() => {});
      return {
        success: false,
        message: `Error fetching messages: ${error.message}`,
      };
    }
  }

  /**
   * Test session connection
   * @param phoneNumber - Phone number to test
   * @param proxy - Optional proxy
   */
  static async testSessionConnection(
    phoneNumber: string,
    proxy?: ProxyConfig
  ): Promise<{
    success: boolean;
    connected?: boolean;
    authorized?: boolean;
    userId?: string;
    message?: string;
  }> {
    const cleanPhone = phoneNumber.replace(/\D/g, '');

    const session = await db.telegramSession.findUnique({
      where: { phoneNumber: cleanPhone },
    });

    if (!session || !session.sessionString) {
      return {
        success: false,
        message: 'No session found for this phone number',
      };
    }

    const telegram = new TelegramService({
      phoneNumber,
      sessionString: session.sessionString,
      proxy,
    });

    try {
      await telegram.connect();
      const authorized = await telegram.isAuthorized();

      let userId: string | undefined;
      if (authorized) {
        const me = await telegram.getMe();
        userId = me.id.toString();
      }

      await telegram.disconnect();

      return {
        success: true,
        connected: true,
        authorized,
        userId,
      };
    } catch (error: any) {
      await telegram.disconnect().catch(() => {});
      return {
        success: false,
        connected: false,
        authorized: false,
        message: `Connection error: ${error.message}`,
      };
    }
  }
}
