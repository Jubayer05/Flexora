/**
 * Customer affiliate/referral controller
 * GET /customer/affiliate/referrals - list referred users and earnings
 * GET /customer/affiliate/stats - stats for dashboard
 * GET /customer/affiliate/codes - get user's referral code(s)
 * POST /customer/affiliate/codes/generate - ensure user has a referral code, create if missing
 * POST /customer/affiliate/transfer-to-balance - move referral earnings to main balance
 */

import type { Response } from 'express'
import db from '../../configs/db'
import { ReferralService } from '../../services/referral.service'
import { UserService } from '../../services/user.services'
import type { AuthRequest } from '../../types/req-res'

const referralService = new ReferralService()
const userService = new UserService()

/**
 * GET /api/v1/customer/affiliate/referrals
 */
export const getReferrals = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' })
    }

    const result = await referralService.getReferrals(userId)

    // Shape for frontend: id, email, status, joinedAt, earnings, lastActivity
    const referrals = result.referrals.map((r) => ({
      id: String(r.userId),
      userId: r.userId,
      email: r.email,
      username: r.username,
      status: r.hasOrder ? ('CONVERTED' as const) : ('PENDING' as const),
      joinedAt: r.joinedDate,
      lastActivity: r.orderDate || r.joinedDate,
      earnings: r.earnings,
      hasOrder: r.hasOrder,
      orderTotal: r.orderTotal,
      orderDate: r.orderDate,
      planName: r.planName
    }))

    return res.status(200).json({
      success: true,
      data: {
        referrals,
        totalReferrals: result.totalReferrals,
        totalReferredSales: result.totalReferredSales,
        totalEarnings: result.totalEarnings,
        pagination: {
          page: 1,
          limit: result.referrals.length,
          total: result.totalReferrals,
          pages: 1
        }
      }
    })
  } catch (error) {
    console.error('[Affiliate] getReferrals error:', error)
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch referrals'
    })
  }
}

/**
 * GET /api/v1/customer/affiliate/stats
 */
export const getStats = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' })
    }

    const result = await referralService.getReferrals(userId)
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { referralEarnings: true }
    })
    const withdrawable = user ? Number(user.referralEarnings) : 0

    const activeReferrals = result.referrals.filter((r) => r.hasOrder).length
    const conversionRate =
      result.totalReferrals > 0
        ? Math.round((activeReferrals / result.totalReferrals) * 1000) / 10
        : 0

    return res.status(200).json({
      success: true,
      data: {
        totalEarnings: result.totalEarnings,
        pendingEarnings: withdrawable,
        totalReferrals: result.totalReferrals,
        activeReferrals,
        clickCount: 0,
        conversionRate
      }
    })
  } catch (error) {
    console.error('[Affiliate] getStats error:', error)
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch stats'
    })
  }
}

/**
 * GET /api/v1/customer/affiliate/codes
 * Single referral code per user (referralCode or username)
 */
export const getCodes = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' })
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { referralCode: true, username: true, createdAt: true }
    })

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    const code = user.referralCode || user.username || ''
    const result = await referralService.getReferrals(userId)

    if (!code) {
      return res.status(200).json({ success: true, data: [] })
    }

    return res.status(200).json({
      success: true,
      data: [
        {
          id: 'default',
          code,
          isActive: true,
          createdAt: user.createdAt,
          clickCount: 0,
          earnings: result.totalEarnings
        }
      ]
    })
  } catch (error) {
    console.error('[Affiliate] getCodes error:', error)
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch codes'
    })
  }
}

/**
 * POST /api/v1/customer/affiliate/codes/generate
 * Ensure the current user has a referral code; generate and save one if missing.
 */
export const generateCode = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' })
    }

    const code = await userService.ensureReferralCode(userId)

    return res.status(200).json({
      success: true,
      data: { code },
      message: code ? 'Referral code ready' : 'Failed to generate code'
    })
  } catch (error) {
    console.error('[Affiliate] generateCode error:', error)
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to generate code'
    })
  }
}

/**
 * POST /api/v1/customer/affiliate/transfer-to-balance
 * Body: { amount: number }
 */
export const transferToBalance = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' })
    }

    const amount = Number(req.body?.amount)
    const result = await referralService.transferToBalance(userId, amount)

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      })
    }

    return res.status(200).json({
      success: true,
      data: { transferred: amount },
      message: 'Funds transferred to main balance'
    })
  } catch (error) {
    console.error('[Affiliate] transferToBalance error:', error)
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Transfer failed'
    })
  }
}
