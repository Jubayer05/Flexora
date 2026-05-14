import db from '../configs/db'

export interface CreateAuditLogData {
  userId?: number
  action: string
  entity: string
  entityId?: string | number
  oldValues?: Record<string, any>
  newValues?: Record<string, any>
  ipAddress?: string
  userAgent?: string
}

export class AuditLogService {
  /**
   * Create an audit log entry
   */
  async createLog(data: CreateAuditLogData) {
    try {
      const log = await db.auditLog.create({
        data: {
          userId: data.userId,
          action: data.action,
          entity: data.entity,
          entityId: data.entityId?.toString(),
          oldValues: data.oldValues || {},
          newValues: data.newValues || {},
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
      })
      return log
    } catch (error) {
      console.error('Failed to create audit log:', error)
      // Don't throw - audit logging should not break main operations
      return null
    }
  }

  /**
   * Log account status change
   */
  async logAccountStatusChange(
    accountId: number,
    oldStatus: { isUsed?: boolean; isValid?: boolean; archived?: boolean },
    newStatus: { isUsed?: boolean; isValid?: boolean; archived?: boolean },
    userId?: number
  ) {
    return this.createLog({
      userId,
      action: 'ACCOUNT_STATUS_CHANGED',
      entity: 'Account',
      entityId: accountId.toString(),
      oldValues: oldStatus,
      newValues: newStatus,
    })
  }

  /**
   * Log account assignment to order
   */
  async logAccountAssignment(accountId: number, orderId: number, userId?: number) {
    return this.createLog({
      userId,
      action: 'ACCOUNT_ASSIGNED_TO_ORDER',
      entity: 'Account',
      entityId: accountId.toString(),
      newValues: { orderId, accountId, assignedAt: new Date().toISOString() },
    })
  }

  /**
   * Log order delivery
   */
  async logOrderDelivery(orderId: number, quantityDelivered: number, userId?: number) {
    return this.createLog({
      userId,
      action: 'ORDER_DELIVERED',
      entity: 'Order',
      entityId: orderId.toString(),
      newValues: { orderId, quantityDelivered, deliveredAt: new Date().toISOString() },
    })
  }

  /**
   * Log transfer execution
   */
  async logTransferExecution(transferId: number, status: string, userId?: number) {
    return this.createLog({
      userId,
      action: 'TRANSFER_EXECUTED',
      entity: 'TelegramTransfer',
      entityId: transferId.toString(),
      newValues: { transferId, status, executedAt: new Date().toISOString() },
    })
  }

  /**
   * Log premium purchase
   */
  async logPremiumPurchase(orderId: number, username: string, duration: string, userId?: number) {
    return this.createLog({
      userId,
      action: 'PREMIUM_PURCHASED',
      entity: 'Order',
      entityId: orderId.toString(),
      newValues: { orderId, username, duration, purchasedAt: new Date().toISOString() },
    })
  }

  /**
   * Get audit logs with pagination and filters
   */
  async getLogs(params: {
    page?: number
    limit?: number
    entity?: string
    action?: string
    userId?: number
    startDate?: Date
    endDate?: Date
    search?: string
  }) {
    const page = params.page || 1
    const limit = params.limit || 20
    const skip = (page - 1) * limit

    const where: any = {}

    if (params.entity) {
      where.entity = params.entity
    }

    if (params.action) {
      where.action = params.action
    }

    if (params.userId) {
      where.userId = params.userId
    }

    if (params.search) {
      // Search by entityId (entityId is String in Prisma) - use case-insensitive search
      where.entityId = {
        contains: params.search,
        mode: 'insensitive'
      }
    }

    if (params.startDate || params.endDate) {
      where.createdAt = {}
      if (params.startDate) {
        where.createdAt.gte = params.startDate
      }
      if (params.endDate) {
        where.createdAt.lte = params.endDate
      }
    }

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
            },
          },
        },
      }),
      db.auditLog.count({ where }),
    ])

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    }
  }
}

export const auditLogService = new AuditLogService()

