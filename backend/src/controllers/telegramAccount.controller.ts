import type { NextFunction, Request, Response } from 'express'
import db from '../configs/db'
import { TelegramAccountService } from '../services/telegram-account.service'
import { telegramProxyService } from '../services/telegram/proxy.service'
import type { CreateTelegramAccount, TelegramAccountMeta } from '../types/telegram.types'
import {
  sendConflictResponse,
  sendCreatedResponse,
  sendSuccessResponse,
  type ApiResponse
} from '../utils'
import {
  AccountIdSchema,
  CreateTelegramAccountSchema,
  UpdateAccountSchema
} from '../validations/zod/account.schema'

// Initialize services
const telegramAccountService = new TelegramAccountService()

type TelegramManagementStatus =
  | 'available'
  | 'used'
  | 'invalid'
  | 'broke'
  | 'banned'
  | 'relogin_required'

const normalizePhone = (phone?: string | null): string => String(phone || '').replace(/\D/g, '')

const normalizeHealthStatus = (
  value?: string | null
): 'AVAILABLE' | 'INVALID' | 'BROKE' | 'BANNED' | 'RELOGIN_REQUIRED' | null => {
  if (!value) return null

  const normalized = String(value).trim().toUpperCase()

  if (
    normalized === 'AVAILABLE' ||
    normalized === 'INVALID' ||
    normalized === 'BROKE' ||
    normalized === 'BANNED' ||
    normalized === 'RELOGIN_REQUIRED'
  ) {
    return normalized
  }

  return null
}

const deriveManagementStatus = (
  account: any,
  session?: { isAuthorized: boolean } | null
): {
  status: TelegramManagementStatus
  healthStatus: 'AVAILABLE' | 'INVALID' | 'BROKE' | 'BANNED' | 'RELOGIN_REQUIRED'
  healthMessage: string
} => {
  const meta = (account.meta as TelegramAccountMeta) || {}
  const explicitHealth = normalizeHealthStatus(meta.accountHealthStatus)
  const hasSessionReference = Boolean(meta.phone || meta.sessionFile || meta.sessionString)

  if (account.isUsed) {
    return {
      status: 'used',
      healthStatus: 'AVAILABLE',
      healthMessage: 'Account sold successfully'
    }
  }

  if (explicitHealth === 'BANNED') {
    return {
      status: 'banned',
      healthStatus: 'BANNED',
      healthMessage: meta.accountHealthMessage || 'Account marked as banned'
    }
  }

  if (!hasSessionReference) {
    return {
      status: 'broke',
      healthStatus: 'BROKE',
      healthMessage: 'Session data is missing or broken'
    }
  }

  if (!session) {
    if (account.isValid && explicitHealth === 'AVAILABLE') {
      return {
        status: 'available',
        healthStatus: 'AVAILABLE',
        healthMessage: 'Account is available'
      }
    }

    return {
      status: 'relogin_required',
      healthStatus: 'RELOGIN_REQUIRED',
      healthMessage: 'Session not found. Re-login required'
    }
  }

  if (!session.isAuthorized) {
    return {
      status: 'relogin_required',
      healthStatus: 'RELOGIN_REQUIRED',
      healthMessage: 'Session is logged out or no longer authorized'
    }
  }

  if (!account.isValid && explicitHealth === 'BROKE') {
    return {
      status: 'broke',
      healthStatus: 'BROKE',
      healthMessage: meta.accountHealthMessage || 'Account session is broken'
    }
  }

  if (!account.isValid && explicitHealth === 'INVALID') {
    return {
      status: 'invalid',
      healthStatus: 'INVALID',
      healthMessage: meta.accountHealthMessage || 'Account is invalid'
    }
  }

  return {
    status: 'available',
    healthStatus: 'AVAILABLE',
    healthMessage: 'Account is available'
  }
}

// ================================
// CRUD OPERATIONS
// ================================

/**
 * Create a new Telegram account
 */
export const createTelegramAccount = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const validatedData = CreateTelegramAccountSchema.parse(req.body)

    // Check if phone number already exists (using meta field for efficiency)
    const existingAccount = await db.account.findFirst({
      where: {
        platform: 'TELEGRAM',
        meta: {
          path: ['phone'],
          equals: validatedData.phone
        }
      }
    })

    if (existingAccount) {
      return sendConflictResponse(
        res,
        `Phone number ${validatedData.phone} already exists in an Account`
      )
    }

    // Convert the schema format to service format
    const telegramAccountData: CreateTelegramAccount = {
      productId: validatedData.productId || undefined,
      credentials: {
        username: validatedData.username,
        phone: validatedData.phone,
        password: validatedData.password,
        sessionData: validatedData.sessionData || `session_file_reference_${validatedData.phone}`
      },
      meta: {
        phone: validatedData.phone, // Store phone in meta for quick lookups
        sessionFile: validatedData.sessionFile,
        sessionString: validatedData.sessionString,
        notes: validatedData.notes,
        accountHealthStatus: 'AVAILABLE',
        accountHealthMessage: 'Account is available',
        proxy: validatedData.proxy
      },
      hasPremium: validatedData.hasPremium
    }

    const account = await telegramAccountService.create(telegramAccountData)

    return sendCreatedResponse(res, account, 'Telegram account created successfully')
  } catch (error) {
    return next(error)
  }
}

/**
 * Get a Telegram account by ID (with encrypted credentials for admin)
 */
export const getTelegramAccount = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = req.params
    const { includeCredentials } = req.query
    const account = await telegramAccountService.findById(Number(id), includeCredentials === 'true')

    const session = account.meta?.phone
      ? await db.telegramSession.findUnique({
          where: { phoneNumber: normalizePhone(account.meta.phone) },
          select: { isAuthorized: true }
        })
      : null

    const derivedStatus = deriveManagementStatus(
      {
        ...account,
        isValid:
          normalizeHealthStatus(account.meta?.accountHealthStatus) === 'BANNED'
            ? false
            : (account as any).isValid ?? true
      },
      session
    )

    // Transform to simplified format for API response
    const response = {
      id: account.id,
      phone: account.meta?.phone || account.credentials?.phone,
      sessionPath: account.meta?.sessionFile,
      proxy: account.meta?.proxy,
      status: derivedStatus.status,
      createdAt: account.createdAt,
      ...(includeCredentials === 'true' && account.credentials
        ? {
            credentials: {
              phone: account.credentials.phone,
              password: account.credentials.password,
              sessionData: account.credentials.sessionData,
              backupCodes: account.credentials.backupCodes
            }
          }
        : {})
    }

    return sendSuccessResponse(res, response, 'Telegram account retrieved successfully')
  } catch (error) {
    return next(error)
  }
}

/**
 * Get all Telegram accounts with pagination and filters
 */
export const getTelegramAccounts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { page = 1, limit = 10, productId, isUsed, isValid, archived, unassigned, isTransferOnly } = req.query

    // Parse pagination parameters
    const pageNum = parseInt(page as string, 10)
    const limitNum = parseInt(limit as string, 10)
    const skip = (pageNum - 1) * limitNum

    // Build where conditions
    const where: any = {
      platform: 'TELEGRAM'
    }

    // Handle unassigned accounts filter (productId is null)
    if (unassigned === 'true') {
      where.productId = null
    } else if (productId) {
      const parsedProductId = parseInt(productId as string, 10)
      if (!isNaN(parsedProductId)) {
        where.productId = parsedProductId
      }
    }

    if (isUsed !== undefined) {
      where.isUsed = isUsed === 'true'
    }

    if (isValid !== undefined) {
      where.isValid = isValid === 'true'
    }

    // Filter archived accounts - by default exclude them
    if (archived !== undefined) {
      where.archived = archived === 'true'
    } else {
      where.archived = false
    }

    // Filter by Transfer Only flag (stored in meta.isTransferOnly)
    if (isTransferOnly !== undefined) {
      // For Transfer Only filtering, we need to check the meta field
      // This is handled after fetching since meta is JSON
    }

    // Get accounts with pagination
    const [accounts, total] = await Promise.all([
      db.account.findMany({
        where,
        skip,
        take: limitNum,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              category: true
            }
          },
          usedByOrder: {
            select: {
              id: true,
              orderNumber: true,
              createdAt: true,
              product: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                  platform: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      db.account.count({ where })
    ])

    const phones = accounts
      .map((account: any) => normalizePhone((account.meta as TelegramAccountMeta | undefined)?.phone))
      .filter(Boolean)

    const sessions = phones.length
      ? await db.telegramSession.findMany({
          where: {
            phoneNumber: {
              in: phones
            }
          },
          select: {
            phoneNumber: true,
            isAuthorized: true
          }
        })
      : []

    const sessionsByPhone = new Map(
      sessions.map((session) => [normalizePhone(session.phoneNumber), session])
    )

    const statusSyncUpdates: Array<Promise<any>> = []

    const result = {
      accounts: accounts
        .filter((account: any) => {
          // Apply Transfer Only filter if requested
          if (isTransferOnly === 'true') {
            const meta = account.meta as any
            return meta?.isTransferOnly === true
          }
          return true
        })
        .map((account: any) => {
          const meta = account.meta as any
          const session = meta?.phone ? sessionsByPhone.get(normalizePhone(meta.phone)) : null
          const derivedStatus = deriveManagementStatus(account, session)

          const currentHealth = normalizeHealthStatus(meta?.accountHealthStatus)
          const currentHealthMessage = typeof meta?.accountHealthMessage === 'string' ? meta.accountHealthMessage : ''
          const shouldSyncMeta =
            currentHealth !== derivedStatus.healthStatus ||
            currentHealthMessage !== derivedStatus.healthMessage ||
            Boolean(account.isValid) !== (derivedStatus.status === 'available')

          if (shouldSyncMeta && !account.isUsed) {
            statusSyncUpdates.push(
              db.account.update({
                where: { id: account.id },
                data: {
                  isValid: derivedStatus.status === 'available',
                  meta: {
                    ...meta,
                    accountHealthStatus: derivedStatus.healthStatus,
                    accountHealthMessage: derivedStatus.healthMessage,
                    lastStatusCheckedAt: new Date().toISOString()
                  }
                }
              })
            )
          }

          return {
            id: account.id,
            phone: meta?.phone,
            meta,
            sessionPath: meta?.sessionFile,
            proxy: meta?.proxy,
            status: derivedStatus.status,
            archived: account.archived || false, // Include archived status
            createdAt: account.createdAt,
            product: account.product
              ? {
                  id: account.product.id,
                  name: account.product.name
                }
              : null,
            usedByOrder: account.usedByOrder ? {
              id: account.usedByOrder.id,
              orderNumber: account.usedByOrder.orderNumber,
              createdAt: account.usedByOrder.createdAt,
              product: account.usedByOrder.product ? {
                id: account.usedByOrder.product.id,
                name: account.usedByOrder.product.name,
                type: account.usedByOrder.product.type,
                platform: account.usedByOrder.product.platform
              } : null
            } : null
          }
        }),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
        hasNext: pageNum < Math.ceil(total / limitNum),
        hasPrev: pageNum > 1
      }
    }

    if (statusSyncUpdates.length > 0) {
      await Promise.allSettled(statusSyncUpdates)
    }

    return sendSuccessResponse(res, result, 'Telegram accounts retrieved successfully')
  } catch (error) {
    return next(error)
  }
}

/**
 * Get Telegram accounts for specific product
 */
export const getTelegramAccountsByProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { productId } = req.params

    if (!productId) {
      return next(new Error('Product ID is required'))
    }

    const parsedProductId = parseInt(productId, 10)

    if (isNaN(parsedProductId) || parsedProductId <= 0) {
      return next(new Error('Invalid product ID'))
    }

    const { includeUsed } = req.query
    const accounts = await telegramAccountService.findByProduct(
      parsedProductId,
      includeUsed === 'true'
    )

    return sendSuccessResponse(res, accounts, 'Telegram accounts retrieved successfully')
  } catch (error) {
    return next(error)
  }
}

/**
 * Update a Telegram account
 */
export const updateTelegramAccount = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = req.params
    const validatedData = UpdateAccountSchema.parse(req.body)

    // Build update data
    let updateData: any = { ...validatedData }

    // Handle credentials update - only include non-empty fields
    if (
      validatedData.phone ||
      validatedData.email ||
      validatedData.username ||
      validatedData.password
    ) {
      const credentials: any = {}

      if (validatedData.phone) credentials.phone = validatedData.phone
      if (validatedData.email) credentials.email = validatedData.email
      if (validatedData.username) credentials.username = validatedData.username
      if (validatedData.password) credentials.password = validatedData.password

      updateData.credentials = credentials
    }

    // Remove individual credential fields from root level
    delete updateData.phone
    delete updateData.email
    delete updateData.username
    delete updateData.password

    const account = await telegramAccountService.update(Number(id), updateData)

    return sendSuccessResponse(res, account, 'Telegram account updated successfully')
  } catch (error) {
    return next(error)
  }
}

/**
 * Delete a Telegram account
 */
export const deleteTelegramAccount = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = req.params
    const result = await telegramAccountService.delete(Number(id))

    return sendSuccessResponse(res, result, 'Telegram account deleted successfully')
  } catch (error) {
    return next(error)
  }
}

// ================================
// ACCOUNT MANAGEMENT
// ================================

/**
 * Mark account as used (typically called during order fulfillment)
 */
export const markAccountAsUsed = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = AccountIdSchema.parse(req.params)
    const { orderId } = req.body

    const result = await telegramAccountService.markAsUsed(id, orderId)

    return sendSuccessResponse(res, result, 'Account marked as used successfully')
  } catch (error) {
    return next(error)
  }
}

/**
 * Validate/Invalidate a Telegram account
 */
export const validateTelegramAccount = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = AccountIdSchema.parse(req.params)
    const { isValid } = req.body

    if (typeof isValid !== 'boolean') {
      return next(new Error('isValid field is required and must be a boolean'))
    }

    const result = await telegramAccountService.validateAccount(id, isValid)

    return sendSuccessResponse(
      res,
      result,
      `Account marked as ${isValid ? 'valid' : 'invalid'} successfully`
    )
  } catch (error) {
    return next(error)
  }
}

// ================================
// BULK OPERATIONS
// ================================

/**
 * Bulk import Telegram accounts
 */
export const bulkImportTelegramAccounts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { productId, accounts } = req.body

    if (!productId || !Array.isArray(accounts) || accounts.length === 0) {
      return next(new Error('Product ID and accounts array are required'))
    }

    // Convert accounts to service format
    const formattedAccounts = accounts.map((acc: any) => ({
      productId,
      credentials: {
        phone: acc.phone,
        password: acc.password,
        sessionData: acc.sessionData
      },
      meta: {
        phone: acc.phone, // Store phone in meta for quick lookups
        sessionFile: acc.sessionFile,
        sessionString: acc.sessionString,
        notes: acc.notes,
        proxy: acc.proxy
      },
      hasPremium: acc.hasPremium || false
    }))

    const result = await telegramAccountService.bulkImport(formattedAccounts)

    return sendCreatedResponse(res, result, 'Telegram accounts imported successfully')
  } catch (error) {
    return next(error)
  }
}

/**
 * Bulk validate/invalidate accounts
 */
export const bulkValidateTelegramAccounts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { accountIds, isValid } = req.body

    if (!Array.isArray(accountIds) || accountIds.length === 0) {
      return next(new Error('Account IDs array is required'))
    }

    if (typeof isValid !== 'boolean') {
      return next(new Error('isValid field is required and must be a boolean'))
    }

    const result = await telegramAccountService.validateBulk(accountIds, isValid)

    return sendSuccessResponse(
      res,
      result,
      `Accounts marked as ${isValid ? 'valid' : 'invalid'} successfully`
    )
  } catch (error) {
    return next(error)
  }
}

/**
 * Bulk assign accounts to product
 */
export const bulkAssignAccountsToProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { accountIds, productId } = req.body

    if (!Array.isArray(accountIds) || accountIds.length === 0) {
      return next(new Error('Account IDs array is required'))
    }

    if (!productId || typeof productId !== 'number') {
      return next(new Error('Product ID is required and must be a number'))
    }

    const result = await telegramAccountService.bulkAssignToProduct(accountIds, productId)

    return sendSuccessResponse(res, result, 'Accounts assigned to product successfully')
  } catch (error) {
    return next(error)
  }
}

/**
 * Bulk change proxy for accounts
 */
export const bulkChangeProxy = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { accountIds, proxy } = req.body

    if (!Array.isArray(accountIds) || accountIds.length === 0) {
      return next(new Error('Account IDs array is required'))
    }

    if (!proxy || !proxy.host || !proxy.port) {
      return next(new Error('Proxy configuration (host and port) is required'))
    }

    if (proxy.type && !['SOCKS5', 'HTTP'].includes(proxy.type)) {
      return next(new Error('Proxy type must be SOCKS5 or HTTP'))
    }

    const result = await telegramAccountService.bulkChangeProxy(accountIds, {
      host: proxy.host.trim(),
      port: Number(proxy.port),
      type: proxy.type || 'SOCKS5',
      username: proxy.username?.trim(),
      password: proxy.password?.trim(),
    })

    return sendSuccessResponse(res, result, 'Proxy updated for accounts successfully')
  } catch (error) {
    return next(error)
  }
}

/**
 * Bulk test sessions for accounts
 */
export const bulkTestSessions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { accountIds } = req.body

    if (!Array.isArray(accountIds) || accountIds.length === 0) {
      return next(new Error('Account IDs array is required'))
    }

    const result = await telegramAccountService.bulkTestSessions(accountIds)

    const validCount = result.results.filter((r) => r.valid).length
    const invalidCount = result.results.length - validCount

    return sendSuccessResponse(
      res,
      result,
      `Session test completed: ${validCount} valid, ${invalidCount} invalid`
    )
  } catch (error) {
    return next(error)
  }
}

// ================================
// ASSIGNMENT & DELIVERY
// ================================

/**
 * Assign accounts to order (for order fulfillment)
 */
export const assignAccountsToOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { productId, quantity } = req.body

    if (!productId || !quantity || quantity <= 0) {
      return next(new Error('Product ID and positive quantity are required'))
    }

    const accounts = await telegramAccountService.assignAccountToOrder(productId, quantity)

    return sendSuccessResponse(res, accounts, 'Accounts assigned to order successfully')
  } catch (error) {
    return next(error)
  }
}

/**
 * Get account credentials (for order delivery)
 */
export const getAccountCredentials = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = AccountIdSchema.parse(req.params)
    const { orderId } = req.query

    const credentials = await telegramAccountService.getAccountCredentials(
      id,
      orderId ? parseInt(orderId as string, 10) : undefined
    )

    // Return null credentials if not available (not an error state)
    return sendSuccessResponse(
      res,
      credentials || { phone: '', email: '', username: '', password: '' },
      credentials
        ? 'Account credentials retrieved successfully'
        : 'No credentials available for this account'
    )
  } catch (error) {
    return next(error)
  }
}

// ================================
// STATISTICS & ANALYTICS
// ================================

/**
 * Get Telegram account statistics
 */
export const getTelegramAccountStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { productId } = req.query
    const parsedProductId = productId ? parseInt(productId as string, 10) : undefined

    if (parsedProductId && (isNaN(parsedProductId) || parsedProductId <= 0)) {
      return next(new Error('Invalid product ID'))
    }

    const stats = await telegramAccountService.getStats(parsedProductId)

    return sendSuccessResponse(res, stats, 'Telegram account statistics retrieved successfully')
  } catch (error) {
    return next(error)
  }
}

/**
 * Get bulk statistics for multiple products
 */
export const getBulkTelegramStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { productIds } = req.body

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return next(new Error('Product IDs array is required'))
    }

    // Validate product IDs
    const validProductIds = productIds.filter((id: any) => typeof id === 'number' && id > 0)
    if (validProductIds.length === 0) {
      return next(new Error('Valid product IDs are required'))
    }

    const stats = await telegramAccountService.getBulkStats(validProductIds)

    return sendSuccessResponse(res, stats, 'Bulk statistics retrieved successfully')
  } catch (error) {
    return next(error)
  }
}

/**
 * Update proxy configuration for a Telegram account
 */
export const updateAccountProxy = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = AccountIdSchema.parse(req.params)
    const { host, port, type, username, password } = req.body

    // Validate proxy fields
    if (!host || !port) {
      return next(new Error('Proxy host and port are required'))
    }

    if (type && !['SOCKS5', 'HTTP'].includes(type)) {
      return next(new Error('Proxy type must be SOCKS5 or HTTP'))
    }

    // Fetch existing account
    const account = await db.account.findUnique({
      where: { id }
    })

    if (!account || account.platform !== 'TELEGRAM') {
      return next(new Error('Telegram account not found'))
    }

    const currentMeta = (account.meta as any) || {}

    // Update proxy in meta
    const updatedMeta = {
      ...currentMeta,
      proxy: {
        host: host.trim(),
        port: Number(port),
        type: type || 'SOCKS5',
        username: username?.trim() || undefined,
        password: password?.trim() || undefined
      }
    }

    // Update account
    const updatedAccount = await db.account.update({
      where: { id },
      data: {
        meta: updatedMeta as any
      }
    })

    return sendSuccessResponse(
      res,
      {
        id: updatedAccount.id,
        proxy: (updatedAccount.meta as any).proxy
      },
      'Proxy configuration updated successfully'
    )
  } catch (error) {
    return next(error)
  }
}

/**
 * Remove proxy configuration from a Telegram account
 */
export const removeAccountProxy = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = AccountIdSchema.parse(req.params)

    // Fetch existing account
    const account = await db.account.findUnique({
      where: { id }
    })

    if (!account || account.platform !== 'TELEGRAM') {
      return next(new Error('Telegram account not found'))
    }

    const currentMeta = (account.meta as any) || {}

    // Remove proxy from meta
    const updatedMeta = {
      ...currentMeta,
      proxy: undefined
    }

    // Update account
    await db.account.update({
      where: { id },
      data: {
        meta: updatedMeta as any
      }
    })

    return sendSuccessResponse(res, { id, proxy: null }, 'Proxy configuration removed successfully')
  } catch (error) {
    return next(error)
  }
}

/**
 * Auto-assign fresh proxy to Telegram account
 * Fetches the next healthy proxy from the shared proxy pool
 */
export const autoAssignProxy = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = AccountIdSchema.parse(req.params)

    // Fetch account
    const account = await db.account.findUnique({
      where: { id }
    })

    if (!account || account.platform !== 'TELEGRAM') {
      return next(new Error('Telegram account not found'))
    }

    let proxyConfig = null
    try {
      proxyConfig = await telegramProxyService.getNextProxy()
    } catch (error) {
      console.error('Failed to fetch proxy from pool:', error)
      return next(new Error('No healthy proxy found. Please add or enable proxies first.'))
    }

    if (!proxyConfig) {
      return next(new Error('No healthy proxy found. Please add or enable proxies first.'))
    }

    const currentMeta = (account.meta as any) || {}

    // Update proxy in meta
    const updatedMeta = {
      ...currentMeta,
      proxy: proxyConfig
    }

    // Update account
    const updatedAccount = await db.account.update({
      where: { id },
      data: {
        meta: updatedMeta as any
      }
    })

    return sendSuccessResponse(
      res,
      {
        id: updatedAccount.id,
        proxy: (updatedAccount.meta as any).proxy
      },
      'Fresh proxy assigned successfully from proxy pool'
    )
  } catch (error) {
    return next(error)
  }
}

/**
 * Get groups and channels for a Transfer Only account
 * Returns list of groups/channels owned by the account
 */
export const getAccountGroupsChannels = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = req.params

    if (!id) {
      return next(new Error('Account ID is required'))
    }

    const accountId = parseInt(id, 10)
    if (isNaN(accountId) || accountId <= 0) {
      return next(new Error('Invalid account ID'))
    }

    // Get the account
    const account = await db.account.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        meta: true,
        encryptedData: true
      }
    })

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      })
    }

    // Get groups/channels from meta.groups or meta.channels
    const accountMeta = account.meta as any
    const groups = accountMeta?.groups || []
    const channels = accountMeta?.channels || []

    // Combine and format response
    const groupsChannels = [
      ...groups.map((g: any) => ({
        id: g.id || g.chatId,
        name: g.name || g.title,
        username: g.username,
        type: 'group',
        members: g.members,
        isPublic: g.isPublic || false,
        description: g.description,
        url: g.url
      })),
      ...channels.map((c: any) => ({
        id: c.id || c.chatId,
        name: c.name || c.title,
        username: c.username,
        type: 'channel',
        members: c.members,
        isPublic: c.isPublic || false,
        description: c.description,
        url: c.url
      }))
    ]

    return sendSuccessResponse(
      res,
      {
        accountId,
        groupsChannels,
        totalCount: groupsChannels.length
      },
      'Groups and channels retrieved successfully'
    )
  } catch (error) {
    return next(error)
  }
}
