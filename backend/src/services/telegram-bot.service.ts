/**
 * Telegram Bot Service - Empty stub
 * All telegram functionality has been removed
 */
export class TelegramBotService {
  initialize() {
    return Promise.resolve()
  }
  sendMessage(chatId: number, message: string, options?: any) {
    return Promise.resolve(null)
  }
}

export const telegramBotService = new TelegramBotService()