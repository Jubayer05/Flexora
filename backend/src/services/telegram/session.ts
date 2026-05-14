/**
 * Telegram Session Management Service
 * Handles session creation, authentication, and management
 */

import { TelegramService } from './client';
import type {
  ProxyConfig,
  SessionResult,
  SessionUserInfo,
  SessionListItem,
  SessionListResult,
} from './types';
import db from '../../configs/db';

// In-memory store for pending OTP requests (phone code hash)
const pendingOtpRequests = new Map<
  string,
  {
    phoneCodeHash: string;
    adminId: number;
    createdAt: Date;
    proxy?: ProxyConfig;
  }
>();

/**
 * Helper function to wrap async operations with timeout
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

const getSessionTimeouts = (proxy?: ProxyConfig) => ({
  connect: proxy ? parseInt(process.env.TELEGRAM_PROXY_CONNECT_TIMEOUT_MS || '15000', 10) : 180000,
  request: proxy ? parseInt(process.env.TELEGRAM_PROXY_REQUEST_TIMEOUT_MS || '20000', 10) : 120000,
  authCheck: proxy ? parseInt(process.env.TELEGRAM_PROXY_AUTH_CHECK_TIMEOUT_MS || '10000', 10) : 20000,
  profile: proxy ? parseInt(process.env.TELEGRAM_PROXY_PROFILE_TIMEOUT_MS || '10000', 10) : 10000,
});

/**
 * Session Service Class
 * Handles Telegram session lifecycle management
 */
export class SessionService {
  /**
   * Create a new Telegram session (Step 1: Send code request)
   * @param phoneNumber - Phone number to create session for
   * @param adminId - Admin ID who is creating the session
   * @param proxy - Optional proxy configuration
   */
  static async createSession(
    phoneNumber: string,
    adminId: number,
    proxy?: ProxyConfig
  ): Promise<SessionResult> {
    const cleanPhone = phoneNumber.replace(/\D/g, '');

    // Check if session already exists in database
    const existingSession = await db.telegramSession.findUnique({
      where: { phoneNumber: cleanPhone },
    });

    if (existingSession?.isAuthorized) {
      return {
        success: true,
        message: 'Session already exists and is authorized',
        phoneNumber: cleanPhone,
        sessionExists: true,
        isAuthorized: true,
        proxy,
        userInfo: existingSession.username
          ? {
              id: existingSession.userId?.toString() || '',
              username: existingSession.username || undefined,
              firstName: existingSession.firstName || undefined,
              lastName: existingSession.lastName || undefined,
            }
          : undefined,
      };
    }

    const telegram = new TelegramService({
      phoneNumber: cleanPhone,
      sessionString: existingSession?.sessionString || '',
      proxy,
    });
    const timeouts = getSessionTimeouts(proxy);

    try {
      console.log(`[SessionService] Starting connection for phone: ${cleanPhone}`);
      await withTimeout(telegram.connect(), timeouts.connect);
      console.log(`[SessionService] Connected successfully for phone: ${cleanPhone}`);

      // Check if already authorized (with timeout)
      if (await withTimeout(telegram.isAuthorized(), timeouts.authCheck)) {
        const me = await withTimeout(telegram.getMe(), timeouts.profile);
        const sessionString = telegram.getSessionString();

        // Update or create session in database
        await db.telegramSession.upsert({
          where: { phoneNumber: cleanPhone },
          create: {
            phoneNumber: cleanPhone,
            sessionString,
            isAuthorized: true,
            userId: BigInt(me.id.toString()),
            username: me.username || null,
            firstName: me.firstName || null,
            lastName: me.lastName || null,
            createdBy: adminId,
          },
          update: {
            sessionString,
            isAuthorized: true,
            userId: BigInt(me.id.toString()),
            username: me.username || null,
            firstName: me.firstName || null,
            lastName: me.lastName || null,
          },
        });

        await telegram.disconnect();

      return {
        success: true,
        message: 'Session already authorized',
        phoneNumber: cleanPhone,
        sessionExists: true,
        isAuthorized: true,
        proxy,
        userInfo: {
            id: me.id.toString(),
            username: me.username || undefined,
            firstName: me.firstName || undefined,
            lastName: me.lastName || undefined,
          },
        };
      }

      // Send code request (with timeout)
      console.log(`[SessionService] Sending code request for phone: ${cleanPhone}`);
      const { phoneCodeHash } = await withTimeout(telegram.sendCodeRequest(), timeouts.request);
      console.log(`[SessionService] Code sent successfully, phone code hash: ${phoneCodeHash.substring(0, 20)}...`);

      // Store pending request
      pendingOtpRequests.set(cleanPhone, {
        phoneCodeHash,
        adminId,
        createdAt: new Date(),
        proxy,
      });

      // Store pending OTP request in database
      await db.telegramOtpRequest.create({
        data: {
          phoneNumber: cleanPhone,
          phoneCodeHash,
          status: 'pending',
          customerId: adminId,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        },
      });

      // Save partial session
      const sessionString = telegram.getSessionString();
      await db.telegramSession.upsert({
        where: { phoneNumber: cleanPhone },
        create: {
          phoneNumber: cleanPhone,
          sessionString,
          isAuthorized: false,
          createdBy: adminId,
        },
        update: {
          sessionString,
          isAuthorized: false,
        },
      });

      await telegram.disconnect();

      return {
        success: true,
        message: 'OTP sent to Telegram. Please submit the code.',
        phoneNumber: cleanPhone,
        sessionExists: false,
        isAuthorized: false,
        proxy,
      };
    } catch (error: any) {
      await telegram.disconnect().catch(() => {});

      console.error('[SessionService] Error creating session:', {
        phone: cleanPhone,
        error: error.message,
        stack: error.stack,
      });

      // Handle timeout errors
      if (error.message?.includes('timed out')) {
      return {
        success: false,
        message: 'Connection timeout. Telegram server did not respond. Please try again.',
        phoneNumber: cleanPhone,
        proxy,
      };
      }

      // Handle specific Telegram errors
      if (error.message?.includes('PHONE_NUMBER_INVALID')) {
      return {
        success: false,
        message: 'Invalid phone number format',
        phoneNumber: cleanPhone,
        proxy,
      };
      }

      if (error.message?.includes('PHONE_NUMBER_BANNED')) {
      return {
        success: false,
        message: 'This phone number is banned from Telegram',
        phoneNumber: cleanPhone,
        proxy,
      };
      }

      if (error.message?.includes('FLOOD_WAIT')) {
        const waitTime = error.message.match(/FLOOD_WAIT_(\d+)/)?.[1] || '60';
      return {
        success: false,
        message: `Too many attempts. Please wait ${waitTime} seconds.`,
        phoneNumber: cleanPhone,
        proxy,
      };
      }

      if (error.message?.includes('PHONE_NUMBER_OCCUPIED')) {
      return {
        success: false,
        message: 'This phone number is already registered. Please use a different number.',
        phoneNumber: cleanPhone,
        proxy,
      };
      }

      return {
        success: false,
        message: `Error creating session: ${error.message || 'Unknown error'}`,
        phoneNumber: cleanPhone,
        proxy,
      };
    }
  }

  /**
   * Submit OTP to complete session authentication (Step 2)
   * @param phoneNumber - Phone number
   * @param otpCode - OTP code received
   * @param adminId - Admin ID
   * @param password2FA - Optional 2FA password
   * @param proxy - Optional proxy configuration
   */
  static async submitOtp(
    phoneNumber: string,
    otpCode: string,
    adminId: number,
    password2FA?: string,
    proxy?: ProxyConfig
  ): Promise<SessionResult> {
    const cleanPhone = phoneNumber.replace(/\D/g, '');

    // Get pending request
    const pendingRequest = pendingOtpRequests.get(cleanPhone);

    // Also check database for phoneCodeHash
    const dbRequest = await db.telegramOtpRequest.findFirst({
      where: {
        phoneNumber: cleanPhone,
        status: 'pending',
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    const phoneCodeHash =
      pendingRequest?.phoneCodeHash || dbRequest?.phoneCodeHash;
    const proxyToUse = proxy || pendingRequest?.proxy;

    if (!phoneCodeHash) {
      return {
        success: false,
        message:
          'No pending OTP request found. Please create a new session first.',
        phoneNumber: cleanPhone,
      };
    }

    // Get session from database
    const session = await db.telegramSession.findUnique({
      where: { phoneNumber: cleanPhone },
    });

    const telegram = new TelegramService({
      phoneNumber: cleanPhone,
      sessionString: session?.sessionString || '',
      proxy: proxyToUse,
    });
    const timeouts = getSessionTimeouts(proxyToUse);

    try {
      console.log(`[SessionService] Connecting to verify OTP for phone: ${cleanPhone}`);
      await withTimeout(telegram.connect(), timeouts.connect);

      // Sign in with OTP (with timeout)
      console.log(`[SessionService] Submitting OTP for phone: ${cleanPhone}`);
      const user = await withTimeout(telegram.signIn(otpCode, phoneCodeHash, password2FA), timeouts.request);
      console.log(`[SessionService] OTP verified successfully for user: ${user.username || user.id}`);

      const sessionString = telegram.getSessionString();

      // Update session in database
      await db.telegramSession.upsert({
        where: { phoneNumber: cleanPhone },
        create: {
          phoneNumber: cleanPhone,
          sessionString,
          isAuthorized: true,
          userId: BigInt(user.id.toString()),
          username: user.username || null,
          firstName: user.firstName || null,
          lastName: user.lastName || null,
          createdBy: adminId,
        },
        update: {
          sessionString,
          isAuthorized: true,
          userId: BigInt(user.id.toString()),
          username: user.username || null,
          firstName: user.firstName || null,
          lastName: user.lastName || null,
        },
      });

      // Mark OTP request as completed
      if (dbRequest) {
        await db.telegramOtpRequest.update({
          where: { id: dbRequest.id },
          data: { status: 'completed' },
        });
      }

      // Clean up pending request
      pendingOtpRequests.delete(cleanPhone);

      await telegram.disconnect();

      return {
        success: true,
        message: 'Session created successfully',
        phoneNumber: cleanPhone,
        sessionExists: true,
        isAuthorized: true,
        proxy: proxyToUse,
        userInfo: {
          id: user.id.toString(),
          username: user.username || undefined,
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
        },
      };
    } catch (error: any) {
      await telegram.disconnect().catch(() => {});

      console.error('[SessionService.submitOtp] Error:', {
        phone: cleanPhone,
        error: error.message,
      });

      // Handle timeout errors
      if (error.message?.includes('timed out')) {
        return {
          success: false,
          message: 'Connection timeout. Telegram server did not respond. Please try again.',
          phoneNumber: cleanPhone,
          proxy: proxyToUse,
        };
      }

      // Handle 2FA required
      if (error.message === '2FA_REQUIRED') {
        return {
          success: false,
          message: 'Two-factor authentication required. Please provide password.',
          phoneNumber: cleanPhone,
          requires2FA: true,
          proxy: proxyToUse,
        };
      }

      // Handle invalid code
      if (
        error.message?.includes('PHONE_CODE_INVALID') ||
        error.message?.includes('PHONE_CODE_EXPIRED')
      ) {
        return {
          success: false,
          message: 'Invalid or expired OTP code. Please try again.',
          phoneNumber: cleanPhone,
          proxy: proxyToUse,
        };
      }

      // Handle wrong 2FA password
      if (error.message?.includes('PASSWORD_HASH_INVALID')) {
        return {
          success: false,
          message: 'Invalid 2FA password',
          phoneNumber: cleanPhone,
          requires2FA: true,
          proxy: proxyToUse,
        };
      }

      return {
        success: false,
        message: `Error submitting OTP: ${error.message || 'Unknown error'}`,
        phoneNumber: cleanPhone,
        proxy: proxyToUse,
      };
    }
  }

  /**
   * Get session status for a phone number
   * @param phoneNumber - Phone number to check
   * @param proxy - Optional proxy configuration
   */
  static async getSessionStatus(
    phoneNumber: string,
    proxy?: ProxyConfig
  ): Promise<SessionResult> {
    const cleanPhone = phoneNumber.replace(/\D/g, '');

    // Get session from database
    const session = await db.telegramSession.findUnique({
      where: { phoneNumber: cleanPhone },
    });

    if (!session) {
      return {
        success: true,
        message: 'No session found for this phone number',
        phoneNumber: cleanPhone,
        sessionExists: false,
        isAuthorized: false,
      };
    }

    // If we have a session, verify it's still valid
    const telegram = new TelegramService({
      phoneNumber: cleanPhone,
      sessionString: session.sessionString,
      proxy,
    });

    try {
      // Add 20 second timeout to connection
      await withTimeout(telegram.connect(), 20000);
      const isAuthorized = await withTimeout(telegram.isAuthorized(), 10000);

      let userInfo: SessionUserInfo | undefined;
      if (isAuthorized) {
        const me = await withTimeout(telegram.getMe(), 10000);
        userInfo = {
          id: me.id.toString(),
          username: me.username || undefined,
          firstName: me.firstName || undefined,
          lastName: me.lastName || undefined,
          phone: me.phone || undefined,
        };

        // Update session if authorization status changed
        if (!session.isAuthorized) {
          await db.telegramSession.update({
            where: { phoneNumber: cleanPhone },
            data: {
              isAuthorized: true,
              userId: BigInt(me.id.toString()),
              username: me.username || null,
              firstName: me.firstName || null,
              lastName: me.lastName || null,
            },
          });
        }
      }

      await telegram.disconnect();

      return {
        success: true,
        message: isAuthorized ? 'Session is active and authorized' : 'Session exists but not authorized',
        phoneNumber: cleanPhone,
        sessionExists: true,
        isAuthorized,
        userInfo,
      };
    } catch (error: any) {
      await telegram.disconnect().catch(() => {});

      return {
        success: true,
        message: 'Session exists but connection failed',
        phoneNumber: cleanPhone,
        sessionExists: true,
        isAuthorized: false,
      };
    }
  }

  /**
   * Delete a session
   * @param phoneNumber - Phone number to delete session for
   */
  static async deleteSession(phoneNumber: string): Promise<SessionResult> {
    const cleanPhone = phoneNumber.replace(/\D/g, '');

    // Delete from database
    const session = await db.telegramSession.findUnique({
      where: { phoneNumber: cleanPhone },
    });

    if (!session) {
      return {
        success: false,
        message: 'No session found for this phone number',
        phoneNumber: cleanPhone,
      };
    }

    await db.telegramSession.delete({
      where: { phoneNumber: cleanPhone },
    });

    // Also delete any pending OTP requests
    await db.telegramOtpRequest.deleteMany({
      where: { phoneNumber: cleanPhone },
    });

    // Clean up in-memory pending requests
    pendingOtpRequests.delete(cleanPhone);

    return {
      success: true,
      message: 'Session deleted successfully',
      phoneNumber: cleanPhone,
    };
  }

  /**
   * List all sessions
   */
  static async listSessions(): Promise<SessionListResult> {
    const sessions = await db.telegramSession.findMany({
      orderBy: { updatedAt: 'desc' },
    });

    const sessionList: SessionListItem[] = sessions.map((session) => ({
      phoneNumber: session.phoneNumber,
      isAuthorized: session.isAuthorized,
      username: session.username,
      firstName: session.firstName,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    }));

    return {
      success: true,
      sessions: sessionList,
      total: sessions.length,
    };
  }

  /**
   * Clean up expired OTP requests
   */
  static async cleanupExpiredRequests(): Promise<void> {
    // Clean up database
    await db.telegramOtpRequest.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    // Clean up in-memory store (requests older than 10 minutes)
    const now = Date.now();
    for (const [phone, request] of pendingOtpRequests.entries()) {
      if (now - request.createdAt.getTime() > 10 * 60 * 1000) {
        pendingOtpRequests.delete(phone);
      }
    }
  }

  /**
   * Read the currently pending proxy for a phone number
   */
  static getPendingProxy(phoneNumber: string): ProxyConfig | undefined {
    const cleanPhone = phoneNumber.replace(/\D/g, '')
    return pendingOtpRequests.get(cleanPhone)?.proxy
  }
}
