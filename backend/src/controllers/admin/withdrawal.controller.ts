import type { Response } from 'express';
import db from '../../configs/db';
import type { AuthRequest } from '../../types/req-res';
import { UpdateWithdrawalSchema } from '../../validations/zod/withdrawal.schema';

/**
 * Get All Withdrawal Requests (Admin)
 * GET /api/v1/admin/withdrawals
 */
export const getWithdrawals = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, status, userId, search, source } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};

    // Status filter
    if (status && (status === 'PENDING' || status === 'DONE')) {
      where.status = status;
    }

    // User ID filter
    if (userId) {
      where.userId = Number(userId);
    }

    // Search by user email
    if (search) {
      where.user = {
        OR: [
          { email: { contains: search as string, mode: 'insensitive' } },
          { username: { contains: search as string, mode: 'insensitive' } },
        ],
      };
    }

    if (source) {
      where.meta = {
        path: ['source'],
        equals: source,
      };
    }

    // Execute queries in parallel
    const [withdrawals, total] = await Promise.all([
      db.withdrawal.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true,
              firstName: true,
              balance: true,
            },
          },
        },
      }),
      db.withdrawal.count({ where }),
    ]);

    res.json({
      success: true,
      data: withdrawals,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / Number(limit)),
        hasNext: Number(page) * Number(limit) < total,
        hasPrev: Number(page) > 1,
      },
      message: 'Withdrawal requests retrieved successfully',
    });
  } catch (error) {
    console.error('Get withdrawals error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve withdrawal requests',
    });
  }
};

/**
 * Get Single Withdrawal Request (Admin)
 * GET /api/v1/admin/withdrawals/:id
 */
export const getWithdrawalById = async (req: AuthRequest, res: Response) => {
  try {
    const withdrawalId = parseInt(req.params.id!);

    if (isNaN(withdrawalId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid withdrawal ID',
      });
    }

    const withdrawal = await db.withdrawal.findUnique({
      where: { id: withdrawalId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            phone: true,
            balance: true,
          },
        },
      },
    });

    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal request not found',
      });
    }

    res.json({
      success: true,
      data: withdrawal,
      message: 'Withdrawal request retrieved successfully',
    });
  } catch (error) {
    console.error('Get withdrawal by ID error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve withdrawal request',
    });
  }
};

/**
 * Update Withdrawal Request (Admin)
 * PUT /api/v1/admin/withdrawals/:id
 */
export const updateWithdrawal = async (req: AuthRequest, res: Response) => {
  try {
    const withdrawalId = parseInt(req.params.id!);

    if (isNaN(withdrawalId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid withdrawal ID',
      });
    }

    // Validate request body
    const validatedData = UpdateWithdrawalSchema.parse(req.body);

    // Check if withdrawal exists
    const existingWithdrawal = await db.withdrawal.findUnique({
      where: { id: withdrawalId },
      include: { user: { select: { balance: true, referralEarnings: true } } },
    });

    if (!existingWithdrawal) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal request not found',
      });
    }

    const meta =
      existingWithdrawal.meta &&
      typeof existingWithdrawal.meta === 'object' &&
      !Array.isArray(existingWithdrawal.meta)
        ? (existingWithdrawal.meta as Record<string, unknown>)
        : {};
    const source = meta.source === 'referral' ? 'referral' : 'balance';

    // If marking as DONE, balance withdrawals are deducted here.
    // Referral withdrawals are already reserved from referral earnings when the customer creates the request.
    if (validatedData.status === 'DONE' && existingWithdrawal.status !== 'DONE') {
      const user = existingWithdrawal.user;
      const withdrawalAmount = Number(existingWithdrawal.amount);

      if (source === 'referral') {
        const updatedWithdrawal = await db.withdrawal.update({
          where: { id: withdrawalId },
          data: {
            status: 'DONE',
            method: validatedData.method,
            amount: validatedData.amount,
            meta: {
              ...meta,
              ...(validatedData.meta || {}),
              source: 'referral',
              completedAt: new Date().toISOString(),
              completedBy: req.user?.email || 'admin',
            },
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                username: true,
                balance: true,
              },
            },
          },
        });

        return res.json({
          success: true,
          data: updatedWithdrawal,
          message: 'Affiliate withdrawal request marked as done successfully',
        });
      }

      // Check if user has sufficient balance
      if (Number(user.balance) < withdrawalAmount) {
        return res.status(400).json({
          success: false,
          message: `User has insufficient balance. Current balance: $${user.balance}, Withdrawal amount: $${withdrawalAmount}`,
        });
      }

      // Update withdrawal and deduct balance in a transaction
      await db.$transaction(async (tx) => {
        // Update withdrawal status
        await tx.withdrawal.update({
          where: { id: withdrawalId },
          data: {
            status: 'DONE',
            method: validatedData.method,
            amount: validatedData.amount,
            meta: validatedData.meta,
          },
        });

        // Deduct from user balance
        const newBalance = Number(user.balance) - withdrawalAmount;
        await tx.user.update({
          where: { id: existingWithdrawal.userId },
          data: { balance: newBalance },
        });

        // Create balance transaction record
        await tx.balanceTransaction.create({
          data: {
            userId: existingWithdrawal.userId,
            type: 'WITHDRAWAL',
            amount: withdrawalAmount,
            balanceBefore: user.balance,
            balanceAfter: newBalance,
            reference: `WITHDRAWAL-${withdrawalId}`,
            description: `Withdrawal via ${existingWithdrawal.method}`,
            createdBy: req.user?.email || 'admin',
          },
        });
      });

      const updatedWithdrawal = await db.withdrawal.findUnique({
        where: { id: withdrawalId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true,
              balance: true,
            },
          },
        },
      });

      return res.json({
        success: true,
        data: updatedWithdrawal,
        message: 'Withdrawal request completed and balance deducted successfully',
      });
    }

    if (
      source === 'referral' &&
      existingWithdrawal.status === 'PENDING' &&
      validatedData.amount !== undefined
    ) {
      const oldAmount = Number(existingWithdrawal.amount);
      const newAmount = Number(validatedData.amount);
      const difference = newAmount - oldAmount;

      if (difference > 0 && Number(existingWithdrawal.user.referralEarnings) < difference) {
        return res.status(400).json({
          success: false,
          message: `User has insufficient affiliate earnings for this amount change. Available: $${existingWithdrawal.user.referralEarnings}`,
        });
      }

      const withdrawal = await db.$transaction(async (tx) => {
        if (difference !== 0) {
          await tx.user.update({
            where: { id: existingWithdrawal.userId },
            data: {
              referralEarnings:
                difference > 0 ? { decrement: difference } : { increment: Math.abs(difference) },
            },
          });
        }

        return tx.withdrawal.update({
          where: { id: withdrawalId },
          data: {
            status: validatedData.status,
            method: validatedData.method,
            amount: validatedData.amount,
            meta: validatedData.meta ? { ...meta, ...validatedData.meta } : undefined,
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                username: true,
                balance: true,
              },
            },
          },
        });
      });

      return res.json({
        success: true,
        data: withdrawal,
        message: 'Affiliate withdrawal request updated successfully',
      });
    }

    // For other updates (not marking as DONE)
    const withdrawal = await db.withdrawal.update({
      where: { id: withdrawalId },
      data: {
        status: validatedData.status,
        method: validatedData.method,
        amount: validatedData.amount,
        meta: validatedData.meta,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            balance: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: withdrawal,
      message: 'Withdrawal request updated successfully',
    });
  } catch (error) {
    console.error('Update withdrawal error:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error,
      });
    }

    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update withdrawal request',
    });
  }
};

/**
 * Delete Withdrawal Request (Admin)
 * DELETE /api/v1/admin/withdrawals/:id
 */
export const deleteWithdrawal = async (req: AuthRequest, res: Response) => {
  try {
    const withdrawalId = parseInt(req.params.id!);

    if (isNaN(withdrawalId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid withdrawal ID',
      });
    }

    // Check if withdrawal exists
    const existingWithdrawal = await db.withdrawal.findUnique({
      where: { id: withdrawalId },
    });

    if (!existingWithdrawal) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal request not found',
      });
    }

    // Don't allow deletion if already completed
    if (existingWithdrawal.status === 'DONE') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete completed withdrawal request',
      });
    }

    const meta =
      existingWithdrawal.meta &&
      typeof existingWithdrawal.meta === 'object' &&
      !Array.isArray(existingWithdrawal.meta)
        ? (existingWithdrawal.meta as Record<string, unknown>)
        : {};

    await db.$transaction(async (tx) => {
      if (meta.source === 'referral') {
        await tx.user.update({
          where: { id: existingWithdrawal.userId },
          data: { referralEarnings: { increment: existingWithdrawal.amount } },
        });
      }

      await tx.withdrawal.delete({
        where: { id: withdrawalId },
      });
    });

    res.json({
      success: true,
      message: 'Withdrawal request deleted successfully',
    });
  } catch (error) {
    console.error('Delete withdrawal error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete withdrawal request',
    });
  }
};
