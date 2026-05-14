import type { Response } from 'express';
import { TelegramTransferService } from '../../services/telegram-transfer.service';
import type { AuthRequest } from '../../types/req-res';
import {
  ManualCompleteOwnershipTransferSchema,
  RetryOwnershipTransferSchema,
  TelegramOwnershipTransferQuerySchema,
  UpdateOwnershipTransferSchema,
} from '../../validations/zod/telegram-transfer.schema';

// Initialize service
const telegramTransferService = new TelegramTransferService();

// ================================
// ADMIN TELEGRAM TRANSFER OPERATIONS
// ================================

/**
 * Get all transfers with filters and pagination (Admin)
 * GET /api/admin/telegram-transfers
 */
export const getAllTransfers = async (req: AuthRequest, res: Response) => {
  try {
    // Validate and parse query parameters
    const validatedQuery = TelegramOwnershipTransferQuerySchema.parse(req.query);

    // Get transfers with pagination
    const result = await telegramTransferService.findMany(validatedQuery);

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
      message: 'Transfers retrieved successfully',
    });
  } catch (error) {
    console.error('Get all transfers error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve transfers',
    });
  }
};

/**
 * Get single transfer by ID (Admin)
 * GET /api/admin/telegram-transfers/:id
 */
export const getTransferById = async (req: AuthRequest, res: Response) => {
  try {
    const transferId = parseInt(req.params.id!);

    if (isNaN(transferId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transfer ID',
      });
    }

    const transfer = await telegramTransferService.findById(transferId);

    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: 'Transfer not found',
      });
    }

    res.json({
      success: true,
      data: transfer,
      message: 'Transfer retrieved successfully',
    });
  } catch (error) {
    console.error('Get transfer by ID error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve transfer',
    });
  }
};

/**
 * Update transfer status (Admin)
 * PATCH /api/admin/telegram-transfers/:id/status
 */
export const updateTransferStatus = async (req: AuthRequest, res: Response) => {
  try {
    const transferId = parseInt(req.params.id!);

    if (isNaN(transferId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transfer ID',
      });
    }

    // Validate request body
    const validatedData = UpdateOwnershipTransferSchema.parse(req.body);

    if (!validatedData.status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required',
      });
    }

    // Update transfer with notification
    const updatedTransfer = await telegramTransferService.updateStatusWithNotification(
      transferId,
      validatedData.status,
      {
        failureReason: validatedData.failureReason,
        adminNotes: validatedData.adminNotes,
        verifiedBy: validatedData.verifiedBy,
      }
    );

    res.json({
      success: true,
      data: updatedTransfer,
      message: 'Transfer status updated successfully',
    });
  } catch (error) {
    console.error('Update transfer status error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update transfer status',
    });
  }
};

/**
 * Retry failed transfer (Admin)
 * POST /api/admin/telegram-transfers/:id/retry
 */
export const retryTransfer = async (req: AuthRequest, res: Response) => {
  try {
    const transferId = parseInt(req.params.id!);

    if (isNaN(transferId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transfer ID',
      });
    }

    // Validate request body
    const validatedData = RetryOwnershipTransferSchema.parse(req.body);

    // Retry transfer
    const updatedTransfer = await telegramTransferService.retryTransfer(transferId, validatedData);

    res.json({
      success: true,
      data: updatedTransfer,
      message: 'Transfer retry initiated successfully',
    });
  } catch (error) {
    console.error('Retry transfer error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retry transfer',
    });
  }
};

/**
 * Execute ownership transfer (Admin)
 * POST /api/admin/telegram-transfers/:id/execute
 * Promotes customer to admin after verification
 */
export const executeTransfer = async (req: AuthRequest, res: Response) => {
  try {
    const transferId = parseInt(req.params.id!);

    if (isNaN(transferId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transfer ID',
      });
    }

    // Execute transfer (promote customer to admin)
    const updatedTransfer = await telegramTransferService.executeTransfer(transferId);

    res.json({
      success: true,
      data: updatedTransfer,
      message: 'Transfer executed successfully',
    });
  } catch (error) {
    console.error('Execute transfer error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to execute transfer',
    });
  }
};

/**
 * Manually complete transfer (Admin override)
 * POST /api/admin/telegram-transfers/:id/manual-complete
 */
export const manualCompleteTransfer = async (req: AuthRequest, res: Response) => {
  try {
    const transferId = parseInt(req.params.id!);
    const adminEmail = req.user?.email;

    if (isNaN(transferId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transfer ID',
      });
    }

    if (!adminEmail) {
      return res.status(401).json({
        success: false,
        message: 'Admin authentication required',
      });
    }

    // Validate request body
    const validatedData = ManualCompleteOwnershipTransferSchema.parse(req.body);

    // Manually complete transfer
    const updatedTransfer = await telegramTransferService.manualComplete(transferId, validatedData);

    res.json({
      success: true,
      data: updatedTransfer,
      message: 'Transfer manually completed successfully',
    });
  } catch (error) {
    console.error('Manual complete transfer error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to manually complete transfer',
    });
  }
};

/**
 * Get transfer proof URL (Admin)
 * GET /api/admin/telegram-transfers/:id/proof
 */
export const getTransferProof = async (req: AuthRequest, res: Response) => {
  try {
    const transferId = parseInt(req.params.id!);

    if (isNaN(transferId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transfer ID',
      });
    }

    const proofUrl = await telegramTransferService.getProofUrl(transferId);

    if (!proofUrl) {
      return res.status(404).json({
        success: false,
        message: 'Transfer proof not found',
      });
    }

    res.json({
      success: true,
      data: { proofUrl },
      message: 'Transfer proof retrieved successfully',
    });
  } catch (error) {
    console.error('Get transfer proof error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve transfer proof',
    });
  }
};

/**
 * Get transfer statistics (Admin)
 * GET /api/admin/telegram-transfers/statistics
 */
export const getTransferStatistics = async (req: AuthRequest, res: Response) => {
  try {
    const statistics = await telegramTransferService.getStatistics();

    res.json({
      success: true,
      data: statistics,
      message: 'Transfer statistics retrieved successfully',
    });
  } catch (error) {
    console.error('Get transfer statistics error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve statistics',
    });
  }
};

/**
 * Delete transfer record (Admin - use with caution)
 * DELETE /api/admin/telegram-transfers/:id
 */
export const deleteTransfer = async (req: AuthRequest, res: Response) => {
  try {
    const transferId = parseInt(req.params.id!);

    if (isNaN(transferId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transfer ID',
      });
    }

    // Get transfer to check if it's safe to delete
    const transfer = await telegramTransferService.findById(transferId);

    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: 'Transfer not found',
      });
    }

    // Only allow deletion of FAILED or COMPLETED transfers
    if (!['FAILED', 'COMPLETED'].includes(transfer.status)) {
      return res.status(400).json({
        success: false,
        message: 'Can only delete FAILED or COMPLETED transfers',
      });
    }

    const result = await telegramTransferService.deleteTransfer(transferId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }

    res.json({
      success: true,
      message: 'Transfer deleted successfully',
    });
  } catch (error) {
    console.error('Delete transfer error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete transfer',
    });
  }
};
