import type { NextFunction, Request, Response } from 'express'
import db from '../configs/db'
import { AccountsService } from '../services/account.services'
import {
  sendConflictResponse,
  sendCreatedResponse,
  sendSuccessResponse,
  type ApiResponse
} from '../utils'
import {
  AccountIdSchema,
  AccountQuerySchema,
  BulkAccountDeleteSchema,
  BulkAccountUpdateSchema,
  BulkCreateAccountSchema,
  CreateAccountSchema
} from '../validations/zod/account.schema'

// Initialize service
const accountsService = new AccountsService()

// ================================
// CRUD OPERATIONS
// ================================

/**
 * Create a new account
 */
export const createAccount = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const validatedData = CreateAccountSchema.parse(req.body)

    // Check if account with same credentials already exists (for specific platforms)
    if (validatedData.credentials.email || validatedData.credentials.phone) {
      const existingAccount = await db.account.findFirst({
        where: {
          platform: validatedData.platform,
          OR: [
            validatedData.credentials.email
              ? { meta: { path: ['email'], equals: validatedData.credentials.email } }
              : {},
            validatedData.credentials.phone
              ? { meta: { path: ['phone'], equals: validatedData.credentials.phone } }
              : {}
          ].filter((condition) => Object.keys(condition).length > 0)
        }
      })

      if (existingAccount) {
        return sendConflictResponse(
          res,
          `Account with these credentials already exists for ${validatedData.platform}`
        )
      }
    }

    const account = await accountsService.create(validatedData)

    return sendCreatedResponse(res, account, 'Account created successfully')
  } catch (error) {
    return next(error)
  }
}
export const createMultipleAccounts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const validatedData = BulkCreateAccountSchema.parse(req.body)

    const allNewEmails = validatedData.accounts
      .map((acc) => acc.credentials.email)
      .filter((email) => email)
    const allNewPhones = validatedData.accounts
      .map((acc) => acc.credentials.phone)
      .filter((phone) => phone)

    // Check if account with same credentials already exists (for specific platforms)
    if (allNewEmails.length > 0 || allNewPhones.length > 0) {
      const orConditions: any[] = []

      allNewEmails.forEach((email) => {
        orConditions.push({ meta: { path: ['email'], equals: email } })
      })

      allNewPhones.forEach((phone) => {
        orConditions.push({ meta: { path: ['phone'], equals: phone } })
      })

      const existingAccount = await db.account.findFirst({
        where: {
          OR: orConditions
        }
      })

      if (existingAccount) {
        return sendConflictResponse(
          res,
          `Account with these credentials already exists for ${validatedData.platform}`
        )
      }
    }

    const account = await accountsService.createMultiple(validatedData)

    return sendCreatedResponse(res, account, 'Accounts created successfully')
  } catch (error) {
    return next(error)
  }
}

/**
 * Get an account by ID
 */
export const getAccount = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = AccountIdSchema.parse(req.params)
    const { includeCredentials } = req.query

    const account = await accountsService.findById(id, includeCredentials === 'true')

    return sendSuccessResponse(res, account, 'Account retrieved successfully')
  } catch (error) {
    return next(error)
  }
}

/**
 * Get all accounts with pagination and filters
 */
export const getAccounts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const validatedQuery = AccountQuerySchema.parse(req.query)

    const {
      page = 1,
      limit = 10,
      productId,
      platform,
      isUsed,
      isValid,
      requiresOtp,
      hasPremium,
      archived,
      sortBy,
      sortOrder
    } = validatedQuery

    const skip = (page - 1) * limit

    // Build where conditions
    const where: any = {}

    if (productId) {
      where.productId = productId
    }

    if (platform) {
      where.platform = platform
    } else {
      where.platform = { not: 'TELEGRAM' } // Exclude TELEGRAM accounts by default
    }

    if (isUsed !== undefined) {
      where.isUsed = isUsed
    }

    if (isValid !== undefined) {
      where.isValid = isValid
    }

    if (requiresOtp !== undefined) {
      where.requiresOtp = requiresOtp
    }

    if (hasPremium !== undefined) {
      where.hasPremium = hasPremium
    }

    // Filter archived accounts - by default exclude them
    if (archived !== undefined) {
      where.archived = archived
    } else {
      where.archived = false
    }

    // Get accounts with pagination
    const [accounts, total] = await Promise.all([
      db.account.findMany({
        where,
        skip,
        take: limit,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true
            }
          },
          usedByOrder: {
            select: {
              id: true,
              orderNumber: true,
              createdAt: true
            }
          }
        },
        orderBy: { [sortBy]: sortOrder }
      }),
      db.account.count({ where })
    ])

    // Format response
    const formattedAccounts = accounts.map((account: any) => {
      const response: any = {
        id: account.id,
        productId: account.productId,
        productName: account.product?.name,
        productSku: account.product?.sku,
        platform: account.platform,
        isUsed: account.isUsed,
        isValid: account.isValid,
        requiresOtp: account.requiresOtp,
        hasPremium: account.hasPremium,
        archived: account.archived || false,
        usedAt: account.usedAt,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
        meta: account.meta
      }

      if (account.usedByOrder) {
        response.usedByOrder = {
          id: account.usedByOrder.id,
          orderNumber: account.usedByOrder.orderNumber,
          createdAt: account.usedByOrder.createdAt
        }
      }

      // Note: credentials are not included in list view for security
      // Use the individual getAccount endpoint with includeCredentials to decrypt

      return response
    })

    const result = {
      accounts: formattedAccounts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    }

    return sendSuccessResponse(res, result, 'Accounts retrieved successfully')
  } catch (error) {
    return next(error)
  }
}

/**
 * Get accounts for specific product
 */
export const getAccountsByProduct = async (
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
    const accounts = await accountsService.findByProduct(parsedProductId, includeUsed === 'true')

    return sendSuccessResponse(res, accounts, 'Accounts retrieved successfully')
  } catch (error) {
    return next(error)
  }
}

/**
 * Update an account
 */
export const updateAccount = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = AccountIdSchema.parse(req.params)
    const updateData = req.body

    const account = await accountsService.update(id, updateData)

    return sendSuccessResponse(res, account, 'Account updated successfully')
  } catch (error) {
    return next(error)
  }
}

/**
 * Delete an account
 */
export const deleteAccount = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = AccountIdSchema.parse(req.params)
    const result = await accountsService.delete(id)

    return sendSuccessResponse(res, result, 'Account deleted successfully')
  } catch (error) {
    return next(error)
  }
}

// ================================
// ACCOUNT MANAGEMENT
// ================================

/**
 * Mark account as used
 */
export const markAccountAsUsed = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = AccountIdSchema.parse(req.params)
    const { orderId } = req.body

    const result = await accountsService.markAsUsed(id, orderId)

    return sendSuccessResponse(res, result, 'Account marked as used successfully')
  } catch (error) {
    return next(error)
  }
}

/**
 * Validate/Invalidate an account
 */
export const validateAccount = async (
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

    const result = await accountsService.validateAccount(id, isValid)

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
 * Bulk import accounts
 */
export const bulkImportAccounts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { accounts } = req.body

    if (!Array.isArray(accounts) || accounts.length === 0) {
      return next(new Error('Accounts array is required'))
    }

    const result = await accountsService.bulkImport(accounts)

    return sendCreatedResponse(res, result, 'Accounts imported successfully')
  } catch (error) {
    return next(error)
  }
}

/**
 * Bulk update accounts
 */
export const bulkUpdateAccounts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const validatedData = BulkAccountUpdateSchema.parse(req.body)
    const { ids, updates } = validatedData

    const result = await db.account.updateMany({
      where: { id: { in: ids } },
      data: updates
    })

    // Update stock counts for affected products
    const products = await db.account.findMany({
      where: { id: { in: ids } },
      select: { productId: true },
      distinct: ['productId']
    })

    for (const product of products) {
      await accountsService['updateProductStockCount'](product.productId)
    }

    return sendSuccessResponse(
      res,
      { updatedCount: result.count },
      `Updated ${result.count} accounts successfully`
    )
  } catch (error) {
    return next(error)
  }
}

/**
 * Bulk validate/invalidate accounts
 */
export const bulkValidateAccounts = async (
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

    const result = await accountsService.validateBulk(accountIds, isValid)

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
 * Bulk delete accounts
 */
export const bulkDeleteAccounts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const validatedData = BulkAccountDeleteSchema.parse(req.body)
    const { ids } = validatedData

    // Check if any accounts are used
    const usedAccounts = await db.account.count({
      where: {
        id: { in: ids },
        isUsed: true
      }
    })

    if (usedAccounts > 0) {
      return next(
        new Error(
          `Cannot delete ${usedAccounts} used accounts. Consider marking them as invalid instead.`
        )
      )
    }

    // Get product IDs before deletion
    const products = await db.account.findMany({
      where: { id: { in: ids } },
      select: { productId: true },
      distinct: ['productId']
    })

    // Delete accounts
    const result = await db.account.deleteMany({
      where: { id: { in: ids } }
    })

    // Update stock counts for affected products
    for (const product of products) {
      await accountsService['updateProductStockCount'](product.productId)
    }

    return sendSuccessResponse(
      res,
      { deletedCount: result.count },
      `Deleted ${result.count} accounts successfully`
    )
  } catch (error) {
    return next(error)
  }
}

// ================================
// ASSIGNMENT & DELIVERY
// ================================

/**
 * Assign accounts to order
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

    const accounts = await accountsService.assignAccountToOrder(productId, quantity)

    return sendSuccessResponse(res, accounts, 'Accounts assigned to order successfully')
  } catch (error) {
    return next(error)
  }
}

/**
 * Get account credentials
 */
export const getAccountCredentials = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = AccountIdSchema.parse(req.params)
    const { orderId } = req.query

    const credentials = await accountsService.getAccountCredentials(
      id,
      orderId ? parseInt(orderId as string, 10) : undefined
    )

    return sendSuccessResponse(res, credentials, 'Account credentials retrieved successfully')
  } catch (error) {
    return next(error)
  }
}

// ================================
// STATISTICS & ANALYTICS
// ================================

/**
 * Get account statistics
 */
export const getAccountStats = async (
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

    const stats = await accountsService.getStats(parsedProductId)

    return sendSuccessResponse(res, stats, 'Account statistics retrieved successfully')
  } catch (error) {
    return next(error)
  }
}

/**
 * Get bulk statistics for multiple products
 */
export const getBulkAccountStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { productIds } = req.body

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return next(new Error('Product IDs array is required'))
    }

    const validProductIds = productIds.filter((id: any) => typeof id === 'number' && id > 0)
    if (validProductIds.length === 0) {
      return next(new Error('Valid product IDs are required'))
    }

    const stats = await accountsService.getBulkStats(validProductIds)

    return sendSuccessResponse(res, stats, 'Bulk statistics retrieved successfully')
  } catch (error) {
    return next(error)
  }
}
/**
 * Create serial/credential accounts in bulk
 * Used for uploading accounts from SerialStock component
 */
export const createSerialAccounts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const validatedData = BulkCreateAccountSchema.parse(req.body)

    const result = await accountsService.createMultiple(validatedData)

    return sendCreatedResponse(
      res,
      {
        count: result.count,
        message: `${result.count} accounts created successfully`
      },
      `Successfully created ${result.count} accounts`
    )
  } catch (error) {
    return next(error)
  }
}