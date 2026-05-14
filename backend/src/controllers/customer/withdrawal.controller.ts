import type { Response } from 'express'
import db from '../../configs/db'
import { NotificationService } from '../../services/notification.service'
import type { AuthRequest } from '../../types/req-res'
import { CreateWithdrawalSchema } from '../../validations/zod/withdrawal.schema'

const notificationService = new NotificationService()

/**
 * Create Withdrawal Request
 * POST /api/v1/customer/withdrawals
 */
export const createWithdrawal = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      })
    }

    // Validate request body
    const validatedData = CreateWithdrawalSchema.parse(req.body)

    // Get user's current balance and info
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        balance: true,
        referralEarnings: true,
        email: true,
        firstName: true,
        username: true
      }
    })

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    const source = validatedData.source ?? 'balance'
    const amount = validatedData.amount

    if (source === 'referral') {
      const available = Number(user.referralEarnings)
      if (amount > available) {
        return res.status(400).json({
          success: false,
          message: `Insufficient referral earnings. Available: $${available.toFixed(2)}`
        })
      }
    } else if (amount > Number(user.balance)) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Available: $${Number(user.balance).toFixed(2)}`
      })
    }

    const withdrawal = await db.$transaction(async (tx) => {
      const createdWithdrawal = await tx.withdrawal.create({
        data: {
          userId,
          amount: validatedData.amount,
          method: validatedData.method,
          status: 'PENDING',
          meta: { ...(validatedData.meta || {}), source }
        }
      })

      if (source === 'referral') {
        await tx.user.update({
          where: { id: userId },
          data: { referralEarnings: { decrement: amount } }
        })
      }

      return createdWithdrawal
    })

    // Notify admins about the withdrawal request
    try {
      const customerName = user.firstName || user.username || user.email
      await notificationService.notifyAdminsWithdrawalRequest({
        customerName,
        customerEmail: user.email,
        amount: Number(validatedData.amount),
        method: validatedData.method,
        currentBalance: source === 'referral' ? Number(user.referralEarnings) : Number(user.balance),
        withdrawalId: withdrawal.id
      })
      console.log('[Withdrawal] Admin notification sent for withdrawal request', {
        withdrawalId: withdrawal.id,
        userId
      })
    } catch (error) {
      console.error('[Withdrawal] Failed to send admin notification', {
        withdrawalId: withdrawal.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    res.status(201).json({
      success: true,
      data: withdrawal,
      message: 'Withdrawal request created successfully. Admin will process it soon.'
    })
  } catch (error) {
    console.error('Create withdrawal error:', error)

    if (error instanceof Error && error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error
      })
    }

    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create withdrawal request'
    })
  }
}

/**
 * Get Customer's Withdrawal Requests
 * GET /api/v1/customer/withdrawals
 */
export const getWithdrawals = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      })
    }

    const { page = 1, limit = 20, status } = req.query

    const skip = (Number(page) - 1) * Number(limit)
    const where: any = { userId }

    // Status filter
    if (status && (status === 'PENDING' || status === 'DONE')) {
      where.status = status
    }

    // Execute queries in parallel
    const [withdrawals, total] = await Promise.all([
      db.withdrawal.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      }),
      db.withdrawal.count({ where })
    ])

    res.json({
      success: true,
      data: withdrawals,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / Number(limit)),
        hasNext: Number(page) * Number(limit) < total,
        hasPrev: Number(page) > 1
      },
      message: 'Withdrawal requests retrieved successfully'
    })
  } catch (error) {
    console.error('Get withdrawals error:', error)
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve withdrawal requests'
    })
  }
}

/**
 * Get Single Withdrawal Request
 * GET /api/v1/customer/withdrawals/:id
 */
export const getWithdrawalById = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId
    const withdrawalId = parseInt(req.params.id!)

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      })
    }

    if (isNaN(withdrawalId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid withdrawal ID'
      })
    }

    const withdrawal = await db.withdrawal.findFirst({
      where: {
        id: withdrawalId,
        userId // Ensure user can only access their own withdrawals
      }
    })

    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal request not found'
      })
    }

    res.json({
      success: true,
      data: withdrawal,
      message: 'Withdrawal request retrieved successfully'
    })
  } catch (error) {
    console.error('Get withdrawal by ID error:', error)
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve withdrawal request'
    })
  }
}
