/**
 * Telegram Account Service - Empty stub
 * All telegram functionality has been removed
 */
export class TelegramAccountService {
  assignAccountToOrder(orderId: number, quantity: number) {
    return Promise.resolve({ assigned: [], requested: quantity })
  }
  markAsUsed(accountId: number, orderId: number) {
    return Promise.resolve(null)
  }
  getAccountCredentials(accountId: number) {
    return Promise.resolve(null)
  }
}

/**
 * Telegram Transfer Service - Empty stub
 * All telegram functionality has been removed
 */
export class TelegramTransferService {
  createTransfer(params: any) {
    return Promise.resolve({ id: 0 })
  }
  updateStatusWithNotification(params: any) {
    return Promise.resolve(null)
  }
}