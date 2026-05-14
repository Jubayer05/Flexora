import db from '../configs/db';
import { TelegramTransferService } from './telegram-transfer.service';

/**
 * TelegramTransferRetryService
 * Handles automatic retry of failed transfers with exponential backoff
 */
export class TelegramTransferRetryService {
  private telegramTransferService = new TelegramTransferService();

  /**
   * Process failed transfers for automatic retry
   * Implements exponential backoff: 1 hour, 6 hours, 24 hours
   */
  async processFailedTransfers() {
    const now = new Date();

    try {
      // Find failed transfers that are eligible for retry
      const failedTransfers = await db.telegramTransfer.findMany({
        where: {
          status: 'FAILED',
          // We'll check retryCount < maxRetries in the loop since it's per-transfer
        },
        include: {
          order: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  meta: true,
                },
              },
              user: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                },
              },
            },
          },
        },
      });

      console.log(`[RetryService] Found ${failedTransfers.length} failed transfers to process`);

      let retriedCount = 0;
      let skippedCount = 0;

      for (const transfer of failedTransfers) {
        try {
          // Skip if max retries reached
          if (transfer.retryCount >= transfer.maxRetries) {
            console.log(
              `[RetryService] Skipping transfer ${transfer.id} - max retries reached (${transfer.retryCount}/${transfer.maxRetries})`
            );
            skippedCount++;
            continue;
          }

          // Calculate backoff delay based on retry count
          const backoffHours = this.getBackoffHours(transfer.retryCount);
          const shouldRetry = this.shouldRetryNow(transfer.lastRetryAt, backoffHours);

          if (!shouldRetry) {
            console.log(
              `[RetryService] Skipping transfer ${transfer.id} - not enough time elapsed (need ${backoffHours}h)`
            );
            skippedCount++;
            continue;
          }

          // Attempt retry
          console.log(
            `[RetryService] Retrying transfer ${transfer.id} (attempt ${transfer.retryCount + 1}/${transfer.maxRetries})`
          );

          await this.telegramTransferService.retryTransfer(transfer.id, {
            reason: `Automatic retry attempt ${transfer.retryCount + 1}/${transfer.maxRetries}`,
            adminUsername: 'system',
          });

          retriedCount++;
          console.log(`[RetryService] Successfully retried transfer ${transfer.id}`);
        } catch (error) {
          console.error(`[RetryService] Failed to retry transfer ${transfer.id}:`, error);
          // Continue with other transfers
        }
      }

      console.log(
        `[RetryService] Retry job completed: ${retriedCount} retried, ${skippedCount} skipped`
      );

      return {
        total: failedTransfers.length,
        retried: retriedCount,
        skipped: skippedCount,
      };
    } catch (error) {
      console.error('[RetryService] Error processing failed transfers:', error);
      throw error;
    }
  }

  /**
   * Calculate exponential backoff delay in hours
   * Retry 1: 1 hour
   * Retry 2: 6 hours
   * Retry 3+: 24 hours
   */
  private getBackoffHours(retryCount: number): number {
    if (retryCount === 0) return 1; // First retry after 1 hour
    if (retryCount === 1) return 6; // Second retry after 6 hours
    return 24; // Third+ retry after 24 hours
  }

  /**
   * Check if enough time has elapsed for retry
   */
  private shouldRetryNow(lastRetryAt: Date | null, backoffHours: number): boolean {
    if (!lastRetryAt) {
      // Never retried before - use creation date is handled by caller
      return true;
    }

    const now = new Date();
    const hoursSinceLastRetry = (now.getTime() - lastRetryAt.getTime()) / (1000 * 60 * 60);

    return hoursSinceLastRetry >= backoffHours;
  }

  /**
   * Get retry statistics
   */
  async getRetryStats() {
    const [total, pending, inProgress, failed, failedRetryable] = await Promise.all([
      db.telegramTransfer.count(),
      db.telegramTransfer.count({ where: { status: 'PENDING' } }),
      db.telegramTransfer.count({
        where: { status: { in: ['VERIFICATION_REQUIRED', 'TRANSFER_IN_PROGRESS'] } },
      }),
      db.telegramTransfer.count({ where: { status: 'FAILED' } }),
      db.telegramTransfer.count({
        where: {
          status: 'FAILED',
          retryCount: { lt: 3 }, // Less than maxRetries default
        },
      }),
    ]);

    return {
      total,
      pending,
      inProgress,
      failed,
      failedRetryable,
      failedPermanent: failed - failedRetryable,
    };
  }

  /**
   * Manually trigger retry job (for testing or admin override)
   */
  async triggerManualRetryJob() {
    console.log('[RetryService] Manual retry job triggered');
    return await this.processFailedTransfers();
  }
}
