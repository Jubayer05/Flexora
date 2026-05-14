import * as http from 'http';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { Telegraf } from 'telegraf';
import type { ChatMemberAdministrator } from 'telegraf/types';
import { telegramProxyService } from './telegram/proxy.service';
import type { ProxyConfig } from './telegram/types';

const DEFAULT_BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || '@uhqaccountsbot';

/**
 * Telegram Transfer Bot Service
 * Handles ownership transfer operations using Telegraf Bot API
 */
class TelegramTransferBotService {
  private readonly token: string;

  constructor() {
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN is required for transfer operations');
    }

    this.token = token;
  }

  private getProxyKey(proxy?: ProxyConfig): string | null {
    if (!proxy) return null;
    return `${proxy.host}:${proxy.port}:${proxy.username || ''}`;
  }

  private buildProxyAgent(proxy?: ProxyConfig): http.Agent | undefined {
    if (!proxy) return undefined;

    const protocol = proxy.type === 'socks5' ? 'socks5' : 'http';
    const auth =
      proxy.username && proxy.password
        ? `${encodeURIComponent(proxy.username)}:${encodeURIComponent(proxy.password)}@`
        : '';
    const proxyUrl = `${protocol}://${auth}${proxy.host}:${proxy.port}`;

    return proxy.type === 'socks5'
      ? (new SocksProxyAgent(proxyUrl) as unknown as http.Agent)
      : (new HttpsProxyAgent(proxyUrl) as unknown as http.Agent);
  }

  private createBot(proxy?: ProxyConfig): Telegraf {
    return new Telegraf(this.token, {
      telegram: {
        agent: this.buildProxyAgent(proxy)
      }
    });
  }

  private shouldRetryWithAnotherProxy(error: any): boolean {
    const message = String(error?.message || error || '').toLowerCase();

    if (!message) return false;

    const nonRetryablePatterns = [
      'chat not found',
      'not enough rights',
      "can't remove chat owner",
      'user not found',
      'user_not_participant',
      'forbidden',
      'bot was kicked'
    ];

    if (nonRetryablePatterns.some((pattern) => message.includes(pattern))) {
      return false;
    }

    const retryablePatterns = [
      'proxy',
      'socket',
      'timed out',
      'timeout',
      'econnreset',
      'econnrefused',
      'etimedout',
      'fetch failed',
      'network',
      'request aborted',
      'connect'
    ];

    return retryablePatterns.some((pattern) => message.includes(pattern));
  }

  private async executeWithProxyFallback<T>(
    operation: (bot: Telegraf, proxy?: ProxyConfig) => Promise<T>
  ): Promise<T> {
    await telegramProxyService.loadConfig();
    const poolSize = telegramProxyService.getProxyPool().size;
    const maxAttempts = Math.max(1, poolSize || 1);
    const triedProxyKeys = new Set<string>();
    let lastError: any;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      let proxy: ProxyConfig | undefined;

      if (poolSize > 0) {
        for (let pickAttempt = 0; pickAttempt < maxAttempts; pickAttempt++) {
          const candidate = (await telegramProxyService.getNextProxy()) || undefined;
          const candidateKey = this.getProxyKey(candidate);

          if (!candidateKey || !triedProxyKeys.has(candidateKey)) {
            proxy = candidate;
            if (candidateKey) triedProxyKeys.add(candidateKey);
            break;
          }
        }
      }

      const bot = this.createBot(proxy);

      try {
        const result = await operation(bot, proxy);
        if (proxy) {
          telegramProxyService.reportSuccess(proxy);
        }
        return result;
      } catch (error: any) {
        lastError = error;
        if (proxy) {
          telegramProxyService.reportFailure(proxy);
        }

        if (!proxy || !this.shouldRetryWithAnotherProxy(error) || attempt === maxAttempts - 1) {
          throw error;
        }
      }
    }

    throw lastError || new Error('Transfer bot operation failed');
  }

  /**
   * Parse Telegram identifier from URL or username
   * @param identifier - Telegram URL (https://t.me/username) or @username or username
   * @returns Cleaned identifier with @ prefix for usernames
   */
  private parseTelegramIdentifier(identifier: string): string | number {
    let parsed = identifier.trim();

    // If it's already a numeric ID, return as number
    if (/^-?\d+$/.test(parsed)) {
      return parseInt(parsed, 10);
    }

    // Remove URL parts
    parsed = parsed
      .replace('https://', '')
      .replace('http://', '')
      .replace('t.me/', '')
      .replace('telegram.me/', '');

    // Ensure @ prefix for usernames (Telegram API requires it)
    if (!parsed.startsWith('@')) {
      parsed = '@' + parsed;
    }

    return parsed;
  }

  /**
   * Verify bot is admin in the target chat
   * @param chatIdentifier - Chat username, ID, or URL
   * @returns Promise with verification result
   */
  async verifyBotIsAdmin(chatIdentifier: string): Promise<{
    success: boolean;
    isAdmin: boolean;
    canPromote: boolean;
    status?: string;
    chatId?: string;
    chatTitle?: string;
    chatType?: string;
    error?: string;
  }> {
    try {
      const identifier = this.parseTelegramIdentifier(chatIdentifier);

      const { chat, botInfo, botMember } = await this.executeWithProxyFallback(async (bot) => {
        const chat = await bot.telegram.getChat(identifier);
        const botInfo = await bot.telegram.getMe();
        const botMember = await bot.telegram.getChatMember(chat.id, botInfo.id);
        return { chat, botInfo, botMember };
      });

      const isAdmin = botMember.status === 'administrator' || botMember.status === 'creator';

      const canPromote =
        isAdmin && (botMember as ChatMemberAdministrator).can_promote_members === true;

      return {
        success: true,
        isAdmin,
        canPromote,
        status: botMember.status,
        chatId: chat.id.toString(),
        chatTitle: 'title' in chat ? chat.title : undefined,
        chatType: chat.type,
      };
    } catch (error: any) {
      console.error('❌ Error verifying bot admin status:', error);

      // Check if error is "chat not found"
      if (error.message?.includes('chat not found') || error.message?.includes('Chat not found')) {
        return {
          success: false,
          isAdmin: false,
          canPromote: false,
          error: `Chat not found. Please verify: 1) The group/channel exists, 2) The URL is correct: ${chatIdentifier}`,
        };
      }

      return {
        success: false,
        isAdmin: false,
        canPromote: false,
        error: error.message || 'Failed to verify bot admin status',
      };
    }
  }

  /**
   * Verify customer has joined the target chat
   * @param chatIdentifier - Chat username, ID, or URL
   * @param userId - Telegram user ID (numeric)
   * @returns Promise with verification result
   */
  async verifyCustomerJoined(
    chatIdentifier: string,
    userId: number
  ): Promise<{
    success: boolean;
    isMember: boolean;
    status?: string;
    canBePromoted?: boolean;
    chatId?: string;
    error?: string;
  }> {
    try {
      const identifier = this.parseTelegramIdentifier(chatIdentifier);

      const { chat, memberInfo } = await this.executeWithProxyFallback(async (bot) => {
        const chat = await bot.telegram.getChat(identifier);
        const memberInfo = await bot.telegram.getChatMember(chat.id, userId);
        return { chat, memberInfo };
      });

      const isMember = ['member', 'administrator', 'creator', 'restricted'].includes(
        memberInfo.status
      );

      const canBePromoted = memberInfo.status === 'member' || memberInfo.status === 'restricted';

      return {
        success: true,
        isMember,
        status: memberInfo.status,
        canBePromoted,
        chatId: chat.id.toString(),
      };
    } catch (error: any) {
      console.error('❌ Error verifying customer membership:', error);

      // Check if error is "chat not found" - means bot not added or wrong URL
      if (error.message?.includes('chat not found') || error.message?.includes('Chat not found')) {
        return {
          success: false,
          isMember: false,
          error: `Chat not found. Please verify: 1) The group/channel exists, 2) The bot (${DEFAULT_BOT_USERNAME}) has been added as admin, 3) The URL is correct: ${chatIdentifier}`,
        };
      }

      // Check if error is "user not found" - means customer not joined
      if (
        error.message?.includes('user not found') ||
        error.message?.includes('USER_NOT_PARTICIPANT')
      ) {
        return {
          success: true,
          isMember: false,
          error: 'Customer has not joined the group/channel yet',
        };
      }

      return {
        success: false,
        isMember: false,
        error: error.message || 'Failed to verify customer membership',
      };
    }
  }

  /**
   * Promote customer to admin with full permissions
   * @param chatIdentifier - Chat username, ID, or URL
   * @param userId - Telegram user ID (numeric)
   * @param transferType - 'group' or 'channel'
   * @returns Promise with promotion result
   */
  async promoteToAdmin(
    chatIdentifier: string,
    userId: number,
    transferType: 'group' | 'channel' = 'group'
  ): Promise<{
    success: boolean;
    promoted: boolean;
    chatId?: string;
    chatTitle?: string;
    permissions?: Record<string, boolean>;
    error?: string;
  }> {
    try {
      const identifier = this.parseTelegramIdentifier(chatIdentifier);

      const chat = await this.executeWithProxyFallback(async (bot) => bot.telegram.getChat(identifier));

      // Define full admin permissions
      const permissions = {
        can_manage_chat: true,
        can_delete_messages: true,
        can_manage_video_chats: true,
        can_restrict_members: true,
        can_promote_members: true,
        can_change_info: true,
        can_invite_users: true,
        can_post_messages: transferType === 'channel', // Only for channels
        can_edit_messages: transferType === 'channel', // Only for channels
        can_pin_messages: true,
        can_manage_topics: chat.type === 'supergroup', // Only for supergroups
      };

      // Promote user to admin
      await this.executeWithProxyFallback(async (bot) =>
        bot.telegram.promoteChatMember(chat.id, userId, permissions)
      );

      console.log(`✅ Customer ${userId} promoted to admin in ${chat.id}`);

      return {
        success: true,
        promoted: true,
        chatId: chat.id.toString(),
        chatTitle: 'title' in chat ? chat.title : undefined,
        permissions,
      };
    } catch (error: any) {
      console.error('❌ Error promoting customer to admin:', error);

      // Check if error is "chat not found"
      if (error.message?.includes('chat not found') || error.message?.includes('Chat not found')) {
        return {
          success: false,
          promoted: false,
          error: `Chat not found. Please verify: 1) The group/channel exists, 2) The bot (${DEFAULT_BOT_USERNAME}) has been added as admin, 3) The URL is correct: ${chatIdentifier}`,
        };
      }

      if (error.message?.includes('not enough rights')) {
        return {
          success: false,
          promoted: false,
          error:
            `Bot ${DEFAULT_BOT_USERNAME} is in the group/channel but lacks permission to promote members. ` +
            `Grant the bot admin rights with member promotion permissions, then try again.`,
        };
      }

      if (error.message?.includes("can't remove chat owner")) {
        return {
          success: false,
          promoted: false,
          error:
            'Customer is already the owner of this group/channel. No promotion is needed; mark the transfer as completed.',
        };
      }

      return {
        success: false,
        promoted: false,
        error: error.message || 'Failed to promote customer to admin',
      };
    }
  }

  /**
   * Get detailed information about a chat
   * @param chatIdentifier - Chat username, ID, or URL
   * @returns Promise with chat information
   */
  async getChatInfo(chatIdentifier: string): Promise<{
    success: boolean;
    chatId?: string;
    chatTitle?: string;
    chatType?: string;
    username?: string;
    description?: string;
    memberCount?: number;
    error?: string;
  }> {
    try {
      const identifier = this.parseTelegramIdentifier(chatIdentifier);

      const chat = await this.executeWithProxyFallback(async (bot) => bot.telegram.getChat(identifier));

      // Get member count
      let memberCount: number | undefined;
      try {
        memberCount = await this.executeWithProxyFallback(async (bot) =>
          bot.telegram.getChatMembersCount(chat.id)
        );
      } catch (e) {
        // Member count may not be available for all chat types
        console.warn('Could not get member count:', e);
      }

      return {
        success: true,
        chatId: chat.id.toString(),
        chatTitle: 'title' in chat ? chat.title : undefined,
        chatType: chat.type,
        username: 'username' in chat ? chat.username : undefined,
        description: 'description' in chat ? chat.description : undefined,
        memberCount,
      };
    } catch (error: any) {
      console.error('❌ Error getting chat info:', error);
      return {
        success: false,
        error: error.message || 'Failed to get chat information',
      };
    }
  }

  /**
   * Get bot instance (for advanced operations)
   */
  getBotInstance(): Telegraf {
    return this.createBot();
  }
}

// Lazy singleton instance (only created when first accessed)
let _telegramTransferBotService: TelegramTransferBotService | null = null;

function getTelegramTransferBotService(): TelegramTransferBotService {
  if (!_telegramTransferBotService) {
    _telegramTransferBotService = new TelegramTransferBotService();
  }
  return _telegramTransferBotService;
}

// Export proxy object that lazily initializes the service
export const telegramTransferBotService = {
  async verifyBotIsAdmin(chatIdentifier: string) {
    return getTelegramTransferBotService().verifyBotIsAdmin(chatIdentifier);
  },
  
  async verifyCustomerJoined(chatIdentifier: string, userId: number) {
    return getTelegramTransferBotService().verifyCustomerJoined(chatIdentifier, userId);
  },
  
  async promoteToAdmin(chatIdentifier: string, userId: number, transferType: 'group' | 'channel' = 'group') {
    return getTelegramTransferBotService().promoteToAdmin(chatIdentifier, userId, transferType);
  },
  
  async getChatInfo(chatIdentifier: string) {
    return getTelegramTransferBotService().getChatInfo(chatIdentifier);
  },
  
  getBotInstance() {
    return getTelegramTransferBotService().getBotInstance();
  }
};
