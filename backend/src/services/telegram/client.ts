/**
 * Telegram Client Service
 * Wrapper around gramjs (telegram) for MTProto communication
 */

import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { Api } from 'telegram/tl';
import { computeCheck } from 'telegram/Password';
import type { ProxyConfig, TelegramClientOptions } from './types';

// Telegram API credentials from environment
const API_ID = parseInt(process.env.TELEGRAM_API_ID || '0');
const API_HASH = process.env.TELEGRAM_API_HASH || '';

/**
 * Telegram Service Class
 * Handles connection, authentication, and message retrieval
 */
export class TelegramService {
  private client: TelegramClient;
  private phoneNumber: string;
  private isConnected: boolean = false;

  constructor(options: TelegramClientOptions) {
    const session = new StringSession(options.sessionString || '');
    this.phoneNumber = options.phoneNumber;

    const hasProxy = !!options.proxy;
    const connectionRetries = hasProxy
      ? parseInt(process.env.TELEGRAM_PROXY_CONNECTION_RETRIES || '3', 10)
      : 15;
    const requestTimeout = hasProxy
      ? parseInt(process.env.TELEGRAM_PROXY_REQUEST_TIMEOUT_MS || '20000', 10)
      : 120000;
    const connectionTimeout = hasProxy
      ? parseInt(process.env.TELEGRAM_PROXY_CONNECTION_TIMEOUT_MS || '15000', 10)
      : 180000;

    // Build client options
    const clientOptions: any = {
      connectionRetries,
      retryDelay: 2000, // 2 second delay between retries
      baseLogger: undefined, // Disable logging
      requestTimeout,
      connectionTimeout,
    };

    // Add proxy if provided
    if (options.proxy) {
      clientOptions.proxy = {
        socksType: options.proxy.type === 'socks5' ? 5 : 4,
        ip: options.proxy.host,
        port: options.proxy.port,
        username: options.proxy.username,
        password: options.proxy.password,
      };
    }

    console.log(`[TelegramService] Initializing client for phone: ${this.phoneNumber}`, 
      { 
        connectionRetries: clientOptions.connectionRetries, 
        retryDelay: clientOptions.retryDelay,
        connectionTimeout: clientOptions.connectionTimeout,
        hasProxy
      }
    );

    this.client = new TelegramClient(session, API_ID, API_HASH, clientOptions);
  }

  /**
   * Connect to Telegram
   */
  async connect(): Promise<void> {
    if (!this.isConnected) {
      console.log(`[TelegramService] Attempting to connect to Telegram for phone: ${this.phoneNumber}`);
      try {
        await this.client.connect();
        this.isConnected = true;
        console.log(`[TelegramService] Successfully connected for phone: ${this.phoneNumber}`);
      } catch (error) {
        console.error(`[TelegramService] Connection failed for phone: ${this.phoneNumber}`, error);
        this.isConnected = false;
        throw error;
      }
    }
  }

  /**
   * Disconnect from Telegram
   */
  async disconnect(): Promise<void> {
    if (this.isConnected) {
      console.log(`[TelegramService] Disconnecting from Telegram for phone: ${this.phoneNumber}`);
      try {
        await this.client.disconnect();
        this.isConnected = false;
        console.log(`[TelegramService] Disconnected successfully for phone: ${this.phoneNumber}`);
      } catch (error) {
        console.error(`[TelegramService] Disconnect error for phone: ${this.phoneNumber}`, error);
        this.isConnected = false;
      }
    }
  }

  /**
   * Check if user is authorized
   */
  async isAuthorized(): Promise<boolean> {
    return await this.client.isUserAuthorized();
  }

  /**
   * Send code request (Step 1 of authentication)
   */
  async sendCodeRequest(): Promise<{ phoneCodeHash: string }> {
    const result = await this.client.sendCode(
      { apiId: API_ID, apiHash: API_HASH },
      this.phoneNumber
    );
    return { phoneCodeHash: result.phoneCodeHash };
  }

  /**
   * Sign in with code (Step 2 of authentication)
   */
  async signIn(
    code: string,
    phoneCodeHash: string,
    password2FA?: string
  ): Promise<Api.User> {
    try {
      const result = await this.client.invoke(
        new Api.auth.SignIn({
          phoneNumber: this.phoneNumber,
          phoneCodeHash,
          phoneCode: code,
        })
      );

      // Handle different response types
      if (result.className === 'auth.AuthorizationSignUpRequired') {
        throw new Error('SIGNUP_REQUIRED');
      }

      return (result as Api.auth.Authorization).user as Api.User;
    } catch (error: any) {
      // Handle 2FA requirement
      if (error.errorMessage === 'SESSION_PASSWORD_NEEDED') {
        if (!password2FA) {
          throw new Error('2FA_REQUIRED');
        }

        // Get password info and sign in with password
        const passwordInfo = await this.client.invoke(new Api.account.GetPassword());
        const result = await this.client.invoke(
          new Api.auth.CheckPassword({
            password: await computeCheck(passwordInfo, password2FA),
          })
        );

        return (result as Api.auth.Authorization).user as Api.User;
      }
      throw error;
    }
  }

  /**
   * Get current user info
   */
  async getMe(): Promise<Api.User> {
    return (await this.client.getMe()) as Api.User;
  }

  /**
   * Get session string for storage
   */
  getSessionString(): string {
    return (this.client.session as StringSession).save();
  }

  /**
   * Get messages from a specific sender
   */
  async getMessages(
    senderId: number | string,
    limit: number = 10
  ): Promise<Api.Message[]> {
    try {
      const messages = await this.client.getMessages(senderId, { limit });
      return messages.filter((msg): msg is Api.Message => msg instanceof Api.Message);
    } catch (error) {
      // Return empty array if sender not found
      return [];
    }
  }

  /**
   * Get recent dialogs/chats
   */
  async getDialogs(limit: number = 10): Promise<any[]> {
    const dialogs = await this.client.getDialogs({ limit });
    return dialogs;
  }

  /**
   * Send message to a user/bot
   */
  async sendMessage(peer: string | number, message: string): Promise<Api.Message> {
    return await this.client.sendMessage(peer, { message });
  }

  /**
   * Get the underlying TelegramClient instance
   */
  getClient(): TelegramClient {
    return this.client;
  }

  /**
   * Get phone number
   */
  getPhoneNumber(): string {
    return this.phoneNumber;
  }
}

/**
 * Validate Telegram configuration
 */
export function validateTelegramConfig(): boolean {
  if (!API_ID || !API_HASH) {
    console.warn('⚠️ Telegram API credentials not configured (TELEGRAM_API_ID, TELEGRAM_API_HASH)');
    return false;
  }
  return true;
}

/**
 * Create a new Telegram service instance
 */
export function createTelegramService(options: TelegramClientOptions): TelegramService {
  return new TelegramService(options);
}
