/**
 * Telegram Client Session Service
 * Handles customer-facing session operations:
 * - Re-request verification code
 * - Kick other sessions
 * - Session status checks
 */

import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { Api } from 'telegram/tl';
import bigInt from 'big-integer';
import db from '../../configs/db';
import { withFloodProtection, smartDelay } from './flood-handler';
import {
  telegramCustomerCodeSecurityService,
  type TelegramCodeSecurityState
} from './customer-code-security.service';
import type { ProxyConfig } from './types';

// ================================
// TYPES
// ================================

export interface SessionInfo {
  hash: string;
  deviceModel: string;
  platform: string;
  systemVersion: string;
  apiId: number;
  appName: string;
  appVersion: string;
  dateCreated: Date;
  dateActive: Date;
  ip: string;
  country: string;
  region: string;
  isCurrent: boolean;
  isOfficialApp: boolean;
}

export interface KickSessionResult {
  success: boolean;
  kicked: number;
  remaining: number;
  error?: string;
}

export interface RequestCodeResult {
  success: boolean;
  phoneCodeHash?: string;
  timeout?: number;
  error?: string;
  rateLimit?: TelegramCodeSecurityState;
}

// ================================
// CLIENT SESSION SERVICE
// ================================

export class TelegramClientSessionService {
  private apiId: number;
  private apiHash: string;

  constructor() {
    this.apiId = parseInt(process.env.TELEGRAM_API_ID || '0');
    this.apiHash = process.env.TELEGRAM_API_HASH || '';
  }

  /**
   * Get all active sessions for a phone number
   */
  async getActiveSessions(
    phoneNumber: string,
    proxy?: ProxyConfig
  ): Promise<{ success: boolean; sessions?: SessionInfo[]; error?: string }> {
    try {
      // Get stored session
      const storedSession = await db.telegramSession.findUnique({
        where: { phoneNumber },
      });

      if (!storedSession?.sessionString) {
        return { success: false, error: 'No session found for this phone number' };
      }

      const session = new StringSession(storedSession.sessionString);
      const client = new TelegramClient(session, this.apiId, this.apiHash, {
        connectionRetries: 5,
        ...(proxy && {
          proxy: {
            socksType: proxy.type === 'socks5' ? 5 : 4,
            ip: proxy.host,
            port: proxy.port,
            username: proxy.username,
            password: proxy.password,
          },
        }),
      });

      await client.connect();

      if (!(await client.isUserAuthorized())) {
        await client.disconnect();
        return { success: false, error: 'Session is not authorized' };
      }

      // Get all authorizations
      const result = await withFloodProtection(
        () => client.invoke(new Api.account.GetAuthorizations()),
        phoneNumber
      );

      await client.disconnect();

      const sessions: SessionInfo[] = result.authorizations.map((auth: any) => ({
        hash: auth.hash.toString(),
        deviceModel: auth.deviceModel,
        platform: auth.platform,
        systemVersion: auth.systemVersion,
        apiId: auth.apiId,
        appName: auth.appName,
        appVersion: auth.appVersion,
        dateCreated: new Date(auth.dateCreated * 1000),
        dateActive: new Date(auth.dateActive * 1000),
        ip: auth.ip,
        country: auth.country,
        region: auth.region,
        isCurrent: auth.current,
        isOfficialApp: auth.officialApp,
      }));

      return { success: true, sessions };
    } catch (error: any) {
      console.error('Failed to get active sessions:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Kick all other sessions (keep current one)
   */
  async kickOtherSessions(
    phoneNumber: string,
    proxy?: ProxyConfig
  ): Promise<KickSessionResult> {
    try {
      const storedSession = await db.telegramSession.findUnique({
        where: { phoneNumber },
      });

      if (!storedSession?.sessionString) {
        return { success: false, kicked: 0, remaining: 0, error: 'No session found' };
      }

      const session = new StringSession(storedSession.sessionString);
      const client = new TelegramClient(session, this.apiId, this.apiHash, {
        connectionRetries: 5,
        ...(proxy && {
          proxy: {
            socksType: proxy.type === 'socks5' ? 5 : 4,
            ip: proxy.host,
            port: proxy.port,
            username: proxy.username,
            password: proxy.password,
          },
        }),
      });

      await client.connect();

      if (!(await client.isUserAuthorized())) {
        await client.disconnect();
        return { success: false, kicked: 0, remaining: 0, error: 'Session not authorized' };
      }

      // Get current sessions count
      const beforeResult = await withFloodProtection(
        () => client.invoke(new Api.account.GetAuthorizations()),
        phoneNumber
      );

      const totalBefore = beforeResult.authorizations.length;

      // Reset all other authorizations
      await withFloodProtection(
        () => client.invoke(new Api.auth.ResetAuthorizations()),
        phoneNumber
      );

      await smartDelay(1000, 2000);

      // Get sessions count after
      const afterResult = await withFloodProtection(
        () => client.invoke(new Api.account.GetAuthorizations()),
        phoneNumber
      );

      const totalAfter = afterResult.authorizations.length;
      const kicked = totalBefore - totalAfter;

      await client.disconnect();

      console.log(`✅ Kicked ${kicked} sessions for ${phoneNumber}`);

      return {
        success: true,
        kicked,
        remaining: totalAfter,
      };
    } catch (error: any) {
      console.error('Failed to kick sessions:', error.message);
      return { success: false, kicked: 0, remaining: 0, error: error.message };
    }
  }

  /**
   * Kick specific session by hash
   */
  async kickSession(
    phoneNumber: string,
    sessionHash: string,
    proxy?: ProxyConfig
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const storedSession = await db.telegramSession.findUnique({
        where: { phoneNumber },
      });

      if (!storedSession?.sessionString) {
        return { success: false, error: 'No session found' };
      }

      const session = new StringSession(storedSession.sessionString);
      const client = new TelegramClient(session, this.apiId, this.apiHash, {
        connectionRetries: 5,
        ...(proxy && {
          proxy: {
            socksType: proxy.type === 'socks5' ? 5 : 4,
            ip: proxy.host,
            port: proxy.port,
            username: proxy.username,
            password: proxy.password,
          },
        }),
      });

      await client.connect();

      if (!(await client.isUserAuthorized())) {
        await client.disconnect();
        return { success: false, error: 'Session not authorized' };
      }

      // Terminate specific authorization
      await withFloodProtection(
        () =>
          client.invoke(
            new Api.account.ResetAuthorization({
              hash: bigInt(sessionHash),
            })
          ),
        phoneNumber
      );

      await client.disconnect();

      console.log(`✅ Kicked session ${sessionHash} for ${phoneNumber}`);

      return { success: true };
    } catch (error: any) {
      console.error('Failed to kick session:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Re-request verification code for account access
   */
  async reRequestCode(
    phoneNumber: string,
    orderId: number,
    customerId: number,
    proxy?: ProxyConfig
  ): Promise<RequestCodeResult> {
    try {
      const rateLimitCheck = await telegramCustomerCodeSecurityService.checkBeforeSend(
        phoneNumber,
        orderId,
        customerId
      );

      if (!rateLimitCheck.success) {
        return {
          success: false,
          timeout: rateLimitCheck.timeoutSeconds,
          error: rateLimitCheck.error,
          rateLimit: rateLimitCheck.state
        };
      }

      // Get stored session
      const storedSession = await db.telegramSession.findUnique({
        where: { phoneNumber },
      });

      if (!storedSession?.sessionString) {
        return { success: false, error: 'Account session not found' };
      }

      const session = new StringSession(storedSession.sessionString);
      const client = new TelegramClient(session, this.apiId, this.apiHash, {
        connectionRetries: 5,
        ...(proxy && {
          proxy: {
            socksType: proxy.type === 'socks5' ? 5 : 4,
            ip: proxy.host,
            port: proxy.port,
            username: proxy.username,
            password: proxy.password,
          },
        }),
      });

      await client.connect();

      // Send code request
      const result = await withFloodProtection(
        () =>
          client.sendCode(
            { apiId: this.apiId, apiHash: this.apiHash },
            phoneNumber
          ),
        phoneNumber
      );

      // Log the OTP request
      await db.telegramOtpRequest.create({
        data: {
          phoneNumber,
          phoneCodeHash: result.phoneCodeHash,
          customerId,
          status: 'otp_sent',
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        },
      });

      const rateLimitState = await telegramCustomerCodeSecurityService.recordSuccessfulSend(
        phoneNumber,
        orderId,
        customerId
      );

      await client.disconnect();

      console.log(`✅ Code re-requested for ${phoneNumber} (Order: ${orderId})`);

      return {
        success: true,
        phoneCodeHash: result.phoneCodeHash,
        timeout: rateLimitState.cooldownSeconds,
        rateLimit: rateLimitState
      };
    } catch (error: any) {
      console.error('Failed to re-request code:', error.message);

      // Handle specific errors
      if (error.message?.includes('FLOOD_WAIT')) {
        const seconds = parseInt(error.message.match(/FLOOD_WAIT_(\d+)/)?.[1] || '300');
        return {
          success: false,
          timeout: seconds,
          error: `Too many requests. Please wait ${seconds} seconds.`,
        };
      }

      return { success: false, error: error.message };
    }
  }

  /**
   * Check if session is still valid
   */
  async checkSessionValidity(
    phoneNumber: string,
    proxy?: ProxyConfig
  ): Promise<{ valid: boolean; username?: string; error?: string }> {
    try {
      const storedSession = await db.telegramSession.findUnique({
        where: { phoneNumber },
      });

      if (!storedSession?.sessionString) {
        return { valid: false, error: 'No session found' };
      }

      const session = new StringSession(storedSession.sessionString);
      const client = new TelegramClient(session, this.apiId, this.apiHash, {
        connectionRetries: 3,
        timeout: 10000,
        ...(proxy && {
          proxy: {
            socksType: proxy.type === 'socks5' ? 5 : 4,
            ip: proxy.host,
            port: proxy.port,
            username: proxy.username,
            password: proxy.password,
          },
        }),
      });

      await client.connect();

      const authorized = await client.isUserAuthorized();

      if (authorized) {
        const me = await client.getMe();
        await client.disconnect();

        return {
          valid: true,
          username: (me as any).username,
        };
      }

      await client.disconnect();

      // Update session as invalid in database
      await db.telegramSession.update({
        where: { phoneNumber },
        data: { isAuthorized: false },
      });

      return { valid: false, error: 'Session is no longer authorized' };
    } catch (error: any) {
      console.error('Session validity check failed:', error.message);
      return { valid: false, error: error.message };
    }
  }

  /**
   * Get session info for customer display
   */
  async getSessionInfo(phoneNumber: string): Promise<{
    success: boolean;
    info?: {
      phoneNumber: string;
      username?: string;
      isAuthorized: boolean;
      createdAt: Date;
      lastChecked?: Date;
    };
    error?: string;
  }> {
    try {
      const storedSession = await db.telegramSession.findUnique({
        where: { phoneNumber },
      });

      if (!storedSession) {
        return { success: false, error: 'Session not found' };
      }

      return {
        success: true,
        info: {
          phoneNumber: storedSession.phoneNumber,
          username: storedSession.username || undefined,
          isAuthorized: storedSession.isAuthorized,
          createdAt: storedSession.createdAt,
          lastChecked: storedSession.updatedAt,
        },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

// ================================
// SINGLETON EXPORT
// ================================

export const telegramClientSessionService = new TelegramClientSessionService();
