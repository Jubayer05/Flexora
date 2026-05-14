import type { NextFunction, Request, Response } from 'express'
import { FeedbackSource, NameStatus } from '@prisma/client'
import db from '../configs/db'
import { cacheService } from '../services/cache.service'
import { SettingService } from '../services/setting.services'
import { telegramNotificationService } from '../services/telegram-notification.service'
import { sendSuccessResponse, type ApiResponse } from '../utils'
import { fakeFeedbackSchema } from '../validations'
import {
  multipleKeysParamsSchema,
  settingKeyParamsSchema,
  settingQuerySchema,
  upsertSettingSchema
} from '../validations/zod/setting.schema'

// Initialize service
const settingService = new SettingService()

// ================================
// CRUD OPERATIONS
// ================================

export const getSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const validatedQuery = settingQuerySchema.parse(req.query)
    const result = await settingService.findMany(validatedQuery)

    return sendSuccessResponse(res, result, 'Settings retrieved successfully')
  } catch (error) {
    return next(error)
  }
}

export const getSettingByKey = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { key } = settingKeyParamsSchema.parse(req.params)
    const setting = await settingService.findByKey(key)

    return sendSuccessResponse(res, setting, 'Setting retrieved successfully')
  } catch (error) {
    return next(error)
  }
}

export const getMultipleSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { keys } = multipleKeysParamsSchema.parse(req.params)
    const settings = await settingService.getMultipleByKeys(keys)

    return sendSuccessResponse(res, settings, 'Settings retrieved successfully')
  } catch (error) {
    return next(error)
  }
}

export const upsertSetting = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { key } = settingKeyParamsSchema.parse(req.params)
    const validatedData = upsertSettingSchema.parse(req.body)

    const setting = await settingService.upsertSetting(key, validatedData)

    if (key === 'telegram_config') {
      await telegramNotificationService.reloadConfig()
    }

    return sendSuccessResponse(res, setting, 'Setting saved successfully')
  } catch (error) {
    return next(error)
  }
}

export const addBulkItems = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { key } = req.params
    if (!key) throw new Error('Setting key is required')

    const validatedData = upsertSettingSchema.parse(req.body)

    if (validatedData.type && validatedData.type === 'UPDATE') {
      await db.settings.upsert({
        where: { key },

        update: { value: validatedData.value },
        create: { key, value: validatedData.value }
      })

      // Invalidate cache
      await cacheService.clearPattern('uhq:settings:*')

      return sendSuccessResponse(res, null, 'Setting saved successfully')
    }

    const existingData = await db.settings.findFirst({ where: { key } })

    if (existingData && Array.isArray(existingData.value)) {
      const allItems = new Set(existingData.value)
      for (const item of validatedData.value) {
        allItems.add(item)
      }
      validatedData.value = Array.from(allItems)
    }

    const setting = await db.settings.upsert({
      where: { key },

      update: { value: validatedData.value },
      create: { key, value: validatedData.value }
    })

    // Invalidate cache
    await cacheService.clearPattern('uhq:settings:*')

    return sendSuccessResponse(res, setting, 'Setting saved successfully')
  } catch (error) {
    return next(error)
  }
}

export const createFakeFeedbacks = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { minRatings, maxRatings, startedAt, endedAt, reviews } = fakeFeedbackSchema.parse(
      req.body
    )

    // Determine if reviews should be scheduled or published immediately
    const shouldSchedule = startedAt !== undefined && endedAt !== undefined

    // Helper function to generate random rating between minRatings and maxRatings
    const getRandomRating = (): number => {
      const min = minRatings
      const max = maxRatings
      return Math.round((Math.random() * (max - min) + min) * 10) / 10
    }

    // Helper: random delay in seconds between minSeconds and maxSeconds (inclusive)
    const getRandomDelaySeconds = (minSeconds: number, maxSeconds: number): number => {
      const min = Math.min(minSeconds, maxSeconds)
      const max = Math.max(minSeconds, maxSeconds)
      return Math.floor(min + Math.random() * (max - min + 1))
    }

    // Helper: convert seconds-from-now to Date (cumulative: each review is after the previous)
    const getScheduledAtFromCumulativeSeconds = (totalSecondsFromNow: number): Date =>
      new Date(Date.now() + totalSecondsFromNow * 1000)

    const result = await db.$transaction(async (tx) => {
      // IMPORTANT: enforce uniqueness even under concurrency.
      // We reserve AVAILABLE names using row locks (FOR UPDATE SKIP LOCKED) and mark them USED
      // BEFORE creating feedbacks, all inside the same transaction.
      const reservedNames = await tx.$queryRaw<Array<{ id: number; name: string }>>`
        WITH picked AS (
          SELECT "id", "name"
          FROM "FakeNames"
          WHERE "status" = ${NameStatus.AVAILABLE}::"NameStatus"
          ORDER BY "id" ASC
          FOR UPDATE SKIP LOCKED
          LIMIT ${reviews.length}
        )
        UPDATE "FakeNames" fn
        SET "status" = ${NameStatus.USED}::"NameStatus"
        FROM picked
        WHERE fn."id" = picked."id"
        RETURNING picked."id", picked."name";
      `

      if (!reservedNames.length) {
        throw new Error('No available customer names found for bulk reviews.')
      }

      const actualCount = Math.min(reservedNames.length, reviews.length)

      // Cumulative delay in seconds from now (each review gets a random delay in [min, max] added to previous)
      let cumulativeSecondsFromNow = 0

      const feedbacksToCreate = []

      for (let i = 0; i < actualCount; i++) {
        const reserved = reservedNames[i]
        const review = reviews[i]
        if (!reserved || !review) continue

        if (shouldSchedule) {
          const delaySeconds = getRandomDelaySeconds(startedAt!, endedAt!)
          cumulativeSecondsFromNow += delaySeconds
        }

        const timestamp = shouldSchedule
          ? getScheduledAtFromCumulativeSeconds(cumulativeSecondsFromNow)
          : new Date()

        feedbacksToCreate.push({
          name: reserved.name,
          feedback: review,
          rating: getRandomRating(),
          source: FeedbackSource.BULK_GENERATED,
          published: !shouldSchedule, // false if scheduled, true if immediate
          isScheduled: shouldSchedule,
          scheduledAt: shouldSchedule ? timestamp : null,
          createdAt: timestamp
        })
      }

      return await tx.feedback.createMany({ data: feedbacksToCreate })
    })

    const message = shouldSchedule
      ? `Successfully scheduled ${result.count} fake feedback(s) for future publishing.`
      : `Successfully created ${result.count} fake feedback(s).`

    return sendSuccessResponse(
      res,
      {
        message,
        scheduled: shouldSchedule,
        count: result.count
      },
      message
    )
  } catch (error) {
    return next(error)
  }
}

export const deleteSetting = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { key } = settingKeyParamsSchema.parse(req.params)
    const result = await settingService.deleteByKey(key)

    return sendSuccessResponse(res, result, 'Setting deleted successfully')
  } catch (error) {
    return next(error)
  }
}

/**
 * Bulk restore settings from backup data
 * Useful for restoring settings after database reset
 */
export const bulkRestoreSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { data } = req.body

    if (!Array.isArray(data) || data.length === 0) {
      return next(new Error('Data must be a non-empty array'))
    }

    // Validate each item has required fields
    for (const item of data) {
      if (!item.key || typeof item.key !== 'string') {
        return next(new Error('Each item must have a valid key'))
      }
    }

    // Bulk create all settings
    const result = await db.settings.createMany({
      data: data.map((item) => ({
        key: item.key,
        value: item.value
      })),
      skipDuplicates: true // Skip if key already exists
    })

    // Clear all settings cache
    await cacheService.clearPattern('uhq:settings:*')

    return sendSuccessResponse(
      res,
      {
        created: result.count,
        total: data.length
      },
      `Successfully restored ${result.count} setting(s)`
    )
  } catch (error) {
    return next(error)
  }
}
