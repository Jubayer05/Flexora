import type { NextFunction, Request, Response } from 'express'
import { emailService } from '../services/email.service'
import { sendSuccessResponse, type ApiResponse } from '../utils'
import { GroupEmailPreviewSchema, SendGroupEmailSchema } from '../validations/zod/email.schema'

/**
 * Get group email audience stats and filter options.
 * GET /api/v1/admin/emails/group-stats
 */
export const getGroupEmailStats = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const stats = await emailService.getGroupEmailStats()

    return sendSuccessResponse(res, stats, 'Group email stats fetched successfully')
  } catch (error) {
    return next(error)
  }
}

/**
 * Preview resolved group email recipients.
 * POST /api/v1/admin/emails/group-preview
 */
export const previewGroupEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const validatedData = GroupEmailPreviewSchema.parse(req.body)
    const preview = await emailService.previewGroupEmailRecipients(
      validatedData.targetUsers,
      validatedData.customFilters
    )

    return sendSuccessResponse(res, preview, 'Recipient preview fetched successfully')
  } catch (error) {
    return next(error)
  }
}

/**
 * Send group email to specified audience (customers, moderators, or admins)
 * POST /api/v1/admin/emails/send-group
 */
export const sendGroupEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const validatedData = SendGroupEmailSchema.parse(req.body)
    const html = validatedData.html ?? validatedData.message
    const body = validatedData.body ?? validatedData.message

    if (validatedData.targetUsers) {
      const result = await emailService.sendAdvancedGroupEmail({
        targetUsers: validatedData.targetUsers,
        subject: validatedData.subject,
        body,
        html,
        customFilters: validatedData.customFilters
      })

      const message = `Email sent successfully to ${result.successCount} recipient(s)`

      return sendSuccessResponse(
        res,
        result,
        result.failedCount > 0
          ? `${message}. ${result.failedCount} email(s) failed to send.`
          : message
      )
    }

    const audience = validatedData.audience!
    const result = await emailService.sendGroupEmail(audience, validatedData.subject, body, html)

    const message = `Email sent successfully to ${result.successCount} ${audience}(s)`

    return sendSuccessResponse(
      res,
      result,
      result.failedCount > 0
        ? `${message}. ${result.failedCount} email(s) failed to send.`
        : message
    )
  } catch (error) {
    return next(error)
  }
}
