import type { NextFunction, Response } from 'express';
import { BalanceService } from '../../services/balance.service';
import type { AuthRequest } from '../../types/req-res';
import { sendErrorResponse, sendSuccessResponse } from '../../utils';
import {
  AddBalanceSchema,
  BalanceHistoryQuerySchema,
  BulkAddBalanceSchema,
  DeductBalanceSchema,
} from '../../validations/zod/balance.schema';

const balanceService = new BalanceService();

function parseId(param?: string): number | null {
  if (!param) return null;
  const v = parseInt(param, 10);
  return isNaN(v) ? null : v;
}

// ================================
// USER BALANCE MANAGEMENT
// ================================

/**
 * Get user balance details
 * GET /api/v1/admin/users/:id/balance
 */
export const getUserBalance = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = parseId(req.params.id);
    if (!userId) return sendErrorResponse(res, 'User ID is required');

    const balance = await balanceService.getBalanceDetails(userId);
    return sendSuccessResponse(res, balance, 'Balance retrieved successfully');
  } catch (error) {
    return next(error);
  }
};

/**
 * Add balance to user
 * POST /api/v1/admin/users/:id/balance/add
 */
export const addUserBalance = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = parseId(req.params.id);
    if (!userId) return sendErrorResponse(res, 'User ID is required');

    const validatedData = AddBalanceSchema.parse(req.body);
    const adminUsername = req.user?.email || 'admin';

    const result = await balanceService.adminAddBalance(
      userId,
      validatedData.amount,
      validatedData.description,
      adminUsername,
      validatedData.type as 'BONUS' | 'ADJUSTMENT'
    );

    return sendSuccessResponse(res, result, 'Balance added successfully');
  } catch (error) {
    return next(error);
  }
};

/**
 * Add balance to user (dashboard form)
 * POST /api/v1/admin/balance/add-user-balance
 */
export const addUserBalanceDashboard = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { userId, amount, reason } = req.body;

    if (!userId || !amount) {
      return sendErrorResponse(res, 'User ID and amount are required', 400);
    }

    const userIdParsed = parseInt(userId, 10);
    if (isNaN(userIdParsed)) {
      return sendErrorResponse(res, 'Invalid user ID', 400);
    }

    if (amount <= 0) {
      return sendErrorResponse(res, 'Amount must be greater than 0', 400);
    }

    const adminUsername = req.user?.email || 'admin';
    const description = reason || 'Admin added balance';

    const result = await balanceService.adminAddBalance(
      userIdParsed,
      amount,
      description,
      adminUsername,
      'BONUS'
    );

    return sendSuccessResponse(res, result, 'Balance added successfully');
  } catch (error) {
    return next(error);
  }
};

/**
 * Deduct balance from user
 * POST /api/v1/admin/users/:id/balance/deduct
 */
export const deductUserBalance = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = parseId(req.params.id);
    if (!userId) return sendErrorResponse(res, 'User ID is required');

    const validatedData = DeductBalanceSchema.parse(req.body);
    const adminUsername = req.user?.email || 'admin';

    const result = await balanceService.adminDeductBalance(
      userId,
      validatedData.amount,
      validatedData.description,
      adminUsername
    );

    return sendSuccessResponse(res, result, 'Balance deducted successfully');
  } catch (error) {
    return next(error);
  }
};

/**
 * Get user balance transaction history
 * GET /api/v1/admin/users/:id/balance/history
 */
export const getUserBalanceHistory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = parseId(req.params.id);
    if (!userId) return sendErrorResponse(res, 'User ID is required');

    const validatedQuery = BalanceHistoryQuerySchema.parse(req.query);
    const history = await balanceService.getTransactionHistory(userId, validatedQuery);

    return sendSuccessResponse(res, history, 'Transaction history retrieved successfully');
  } catch (error) {
    return next(error);
  }
};

// ================================
// BULK OPERATIONS
// ================================

/**
 * Bulk add balance to multiple users
 * POST /api/v1/admin/balance/bulk-add
 */
export const bulkAddBalance = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validatedData = BulkAddBalanceSchema.parse(req.body);
    const adminUsername = req.user?.email || 'admin';

    const result = await balanceService.bulkAddBalance(
      validatedData.userIds,
      validatedData.amount,
      validatedData.description,
      adminUsername,
      validatedData.type as 'BONUS' | 'ADJUSTMENT'
    );

    return sendSuccessResponse(res, result, 'Bulk balance operation completed');
  } catch (error) {
    return next(error);
  }
};

// ================================
// BALANCE STATISTICS
// ================================

/**
 * Get balance system statistics
 * GET /api/v1/admin/balance/statistics
 */
export const getBalanceStatistics = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const stats = await balanceService.getStatistics();
    return sendSuccessResponse(res, stats, 'Statistics retrieved successfully');
  } catch (error) {
    return next(error);
  }
};

/**
 * Get users by balance (high/low)
 * GET /api/v1/admin/balance/users?sortBy=high&limit=10
 */
export const getUsersByBalance = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const sortBy = (req.query.sortBy as 'high' | 'low') || 'high';
    const limit = parseInt(req.query.limit as string) || 10;

    const users = await balanceService.getUsersByBalance({ sortBy, limit });
    return sendSuccessResponse(res, users, 'Users retrieved successfully');
  } catch (error) {
    return next(error);
  }
};

// ================================
// TOPUP REQUEST MANAGEMENT
// ================================

/**
 * Get all topup requests
 * GET /api/v1/admin/balance/topup-requests
 */
export const getTopupRequests = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const status = (req.query.status as string) || 'all';
    const requests = await balanceService.getTopupRequestsList({ status });
    return sendSuccessResponse(res, requests, 'Topup requests retrieved successfully');
  } catch (error) {
    return next(error);
  }
};

/**
 * Approve topup request
 * POST /api/v1/admin/balance/approve-topup/:id
 */
export const approveTopupRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const requestId = parseId(req.params.id);
    if (!requestId) return sendErrorResponse(res, 'Request ID is required');

    const adminUsername = req.user?.email || 'admin';
    const result = await balanceService.approveTopupRequest(requestId, adminUsername);
    return sendSuccessResponse(res, result, 'Topup request approved and balance added');
  } catch (error) {
    return next(error);
  }
};

/**
 * Reject topup request
 * POST /api/v1/admin/balance/reject-topup/:id
 */
export const rejectTopupRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const requestId = parseId(req.params.id);
    if (!requestId) return sendErrorResponse(res, 'Request ID is required');

    const { reason } = req.body;
    const result = await balanceService.rejectTopupRequest(requestId, reason);
    return sendSuccessResponse(res, result, 'Topup request rejected');
  } catch (error) {
    return next(error);
  }
};

// Note: Refund to balance functionality moved to /api/v1/admin/orders/:id/refund
// Use { refundTo: 'BALANCE' } parameter in the order refund endpoint
