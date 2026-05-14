/**
 * Telegram Transfer Retry Service - Empty stub
 * All telegram functionality has been removed
 */
export class TelegramTransferRetryService {
  processFailedTransfers() {
    return Promise.resolve({ retried: 0, failed: 0 })
  }
}