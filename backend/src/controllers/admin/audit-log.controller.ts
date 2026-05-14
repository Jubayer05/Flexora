import { Request, Response, NextFunction } from 'express'
import db from '../../configs/db'
import { auditLogService } from '../../services/audit-log.service'
import { sendSuccessResponse, sendErrorResponse }  from '../../utils/response-handler'
import { AuditLogQuerySchema } from '../../validations/zod/system.schema'

/**
 * Get audit logs with pagination and filters
 */
export const getAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Parse and validate query parameters
    const validatedQuery = AuditLogQuerySchema.safeParse(req.query)
    
    if (!validatedQuery.success) {
      return sendErrorResponse(
        res,
        `Validation error: ${validatedQuery.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
        400
      )
    }

    const result = await auditLogService.getLogs({
      page: validatedQuery.data.page,
      limit: validatedQuery.data.limit,
      entity: validatedQuery.data.entity,
      action: validatedQuery.data.action,
      userId: validatedQuery.data.userId,
      startDate: validatedQuery.data.startDate ? new Date(validatedQuery.data.startDate) : undefined,
      endDate: validatedQuery.data.endDate ? new Date(validatedQuery.data.endDate) : undefined,
      search: validatedQuery.data.search || validatedQuery.data.entityId,
    })

    return sendSuccessResponse(res, result, 'Audit logs retrieved successfully')
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return next(error)
  }
}

/**
 * Get audit log statistics
 */
export const getAuditLogStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { entity, action, startDate, endDate } = req.query

    const where: any = {}

    if (entity) {
      where.entity = entity
    }

    if (action) {
      where.action = action
    }

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        where.createdAt.gte = new Date(startDate as string)
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate as string)
      }
    }

    const [
      totalLogs,
      accountLogs,
      orderLogs,
      transferLogs,
      premiumLogs,
      recentLogs,
    ] = await Promise.all([
      db.auditLog.count({ where }),
      db.auditLog.count({ where: { ...where, entity: 'Account' } }),
      db.auditLog.count({ where: { ...where, entity: 'Order' } }),
      db.auditLog.count({ where: { ...where, entity: 'TelegramTransfer' } }),
      db.auditLog.count({ where: { ...where, action: 'PREMIUM_PURCHASED' } }),
      db.auditLog.findMany({
        where,
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          action: true,
          entity: true,
          createdAt: true,
        },
      }),
    ])

    return sendSuccessResponse(
      res,
      {
        total: totalLogs,
        byEntity: {
          account: accountLogs,
          order: orderLogs,
          transfer: transferLogs,
          premium: premiumLogs,
        },
        recent: recentLogs,
      },
      'Audit log statistics retrieved successfully'
    )
  } catch (error) {
    return next(error)
  }
}

