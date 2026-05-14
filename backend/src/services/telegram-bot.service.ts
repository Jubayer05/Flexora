import { Telegraf } from 'telegraf';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

class TelegramBotService {
  private bot: Telegraf | null = null;
  private isInitialized = false;

  constructor() {
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
      console.warn('⚠️  TELEGRAM_BOT_TOKEN not found - Telegram bot disabled');
      return;
    }

    this.bot = new Telegraf(token);
    console.log('🤖 Telegram bot initialized with token');
  }

  /**
   * Initialize bot with basic handlers and start polling
   */
  public async initialize(): Promise<void> {
    if (!this.bot) {
      console.warn('⚠️  Telegram bot not configured - skipping initialization');
      return;
    }

    try {
      // Lazy import prisma to avoid circular dependency
      const { default: prisma } = await import('../configs/db');

      // Test bot connection
      const botInfo = await this.bot.telegram.getMe();
      console.log(`🤖 Bot connected successfully: @${botInfo.username} (${botInfo.first_name})`);

      this.bot.catch((error, ctx) => {
        console.error('❌ Telegram bot update handler failed:', error);
        console.error('⚠️ Failed update type:', ctx.updateType);
      });

      // Simple /start command
      this.bot.start(async (ctx) => {
        const username = escapeHtml(ctx.from?.username || ctx.from?.first_name || 'User');
        const chatId = ctx.chat.id;
        const userId = ctx.from?.id;
        const firstName = ctx.from?.first_name;
        const isPrivateChat = ctx.chat.type === 'private';

        // Save user data to CustomerTelegramData table (only for private chats)
        if (userId && isPrivateChat) {
          try {
            await prisma.customerTelegramData.upsert({
              where: { userId: BigInt(userId) },
              update: {
                chatId: BigInt(chatId),
                username: ctx.from?.username || null,
                firstName: firstName || null,
                updatedAt: new Date(),
              },
              create: {
                userId: BigInt(userId),
                chatId: BigInt(chatId),
                username: ctx.from?.username || null,
                phoneNumber: null, // Phone will be updated when contact is shared
                firstName: firstName || null,
              },
            });

            console.log(
              `✅ Telegram data saved: @${ctx.from?.username} (User ID: ${userId}, Chat ID: ${chatId})`
            );
          } catch (error) {
            console.error('⚠️ Failed to save Telegram data:', error);
            // Don't fail the /start command even if save fails
          }
        }

        const ownershipHelp = isPrivateChat
          ? '<b>For Ownership Transfers:</b>\nIf you purchased a group/channel transfer, please share your contact information so we can verify your identity.'
          : '<b>Note:</b> For full functionality, please message me privately.';

        const welcomeMessage =
          `🔐 <b>Welcome to UHQ Telegram Bot</b>\n\n` +
          `Hello ${username}!\n\n` +
          `This bot helps with Telegram account transfers and verifications.\n\n` +
          `<b>Current Status:</b>\n` +
          `• Bot is active and running\n` +
          `• Ready for ownership transfers\n` +
          `• Contact support for any assistance\n\n` +
          `${ownershipHelp}\n\n` +
          `<b>Need help?</b> Contact UHQ support team.`;

        // Send welcome message with contact sharing button (only in private chats)
        if (isPrivateChat) {
          await ctx.reply(welcomeMessage, {
            parse_mode: 'HTML',
            reply_markup: {
              keyboard: [
                [
                  {
                    text: '📱 Share My Contact',
                    request_contact: true,
                  },
                ],
              ],
              resize_keyboard: true,
              one_time_keyboard: true,
            },
          });
        } else {
          // In group chats, just send simple message without keyboard
          await ctx.reply(welcomeMessage, {
            parse_mode: 'HTML',
          });
        }

        console.log(
          `🤖 /start command - User: ${ctx.from?.username || ctx.from?.first_name || 'User'} (Chat ID: ${chatId}, User ID: ${userId}, Type: ${ctx.chat.type})`
        );
      });

      // Help command
      this.bot.command('help', (ctx) => {
        const helpMessage =
          `📋 <b>UHQ Telegram OTP Bot - Help</b>\n\n` +
          `<b>Available Commands:</b>\n` +
          `• /start - Welcome message and instructions\n` +
          `• /help - Show this help message\n\n` +
          `<b>How the system works:</b>\n` +
          `1. Purchase Telegram accounts from UHQ\n` +
          `2. Go to your dashboard and request account access\n` +
          `3. Login to your purchased Telegram account\n` +
          `4. OTP codes will be automatically detected and sent here\n\n` +
          `<b>Automatic Process:</b>\n` +
          `• No tokens or verification needed\n` +
          `• OTP codes delivered instantly\n` +
          `• Secure and automated delivery\n\n` +
          `<b>Need support?</b> Contact UHQ customer service.\n\n` +
          `<b>Security Note:</b>\nNever share your OTP codes with anyone!`;

        ctx.reply(helpMessage, { parse_mode: 'HTML' });
        console.log(`🤖 /help command used by user: ${ctx.from?.id}`);
      });

      // Status command
      this.bot.command('status', (ctx) => {
        // This will be implemented later when we add verification checking
        ctx.reply('🔍 Status checking will be available once verification system is complete.');
        console.log(`🤖 /status command used by user: ${ctx.from?.id}`);
      });

      // Test command (keep for development)
      this.bot.command('generateRandomNumber', (ctx) => {
        ctx.reply('✅ Here is your random number : ' + Math.floor(Math.random() * 100000000));
        console.log(`🤖 /test command used by user: ${ctx.from?.id}`);
      });

      // Handle contact sharing (for phone number registration)
      this.bot.on('contact', async (ctx) => {
        const contact = ctx.message.contact;
        const userId = ctx.from?.id;

        if (!userId) {
          return;
        }

        // Check if user is sharing their own contact
        if (contact.user_id && contact.user_id === userId) {
          const phoneNumber = contact.phone_number;

          try {
            // Update customer data with phone number
            await prisma.customerTelegramData.upsert({
              where: { userId: BigInt(userId) },
              update: {
                phoneNumber: phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`,
                updatedAt: new Date(),
              },
              create: {
                userId: BigInt(userId),
                chatId: BigInt(ctx.chat.id),
                username: ctx.from?.username || null,
                phoneNumber: phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`,
                firstName: ctx.from?.first_name || null,
              },
            });

            await ctx.reply(
              '✅ <b>Contact Information Saved!</b>\n\n' +
                `Phone: ${escapeHtml(phoneNumber)}\n` +
                `Username: ${escapeHtml(
                  ctx.from?.username ? `@${ctx.from.username}` : 'Not set'
                )}\n\n` +
                'You can now proceed with ownership transfers. We can identify you by either your phone number or Telegram username.',
              {
                parse_mode: 'HTML',
                reply_markup: { remove_keyboard: true }, // Remove the contact button
              }
            );

            console.log(`✅ Contact saved: ${phoneNumber} for user ${userId}`);
          } catch (error) {
            console.error('⚠️ Failed to save contact to Prisma:', error);
            await ctx.reply(
              '❌ Failed to save contact information. Please try again later or contact support.'
            );
          }
        } else {
          await ctx.reply("⚠️ Please share your own contact, not someone else's contact.");
        }
      });

      // Text message handler for general messages
      this.bot.hears(/.*/, async (ctx) => {
        // Only handle text messages, not commands
        if (!('text' in ctx.message) || ctx.message.text.startsWith('/')) {
          return;
        }

        const message = ctx.message.text;
        const chatId = ctx.chat.id;
        const username = ctx.from?.username || ctx.from?.first_name || 'User';

        console.log(`🔍 Received text from ${username} (${chatId}): ${message}`);

        // Simple response for any message
        ctx.reply(
          '👋 <b>Hello!</b>\n\n' +
            'This bot is now simplified and handles OTP delivery automatically.\n\n' +
            '<b>How it works:</b>\n' +
            '• Purchase Telegram accounts from UHQ\n' +
            '• Request access from your dashboard\n' +
            '• Login to your purchased Telegram account\n' +
            '• OTP will be automatically detected and delivered\n\n' +
            '<b>No manual verification needed!</b> 🎉',
          { parse_mode: 'HTML' }
        );
      });

      // Handle inline keyboard callbacks
      this.bot.action('otp_received', (ctx) => {
        ctx.answerCbQuery('✅ Perfect! Keep this chat open for future OTPs.');
        console.log(`🤖 User ${ctx.from?.id} acknowledged OTP receipt`);
      });

      this.bot.action('otp_help', (ctx) => {
        ctx.answerCbQuery();
        ctx.reply(
          '🔐 <b>OTP Help</b>\n\n' +
            '<b>What to do with your OTP:</b>\n' +
            '• Copy the 6-digit code\n' +
            '• Go back to UHQ website\n' +
            '• Paste the OTP in the verification field\n' +
            '• Click verify to access your account\n\n' +
            '<b>Important:</b>\n' +
            '• OTP expires in 10 minutes\n' +
            '• You have 5 attempts maximum\n' +
            '• Never share your OTP with others\n\n' +
            '<b>Need more help?</b> Contact support at UHQ.',
          { parse_mode: 'HTML' }
        );
        console.log(`🤖 User ${ctx.from?.id} requested OTP help`);
      });

      // Start polling with explicit signal handling
      await this.bot.launch({
        dropPendingUpdates: true,
      });
      this.isInitialized = true;

      console.log('🤖 Telegram bot started and listening for messages');

      // Enable graceful stop
      process.once('SIGINT', () => this.stop('SIGINT'));
      process.once('SIGTERM', () => this.stop('SIGTERM'));
    } catch (error) {
      console.error('❌ Failed to initialize Telegram bot:', error);
      throw error;
    }
  }

  /**
   * Stop the bot gracefully
   */
  public stop(signal?: string): void {
    if (this.isInitialized && this.bot) {
      console.log(`🤖 Stopping Telegram bot (${signal || 'manual'})`);
      this.bot.stop(signal);
      this.isInitialized = false;
    }
  }

  /**
   * Get bot instance for external use
   */
  public getBotInstance(): Telegraf | null {
    return this.bot;
  }

  /**
   * Check if bot is initialized
   */
  public isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Send message to specific chat ID
   */
  public async sendMessage(
    chatId: number,
    message: string,
    options?: {
      parseMode?: 'Markdown' | 'HTML';
      disableNotification?: boolean;
    }
  ): Promise<void> {
    if (!this.bot) {
      throw new Error('Telegram bot not configured');
    }
    try {
      await this.bot.telegram.sendMessage(chatId, message, {
        parse_mode: options?.parseMode,
        disable_notification: options?.disableNotification,
      });
      console.log(`🤖 Message sent to chat ID: ${chatId}`);
    } catch (error: any) {
      console.error(`❌ Failed to send message to chat ID ${chatId}:`, error?.message || error);
      throw error;
    }
  }
}

// Export singleton instance
export const telegramBotService = new TelegramBotService();
