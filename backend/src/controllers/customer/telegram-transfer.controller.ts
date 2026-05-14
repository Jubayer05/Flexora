import type { Response } from 'express';
import db from '../../configs/db';
import { TelegramTransferService } from '../../services/telegram-transfer.service';
import type { AuthRequest } from '../../types/req-res';
import { validateGuestSessionAccess } from '../../utils/guest-dashboard-auth';

// Initialize service
const telegramTransferService = new TelegramTransferService();

// ================================
// CUSTOMER TELEGRAM TRANSFER OPERATIONS
// ================================

/**
 * Get all transfers for a specific order
 * GET /api/orders/:orderId/transfers
 */
export const getOrderTransfers = async (req: AuthRequest, res: Response) => {
  try {
    const orderId = parseInt(req.params.orderId!);
    const userId = req.user?.userId;
    let guestEmail = req.query.guestEmail as string;

    if (isNaN(orderId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID',
      });
    }

    if (!userId && !guestEmail) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required or guest email must be provided',
      });
    }

    if (!userId && guestEmail) {
      const guestAccess = validateGuestSessionAccess(req, guestEmail);
      if (!guestAccess.ok) {
        return res.status(guestAccess.status).json({
          success: false,
          message: guestAccess.message,
        });
      }
      guestEmail = guestAccess.email;
    }

    // Verify order belongs to customer
    const order = await db.order.findFirst({
      where: {
        id: orderId,
        OR: [{ userId: userId || undefined }, { guestEmail: guestEmail || undefined }].filter(
          Boolean
        ),
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or access denied',
      });
    }

    // Get all transfers for this order (now orderId maps directly)
    const transfers = await telegramTransferService.findByOrderId(orderId);

    res.json({
      success: true,
      data: transfers ? [transfers] : [], // findByOrderId returns single transfer
      message: 'Order transfers retrieved successfully',
    });
  } catch (error) {
    console.error('Get order transfers error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve transfers',
    });
  }
};

/**
 * Get single transfer by ID
 * GET /api/telegram-transfers/:id
 */
export const getTransferById = async (req: AuthRequest, res: Response) => {
  try {
    const transferId = parseInt(req.params.id!);
    const userId = req.user?.userId;
    let guestEmail = req.query.guestEmail as string;

    if (isNaN(transferId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transfer ID',
      });
    }

    if (!userId && !guestEmail) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required or guest email must be provided',
      });
    }

    if (!userId && guestEmail) {
      const guestAccess = validateGuestSessionAccess(req, guestEmail);
      if (!guestAccess.ok) {
        return res.status(guestAccess.status).json({
          success: false,
          message: guestAccess.message,
        });
      }
      guestEmail = guestAccess.email;
    }

    // Get transfer
    const transfer = await telegramTransferService.findById(transferId);

    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: 'Transfer not found',
      });
    }

    // Verify customer owns this transfer
    const hasAccess = await db.order.findFirst({
      where: {
        id: transfer.orderId,
        OR: [{ userId: userId || undefined }, { guestEmail: guestEmail || undefined }].filter(
          Boolean
        ),
      },
    });

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
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
 * Get transfer status
 * GET /api/telegram-transfers/:id/status
 */
export const getTransferStatus = async (req: AuthRequest, res: Response) => {
  try {
    const transferId = parseInt(req.params.id!);
    const userId = req.user?.userId;
    let guestEmail = req.query.guestEmail as string;

    if (isNaN(transferId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transfer ID',
      });
    }

    if (!userId && !guestEmail) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required or guest email must be provided',
      });
    }

    if (!userId && guestEmail) {
      const guestAccess = validateGuestSessionAccess(req, guestEmail);
      if (!guestAccess.ok) {
        return res.status(guestAccess.status).json({
          success: false,
          message: guestAccess.message,
        });
      }
      guestEmail = guestAccess.email;
    }

    // Get transfer
    const transfer = await telegramTransferService.findById(transferId);

    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: 'Transfer not found',
      });
    }

    // Verify customer owns this transfer
    const hasAccess = await db.order.findFirst({
      where: {
        id: transfer.orderId,
        OR: [{ userId: userId || undefined }, { guestEmail: guestEmail || undefined }].filter(
          Boolean
        ),
      },
    });

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Return simplified status information
    const statusInfo = {
      id: transfer.id,
      status: transfer.status,
      targetUrl: transfer.targetUrl,
      customerTelegram: transfer.customerTelegram,
      joinVerified: transfer.joinVerified,
      transferProofUrl: transfer.transferProofUrl,
      completedAt: transfer.completedAt,
      createdAt: transfer.createdAt,
      updatedAt: transfer.updatedAt,
      product: {
        name: transfer.order.product.name,
      },
    };

    res.json({
      success: true,
      data: statusInfo,
      message: 'Transfer status retrieved successfully',
    });
  } catch (error) {
    console.error('Get transfer status error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve transfer status',
    });
  }
};

/**
 * Verify customer has joined the Telegram group/channel
 * POST /api/telegram-transfers/:id/verify-join
 */
export const verifyCustomerJoined = async (req: AuthRequest, res: Response) => {
  try {
    const transferId = parseInt(req.params.id!);
    const userId = req.user?.userId;
    let guestEmail = req.query.guestEmail as string;

    if (isNaN(transferId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transfer ID',
      });
    }

    if (!userId && !guestEmail) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required or guest email must be provided',
      });
    }

    if (!userId && guestEmail) {
      const guestAccess = validateGuestSessionAccess(req, guestEmail);
      if (!guestAccess.ok) {
        return res.status(guestAccess.status).json({
          success: false,
          message: guestAccess.message,
        });
      }
      guestEmail = guestAccess.email;
    }

    // Get transfer
    const transfer = await telegramTransferService.findById(transferId);

    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: 'Transfer not found',
      });
    }

    // Verify customer owns this transfer
    const hasAccess = await db.order.findFirst({
      where: {
        id: transfer.orderId,
        OR: [{ userId: userId || undefined }, { guestEmail: guestEmail || undefined }].filter(
          Boolean
        ),
      },
    });

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Check if transfer is in correct status
    if (transfer.status !== 'VERIFICATION_REQUIRED') {
      return res.status(400).json({
        success: false,
        message: `Cannot verify join. Transfer status is ${transfer.status}`,
      });
    }

    // Verify customer joined (calls Python microservice)
    const updatedTransfer = await telegramTransferService.verifyCustomerJoined(transferId);

    res.json({
      success: true,
      data: updatedTransfer,
      message:
        'Membership verified and you have been promoted to admin! You now have full permissions in the group/channel.',
    });
  } catch (error) {
    console.error('Verify customer joined error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to verify membership',
    });
  }
};

/**
 * Get customer's all transfers
 * GET /api/telegram-transfers
 */
export const getCustomerTransfers = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    let guestEmail = req.query.guestEmail as string;

    if (!userId && !guestEmail) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required or guest email must be provided',
      });
    }

    if (!userId && guestEmail) {
      const guestAccess = validateGuestSessionAccess(req, guestEmail);
      if (!guestAccess.ok) {
        return res.status(guestAccess.status).json({
          success: false,
          message: guestAccess.message,
        });
      }
      guestEmail = guestAccess.email;
    }

    // Get all orders for this customer
    const orders = await db.order.findMany({
      where: {
        OR: [{ userId: userId || undefined }, { guestEmail: guestEmail || undefined }].filter(
          Boolean
        ),
      },
      select: {
        id: true,
      },
    });

    const orderIds = orders.map((o) => o.id);

    // Get all transfers for these orders (now orderId maps directly to orders)
    const transfers = await telegramTransferService.findByOrderIds(orderIds);

    res.json({
      success: true,
      data: transfers,
      message: 'Transfers retrieved successfully',
    });
  } catch (error) {
    console.error('Get customer transfers error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve transfers',
    });
  }
};
