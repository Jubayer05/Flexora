import type { Prisma } from '@prisma/client'
import db from '../configs/db'
import { decrypt, encrypt } from '../utils/encryption'
import type { BulkCreateAccount, CreateAccount, UpdateAccount } from '../validations'
import { CacheInvalidationService } from './cache-invalidation.service'
import { OrderService } from './order.services'

export class AccountsService {
  private cacheInvalidationService = new CacheInvalidationService()
  private orderService = new OrderService()

  private buildAccountMeta(
    data: Partial<{
      meta: Record<string, any> | null | undefined
      credentials: Record<string, any> | null | undefined
    }>
  ) {
    return {
      ...(typeof data.meta === 'object' && data.meta ? data.meta : {}),
      email: data.credentials?.email || undefined,
      phone: data.credentials?.phone || undefined,
      username: data.credentials?.username || undefined
    }
  }
  // ================================
  // ACCOUNT MANAGEMENT
  // ================================

  async create(data: CreateAccount) {
    // Encrypt the credentials
    const encryptedCredentials = encrypt(JSON.stringify(data.credentials))

    // Create the account in database
    const account = await db.account.create({
      data: {
        platform: data.platform,
        encryptedData: encryptedCredentials,
        productId: data.productId,
        isValid: data.isValid,
        requiresOtp: data.requiresOtp,
        hasPremium: data.hasPremium,
        meta: this.buildAccountMeta(data)
      }
    })

    // Update product stock count
    await this.updateProductStockCount(data.productId)
    // Invalidate related caches
    await this.cacheInvalidationService.invalidateProduct(data.productId)

    // Process any pending orders for this product (backorder fulfillment)
    await this.orderService.processPendingOrdersForProduct(data.productId)

    return account
  }

  async createMultiple(data: BulkCreateAccount) {
    const accountsToCreate: Prisma.AccountUncheckedCreateInput[] = []

    for (const accountData of data.accounts) {
      // Encrypt the credentials
      const encryptedCredentials = encrypt(JSON.stringify(accountData.credentials))
      accountsToCreate.push({
        platform: data.platform,
        encryptedData: encryptedCredentials,
        productId: data.productId,
        isValid: accountData.isValid,
        requiresOtp: accountData.requiresOtp,
        hasPremium: accountData.hasPremium,
        meta: this.buildAccountMeta({
          meta: accountData.meta as Record<string, any> | undefined,
          credentials: accountData.credentials as Record<string, any>
        })
      })
    }

    // Create the account in database
    const account = await db.account.createMany({
      data: accountsToCreate
    })

    // Update product stock count
    await this.updateProductStockCount(data.productId)
    // Invalidate related caches
    await this.cacheInvalidationService.invalidateProduct(data.productId)

    // Process any pending orders for this product (backorder fulfillment)
    await this.orderService.processPendingOrdersForProduct(data.productId)

    return account
  }

  async findById(id: number, includeCredentials = false): Promise<any> {
    const account = await db.account.findUnique({
      where: { id },
      include: {
        product: {
          select: { id: true, name: true, sku: true }
        }
      }
    })

    if (!account) {
      throw new Error('Account not found')
    }

    let credentials: any = undefined

    if (includeCredentials) {
      try {
        const decryptedData = decrypt(account.encryptedData)
        credentials = JSON.parse(decryptedData)
      } catch (error) {
        console.error('Failed to decrypt account credentials:', error)
        throw new Error('Failed to decrypt credentials')
      }
    }

    return {
      id: account.id,
      productId: account.productId,
      productName: account.product?.name,
      productSku: account.product?.sku,
      platform: account.platform,
      isUsed: account.isUsed,
      isValid: account.isValid,
      requiresOtp: account.requiresOtp,
      hasPremium: account.hasPremium,
      meta: account.meta,
      credentials
    }
  }

  async findByProduct(productId: number, includeUsed = false) {
    const accounts = await db.account.findMany({
      where: {
        productId,
        isValid: true,
        archived: false, // Exclude archived accounts
        ...(includeUsed ? {} : { isUsed: false })
      },
      include: {
        product: {
          select: { id: true, name: true, sku: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    return accounts.map((account) => ({
      id: account.id,
      productName: account.product?.name,
      productSku: account.product?.sku,
      platform: account.platform,
      requiresOtp: account.requiresOtp,
      hasPremium: account.hasPremium,
      isUsed: account.isUsed,
      usedAt: account.usedAt || undefined,
      createdAt: account.createdAt,
      credentials: undefined // Never include credentials in list view
    }))
  }

  async update(id: number, data: UpdateAccount) {
    const account = await this.findById(id)
    const oldProductId = account.productId

    let updateData: any = {
      isValid: data.isValid,
      hasPremium: data.hasPremium
    }

    // Handle archived status change
    if (data.archived !== undefined) {
      updateData.archived = data.archived
    }

    // Handle productId change
    if (data.productId !== undefined && data.productId !== oldProductId) {
      // Verify the account is not used before changing product
      if (account.isUsed) {
        throw new Error('Cannot change product ID for a used account')
      }

      // Verify the new product exists
      const newProduct = await db.product.findUnique({
        where: { id: data.productId }
      })

      if (!newProduct) {
        throw new Error(`Product with ID ${data.productId} not found`)
      }

      updateData.productId = data.productId
    }

    // If updating credentials, encrypt them
    const normalizedCredentialUpdates =
      data.credentials ||
      data.phone !== undefined ||
      data.email !== undefined ||
      data.username !== undefined ||
      data.password !== undefined
        ? {
            ...(data.credentials || {}),
            ...(data.phone !== undefined ? { phone: data.phone } : {}),
            ...(data.email !== undefined ? { email: data.email || undefined } : {}),
            ...(data.username !== undefined ? { username: data.username } : {}),
            ...(data.password !== undefined ? { password: data.password } : {})
          }
        : null

    if (normalizedCredentialUpdates) {
      let currentCredentials: any = {}

      try {
        // Get the actual account from database to access encryptedData
        const dbAccount = await db.account.findUnique({ where: { id } })
        if (dbAccount?.encryptedData) {
          const decryptedData = decrypt(dbAccount.encryptedData)
          currentCredentials = JSON.parse(decryptedData)
        }
      } catch {
        // Use empty credentials as fallback
      }

      const newCredentials = {
        ...currentCredentials,
        ...normalizedCredentialUpdates
      }

      updateData.encryptedData = encrypt(JSON.stringify(newCredentials))
    }

    // Update meta
    if (data.meta) {
      updateData.meta = {
        ...this.buildAccountMeta({
          meta: (account.meta as Record<string, any> | undefined) || {},
          credentials: normalizedCredentialUpdates || undefined
        }),
        ...data.meta
      }
    } else if (normalizedCredentialUpdates) {
      updateData.meta = this.buildAccountMeta({
        meta: (account.meta as Record<string, any> | undefined) || {},
        credentials: normalizedCredentialUpdates
      })
    }

    const updatedAccount = await db.account.update({
      where: { id },
      data: updateData
    })

    // If productId changed, update stock counts for both products
    if (data.productId !== undefined && data.productId !== oldProductId) {
      await Promise.all([
        this.updateProductStockCount(oldProductId), // Decrease old product stock
        this.updateProductStockCount(data.productId) // Increase new product stock
      ])
    } else if (data.archived !== undefined) {
      // If archived status changed, update stock count for current product
      await this.updateProductStockCount(account.productId)
    }

    return updatedAccount
  }

  async markAsUsed(id: number, orderId?: number) {
    const updateData: any = {
      isUsed: true,
      usedAt: new Date()
    }

    if (orderId) {
      updateData.usedByOrderId = orderId
    }

    const account = await db.account.update({
      where: { id },
      data: updateData
    })

    // Update product stock count
    await this.updateProductStockCount(account.productId)

    return account
  }

  async validateAccount(id: number, isValid: boolean) {
    const account = await db.account.update({
      where: { id },
      data: {
        isValid
      }
    })

    // Update product stock count
    await this.updateProductStockCount(account.productId)

    return account
  }

  async delete(id: number) {
    const account = await db.account.findUnique({
      where: { id },
      select: { id: true, productId: true, isUsed: true, meta: true }
    })

    if (!account) {
      throw new Error('Account not found')
    }

    if (account.isUsed) {
      throw new Error('Cannot delete used account. Consider marking as invalid instead.')
    }

    await db.account.delete({
      where: { id }
    })

    // Update product stock count
    await this.updateProductStockCount(account.productId)

    return { success: true }
  }

  // ================================
  // ACCOUNT ASSIGNMENT
  // ================================

  async assignAccountToOrder(productId: number, quantity: number) {
    // Find available accounts for the product
    const availableAccounts = await db.account.findMany({
      where: {
        productId,
        isUsed: false,
        isValid: true,
        archived: false // Exclude archived accounts
      },
      take: quantity,
      orderBy: { createdAt: 'asc' } // First in, first out
    })

    if (availableAccounts.length < quantity) {
      throw new Error(`Insufficient stock. Only ${availableAccounts.length} accounts available.`)
    }

    return availableAccounts.map((account) => ({
      id: account.id,
      hasPremium: account.hasPremium,
      meta: account.meta
    }))
  }

  async getAccountCredentials(accountId: number, orderId?: number): Promise<any> {
    const account = await this.findById(accountId, true)

    if (!account.credentials) {
      throw new Error('Account credentials not available')
    }

    // Optional: Log access for audit trail
    if (orderId) {
      console.log(`Account ${accountId} accessed for order ${orderId}`)
    }

    return account.credentials
  }

  // ================================
  // STATISTICS & ANALYTICS
  // ================================

  async getStats(productId?: number): Promise<any> {
    const whereCondition: any = {
      archived: false // Exclude archived accounts from stats
    }

    if (productId) {
      whereCondition.productId = productId
    }

    const [totalAccounts, usedAccounts, validAccounts, premiumAccounts] = await Promise.all([
      db.account.count({ where: whereCondition }),
      db.account.count({ where: { ...whereCondition, isUsed: true } }),
      db.account.count({ where: { ...whereCondition, isValid: true } }),
      db.account.count({ where: { ...whereCondition, hasPremium: true } })
    ])

    const available = totalAccounts - usedAccounts

    return {
      total: totalAccounts,
      available,
      used: usedAccounts,
      invalid: totalAccounts - validAccounts,
      premium: premiumAccounts,
      usageRate: totalAccounts > 0 ? (usedAccounts / totalAccounts) * 100 : 0
    }
  }

  async getBulkStats(productIds: number[]) {
    const stats = await db.account.groupBy({
      by: ['productId'],
      where: {
        productId: { in: productIds },
        archived: false // Exclude archived accounts
      },
      _count: {
        _all: true
      }
    })

    const result: Record<number, { total: number; available: number }> = {}

    for (const productId of productIds) {
      const stat = stats.find((s) => s.productId === productId)
      const total = stat?._count._all || 0

      // Get available count separately
      const available = await db.account.count({
        where: {
          productId,
          isUsed: false,
          isValid: true,
          archived: false // Exclude archived accounts
        }
      })

      result[productId] = { total, available }
    }

    return result
  }

  // ================================
  // UTILITY METHODS
  // ================================

  private async updateProductStockCount(productId: number) {
    const stockCount = await db.account.count({
      where: {
        productId,
        isUsed: false,
        isValid: true,
        archived: false // Exclude archived accounts from stock count
      }
    })

    await db.product.update({
      where: { id: productId },
      data: { stockCount }
    })
  }

  async bulkImport(accounts: CreateAccount[]) {
    const results = {
      created: 0,
      errors: [] as string[]
    }

    const affectedProductIds = new Set<number>()

    for (const accountData of accounts) {
      try {
        await this.create(accountData)
        results.created++
        affectedProductIds.add(accountData.productId)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        results.errors.push(
          `Failed to import account ${accountData.credentials.phone}: ${errorMessage}`
        )
      }
    }

    // Process pending orders for all affected products (backorder fulfillment)
    for (const productId of affectedProductIds) {
      try {
        await this.orderService.processPendingOrdersForProduct(productId)
      } catch (error) {
        console.error('Failed to process pending orders for product', {
          productId,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return results
  }

  async validateBulk(accountIds: number[], isValid: boolean) {
    const result = await db.account.updateMany({
      where: {
        id: { in: accountIds }
      },
      data: {
        isValid
      }
    })

    // Update stock counts for affected products
    const products = await db.account.findMany({
      where: { id: { in: accountIds } },
      select: { productId: true },
      distinct: ['productId']
    })

    for (const product of products) {
      await this.updateProductStockCount(product.productId)
    }

    return {
      success: true,
      updatedCount: result.count,
      message: `Updated ${result.count} accounts`
    }
  }
}
