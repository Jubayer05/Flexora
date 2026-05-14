/**
 * User Telegram Notification Service - Empty stub
 * All telegram functionality has been removed
 */
export class UserTelegramNotificationService {
  sendBalanceNotification(userId: number, amount: number, balanceAfter: number, type: string, description: string) {
    return Promise.resolve()
  }
  sendTopupRequestNotification(userId: number, amount: number) {
    return Promise.resolve()
  }
  sendTopupRejectionNotification(userId: number, amount: number, reason: string) {
    return Promise.resolve()
  }
  sendStripeTopupSuccessNotification(userId: number, amount: number) {
    return Promise.resolve()
  }
}

export const userTelegramNotificationService = new UserTelegramNotificationService()