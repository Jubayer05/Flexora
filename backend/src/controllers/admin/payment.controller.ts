/**
 * Admin Payment Controller
 * Handles admin payment management operations
 */

import type { NextFunction, Response } from 'express';
import db from '../../configs/db';
import { PaymentService } from '../../services/payment.service';
import type { AuthRequest } from '../../types/req-res';
import { sendSuccessResponse, transformDecimals, type ApiResponse } from '../../utils';

const paymentService = new PaymentService();

/**
 * Get all payments (with pagination and filters)
 * GET /api/v1/admin/payments
 */
export const getAllPayments = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const gateway = req.query.gateway as string;
    const skip = (page - 1) * limit;

    // Build filter
    const where: any = {};
    if (status) where.status = status;
    if (gateway) where.gateway = gateway;

    // Get payments
    const [payments, total] = await Promise.all([
      db.payment.findMany({
        where,
        include: {
          method: {
            select: {
              id: true,
              name: true,
              gateway: true,
            },
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
              userId: true,
              guestEmail: true,
              customerName: true,
              total: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.payment.count({ where }),
    ]);

    return sendSuccessResponse(
      res,
      {
        payments: transformDecimals(payments),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      'Payments retrieved successfully'
    );
  } catch (error) {
    return next(error);
  }
};

/**
 * Get payment details
 * GET /api/v1/admin/payments/:id
 */
export const getPaymentDetails = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const paymentId = parseInt(req.params.id!);

    if (isNaN(paymentId)) {
      throw new Error('Invalid payment ID');
    }

    const payment = await paymentService.getPaymentById(paymentId);

    return sendSuccessResponse(res, payment, 'Payment retrieved successfully');
  } catch (error) {
    return next(error);
  }
};

/**
 * Process refund
 * POST /api/v1/admin/payments/:id/refund
 */
export const processRefund = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const paymentId = parseInt(req.params.id!);
    const { amount } = req.body;

    if (isNaN(paymentId)) {
      throw new Error('Invalid payment ID');
    }

    const refundAmount = amount ? parseFloat(amount) : undefined;

    const refund = await paymentService.processRefund(paymentId, refundAmount);

    return sendSuccessResponse(res, refund, 'Refund processed successfully');
  } catch (error) {
    return next(error);
  }
};

/**
 * Get payment statistics
 * GET /api/v1/admin/payments/stats
 */
export const getPaymentStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    // Get statistics
    const [totalPayments, completedPayments, failedPayments, pendingPayments, totalRevenue] =
      await Promise.all([
        db.payment.count({ where }),
        db.payment.count({ where: { ...where, status: 'COMPLETED' } }),
        db.payment.count({ where: { ...where, status: 'FAILED' } }),
        db.payment.count({ where: { ...where, status: 'PENDING' } }),
        db.payment.aggregate({
          where: { ...where, status: 'COMPLETED' },
          _sum: { paidAmount: true },
        }),
      ]);

    // Get payments by gateway
    const paymentsByGateway = await db.payment.groupBy({
      by: ['gateway'],
      where: { ...where, status: 'COMPLETED' },
      _count: true,
      _sum: { paidAmount: true },
    });

    // Get payments by status
    const paymentsByStatus = await db.payment.groupBy({
      by: ['status'],
      where,
      _count: true,
    });

    const stats = {
      overview: {
        total: totalPayments,
        completed: completedPayments,
        failed: failedPayments,
        pending: pendingPayments,
        totalRevenue: totalRevenue._sum.paidAmount?.toString() || '0',
      },
      byGateway: paymentsByGateway.map((g) => ({
        gateway: g.gateway,
        count: g._count,
        revenue: g._sum.paidAmount?.toString() || '0',
      })),
      byStatus: paymentsByStatus.map((s) => ({
        status: s.status,
        count: s._count,
      })),
    };

    return sendSuccessResponse(res, stats, 'Payment statistics retrieved successfully');
  } catch (error) {
    return next(error);
  }
};
