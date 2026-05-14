import type { Response } from 'express';
import { TelegramTransferRetryService } from '../../services/telegram-transfer-retry.service';
import type { AuthRequest } from '../../types/req-res';

const retryService = new TelegramTransferRetryService();

/**
 * Get retry statistics
 */
export const getRetryStats = async (req: AuthRequest, res: Response) => {
  try {
    const stats = await retryService.getRetryStats();

    res.json({
      success: true,
      data: stats,
      message: 'Retry statistics retrieved successfully',
    });
  } catch (error) {
    console.error('Get retry stats error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get retry statistics',
    });
  }
};

/**
 * Manually trigger retry job
 */
export const triggerRetryJob = async (req: AuthRequest, res: Response) => {
  try {
    const result = await retryService.triggerManualRetryJob();

    res.json({
      success: true,
      data: result,
      message: 'Retry job executed successfully',
    });
  } catch (error) {
    console.error('Trigger retry job error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to trigger retry job',
    });
  }
};
