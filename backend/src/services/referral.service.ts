/**
 * Referral / affiliate service: list referred users, earnings, transfer to balance
 */

import db from '../configs/db'

export interface ReferralItem {
  userId: number
  username: string | null
  email: string
  joinedDate: Date
  hasOrder: boolean
  orderTotal: number
  orderDate: Date | null
  planName: string | null
  earnings: number
}

export interface ReferralsResult {
  referrals: ReferralItem[]
  totalReferrals: number
  totalReferredSales: number
  totalEarnings: number
}

export class ReferralService {
  /**
   * Get all users referred by this user, with their first order and commission
   */
  async getReferrals(referrerId: number): Promise<ReferralsResult> {
    const referredUsers = await db.user.findMany({
      where: { referredById: referrerId },
      select: {
        id: true,
        email: true,
        username: true,
        createdAt: true,
        orders: {
          where: { status: { in: ['COMPLETED', 'PARTIAL'] } },
          orderBy: { createdAt: 'asc' },
          take: 1,
          select: {
            id: true,
            total: true,
            createdAt: true,
            product: { select: { name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const setting = await db.settings.findUnique({
      where: { key: 'affiliate_settings' }
    })
    const pct = Number((setting?.value as any)?.affiliateCommissionPct ?? 10)

    const referrals: ReferralItem[] = referredUsers.map((u) => {
      const firstOrder = u.orders[0]
      const orderTotal = firstOrder ? Number(firstOrder.total) : 0
      const earnings = (orderTotal * pct) / 100
      return {
        userId: u.id,
        username: u.username,
        email: u.email,
        joinedDate: u.createdAt,
        hasOrder: !!firstOrder,
        orderTotal,
        orderDate: firstOrder?.createdAt ?? null,
        planName: firstOrder?.product?.name ?? null,
        earnings
      }
    })

    const totalReferredSales = referrals.reduce((s, r) => s + r.orderTotal, 0)
    const totalEarnings = referrals.reduce((s, r) => s + r.earnings, 0)

    return {
      referrals,
      totalReferrals: referrals.length,
      totalReferredSales,
      totalEarnings
    }
  }

  /**
   * Transfer amount from referral earnings to main balance. Deducts from referralEarnings.
   */
  async transferToBalance(userId: number, amount: number): Promise<{ success: boolean; error?: string }> {
    if (!Number.isFinite(amount) || amount <= 0) {
      return { success: false, error: 'Amount must be greater than 0' }
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { referralEarnings: true, balance: true }
    })

    if (!user) {
      return { success: false, error: 'User not found' }
    }

    const available = Number(user.referralEarnings)
    if (amount > available) {
      return { success: false, error: 'Insufficient referral earnings' }
    }

    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          referralEarnings: { decrement: amount },
          balance: { increment: amount }
        }
      })

      await tx.balanceTransaction.create({
        data: {
          userId,
          type: 'BONUS',
          amount,
          balanceBefore: user.balance,
          balanceAfter: Number(user.balance) + amount,
          reference: `AFFILIATE-CONVERT-${Date.now()}`,
          description: 'Affiliate earnings converted to balance',
          createdBy: 'affiliate',
          meta: {
            source: 'affiliate',
            convertedAmount: amount
          }
        }
      })
    })

    return { success: true }
  }
}
