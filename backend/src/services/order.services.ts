import { PlatformType } from '@prisma/client'
import db from '../configs/db'
import { sendEmail } from '../libs/email'
import {
  wrapOrderEmailHtml,
  sectionGreeting,
  sectionHeading,
  keyValueTable,
  infoBox,
  bulletList,
  paragraph,
  signOff,
  rawHtml,
  escapeHtml,
  ctaButton,
  statusBadge,
  FRONTEND_URL
} from '../libs/order-email-templates'
import { excludeKeys } from '../utils/data-type'
import { decrypt } from '../utils/encryption'
import { BalanceService } from './balance.service'
import { cacheService } from './cache.service'
import { deliveryTemplateService } from './delivery-template.service'
import { TelegramAccountService } from './telegram-account.service'
import { TelegramTransferService } from './telegram-transfer.service'
import { auditLogService } from './audit-log.service'
import { isTelegramTransferProduct } from '../utils/product-type'

const ORDER_NUMBER_PREFIX = 'ORD'
const ORDER_NUMBER_RETRY_LIMIT = 5

const formatOrderNumber = (year: number, sequence: number) =>
  `${ORDER_NUMBER_PREFIX}-${year}-${sequence.toString().padStart(6, '0')}`

const getNextOrderSequence = async (year: number) => {
  const latestOrder = await db.order.findFirst({
    where: { orderNumber: { startsWith: `${ORDER_NUMBER_PREFIX}-${year}-` } },
    orderBy: { orderNumber: 'desc' },
    select: { orderNumber: true }
  })
  if (!latestOrder?.orderNumber) return 1
  const parsed = Number.parseInt(latestOrder.orderNumber.split('-').at(-1) || '', 10)
  return Number.isFinite(parsed) ? parsed + 1 : 1
}

const isOrderNumberConflict = (error: unknown) => {
  const { PrismaClientKnownRequestError } = require('@prisma/client/runtime/library')
  if (!(error instanceof PrismaClientKnownRequestError) || (error as any).code !== 'P2002') return false
  const targets = Array.isArray((error as any).meta?.target)
    ? (error as any).meta.target.map((t: unknown) => String(t))
    : [String((error as any).meta?.target || '')]
  return targets.some((t: string) => t.includes('orderNumber'))
}

export class OrderService {
  private telegramAccountService = new TelegramAccountService()
  private telegramTransferService = new TelegramTransferService()
  private balanceService = new BalanceService()

  private normalizeAssignedTransferTargets(items: unknown) {
    if (!Array.isArray(items)) return []

    const seen = new Set<string>()

    return items
      .filter((item): item is Record<string, any> => Boolean(item) && typeof item === 'object')
      .map((item) => ({
        id: item.id,
        name: typeof item.name === 'string' ? item.name : undefined,
        username: typeof item.username === 'string' ? item.username : undefined,
        type: item.type === 'channel' ? 'channel' : 'group',
        members: typeof item.members === 'number' ? item.members : undefined,
        isPublic: typeof item.isPublic === 'boolean' ? item.isPublic : undefined,
        description: typeof item.description === 'string' ? item.description : undefined,
        url: typeof item.url === 'string' ? item.url.trim() : '',
        accountId: item.accountId
      }))
      .filter((item) => item.url.length > 0)
      .filter((item) => {
        const key = item.url.toLowerCase()
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
  }

  private async allocateTransferTargets(
    productId: number,
    productMeta: Record<string, any>,
    requestedQuantity: number
  ) {
    const assignedTargets = this.normalizeAssignedTransferTargets(productMeta.assignedGroupsChannels)
    const soldTargets = this.normalizeAssignedTransferTargets(productMeta.soldGroupsChannels)

    if (assignedTargets.length === 0) {
      return {
        primaryTarget: null as (typeof assignedTargets)[number] | null,
        allocatedTargets: [] as typeof assignedTargets
      }
    }

    const quantityToAllocate = Math.max(1, Math.min(requestedQuantity, assignedTargets.length))
    const allocatedTargets = assignedTargets.slice(0, quantityToAllocate)
    const remainingTargets = assignedTargets.slice(quantityToAllocate)

    await db.product.update({
      where: { id: productId },
      data: {
        stockCount: remainingTargets.length,
        soldCount: { increment: allocatedTargets.length },
        meta: {
          ...productMeta,
          assignedGroupsChannels: remainingTargets,
          soldGroupsChannels: this.normalizeAssignedTransferTargets([...soldTargets, ...allocatedTargets])
        }
      }
    })

    return {
      primaryTarget: allocatedTargets[0] || null,
      allocatedTargets
    }
  }

  /**
   * Create an order with a unique sequential order number (ORD-YYYY-NNNNNN).
   * Used by both the main order controller and the legacy guest-checkout controller
   * so ALL orders follow the same numbering and pipeline.
   */
  async createWithUniqueNumber(
    data: Omit<import('@prisma/client').Prisma.OrderUncheckedCreateInput, 'orderNumber'>,
    include?: import('@prisma/client').Prisma.OrderInclude
  ) {
    const year = new Date().getFullYear()
    let sequence = await getNextOrderSequence(year)

    for (let attempt = 0; attempt < ORDER_NUMBER_RETRY_LIMIT; attempt++) {
      try {
        return await db.order.create({
          data: { ...data, orderNumber: formatOrderNumber(year, sequence) },
          ...(include ? { include } : {})
        })
      } catch (error) {
        if (!isOrderNumberConflict(error) || attempt === ORDER_NUMBER_RETRY_LIMIT - 1) throw error
        sequence = await getNextOrderSequence(year)
      }
    }

    throw new Error('Failed to generate a unique order number')
  }

  private normalizeFilePaths(filePath: unknown): string[] {
    if (Array.isArray(filePath)) {
      return filePath
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
    }

    if (typeof filePath === 'string') {
      const normalized = filePath.trim()
      return normalized ? [normalized] : []
    }

    return []
  }

  private getProductFileMeta(meta: unknown) {
    const safeMeta =
      meta && typeof meta === 'object' && !Array.isArray(meta)
        ? { ...(meta as Record<string, any>) }
        : {}

    const filePaths = this.normalizeFilePaths(safeMeta.filePath)
    const licenseType = safeMeta.licenseType === 'ONE_TIME' ? 'ONE_TIME' : 'ULTIMATE'

    return {
      meta: safeMeta,
      filePaths,
      licenseType
    }
  }

  private buildDeliveredFileEntries(filePaths: string[]) {
    return filePaths.map((fileUrl, index) => {
      const cleanUrl = fileUrl.split('?')[0] || fileUrl
      const fileName = cleanUrl.split('/').pop() || `file-${index + 1}`

      return {
        fileUrl,
        fileName,
        fileType: 'FILE'
      }
    })
  }

  private async deliverFileProduct(
    orderId: number,
    productId: number,
    quantity: number
  ): Promise<{ delivered: any[]; requested: number; fulfilledQuantity: number }> {
    const product = await db.product.findUnique({
      where: { id: productId },
      select: { id: true, meta: true, stockCount: true }
    })

    if (!product) {
      throw new Error('File product not found')
    }

    const { meta, filePaths, licenseType } = this.getProductFileMeta(product.meta)

    if (filePaths.length === 0) {
      throw new Error('No files are available for this product')
    }

    if (licenseType === 'ULTIMATE') {
      await db.product.update({
        where: { id: productId },
        data: {
          stockCount: filePaths.length,
          soldCount: { increment: quantity }
        }
      })

      return {
        delivered: this.buildDeliveredFileEntries(filePaths),
        requested: quantity,
        fulfilledQuantity: quantity
      }
    }

    const quantityToDeliver = Math.min(quantity, filePaths.length)
    const deliveredFiles = filePaths.slice(0, quantityToDeliver)
    const remainingFiles = filePaths.slice(quantityToDeliver)

    await db.product.update({
      where: { id: productId },
      data: {
        stockCount: remainingFiles.length,
        soldCount: { increment: quantityToDeliver },
        meta: {
          ...meta,
          licenseType,
          filePath: remainingFiles.length > 0 ? remainingFiles : undefined
        }
      }
    })

    return {
      delivered: this.buildDeliveredFileEntries(deliveredFiles),
      requested: quantity,
      fulfilledQuantity: quantityToDeliver
    }
  }

  // ================================
  // CORE ORDER OPERATIONS
  // ================================

  async findById(id: number) {
    const order = await db.order.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            platform: true,
            type: true
          }
        },
        user: {
          select: { id: true, email: true, firstName: true }
        }
      }
    })

    if (!order) {
      throw new Error('Order not found')
    }

    return order
  }

  async findByOrderNumber(orderNumber: string) {
    const order = await db.order.findUnique({
      where: { orderNumber },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            platform: true,
            type: true
          }
        },
        user: {
          select: { id: true, email: true, firstName: true }
        }
      }
    })

    if (!order) {
      throw new Error('Order not found')
    }

    return order
  }

  /**
   * Delete an order by ID (admin only).
   * Unlinks accounts that reference this order, then deletes the order.
   * Prisma cascades: Payment, Delivery, TelegramTransfer, CouponUsage, GuestOrderAccess.
   */
  async deleteOrder(orderId: number) {
    const order = await this.findById(orderId)

    // Unlink any accounts that were assigned to this order (Account.usedByOrderId has no onDelete cascade)
    await db.account.updateMany({
      where: { usedByOrderId: orderId },
      data: { usedByOrderId: null, usedAt: null }
    })

    await db.order.delete({
      where: { id: orderId }
    })

    return {
      deleted: true,
      orderId,
      orderNumber: order.orderNumber
    }
  }

  // ================================
  // ACCOUNT DELIVERY SYSTEM
  // ================================

  /**
   * Deliver accounts for completed orders (all platforms)
   * This handles instant delivery for non-OTP platforms and preparation for OTP platforms
   * Also creates transfer records for Telegram transfer products
   * Supports partial delivery (backorders) when stock is insufficient
   */
  async deliverOrderAccounts(orderId: number, isBackorderFulfillment: boolean = false) {
    const order = await this.findById(orderId)

    if (order.status !== 'COMPLETED' && order.status !== 'PARTIAL') {
      throw new Error('Order must be completed before delivery')
    }

    const deliveryResults = {
      instant: [] as any[],
      transfers: [] as any[], // Telegram transfer products
      errors: [] as string[]
    }

    // Extract customerTelegram from order meta if present
    const orderMeta = order.meta as any
    const customerTelegram = orderMeta?.customerTelegram

    // Calculate quantity to deliver
    const quantityToDeliver = isBackorderFulfillment
      ? order.quantityPending // For backorder fulfillment, deliver pending quantity
      : order.quantity // For initial delivery, attempt to deliver full quantity

    try {
      // Get full product details to check type
      const product = order.product

      if (!product) {
        throw new Error(`Product not found: ${order.productId}`)
      }

      // File products are delivered from uploaded file inventory instead of account stock.
      if (product.type === 'FILE') {
        const { delivered, requested, fulfilledQuantity } = await this.deliverFileProduct(
          order.id,
          order.productId,
          quantityToDeliver
        )

        if (delivered.length > 0) {
          deliveryResults.instant.push({
            orderId: order.id,
            productName: product.name,
            platform: product.platform,
            accounts: delivered,
            requestedQty: requested,
            deliveredQty: fulfilledQuantity
          })
        }
      } else if (isTelegramTransferProduct(product)) {
        // Create transfer record
        if (!customerTelegram) {
          throw new Error(
            `Customer Telegram information is required for transfer product ${product.name}`
          )
        }

        // Get full product details for telegramUrl
        const fullProduct = await db.product.findUnique({
          where: { id: product.id },
          select: { telegramUrl: true, meta: true }
        })

        if (!fullProduct) {
          throw new Error(`Product ${product.name} was not found for transfer delivery`)
        }

        const productMeta = (fullProduct.meta as Record<string, any> | null) || {}
        const transferType = productMeta?.transferType || 'group'
        const { primaryTarget, allocatedTargets } = await this.allocateTransferTargets(
          product.id,
          productMeta,
          quantityToDeliver
        )

        const resolvedTargetUrl = primaryTarget?.url || fullProduct.telegramUrl

        if (!resolvedTargetUrl) {
          throw new Error(`Product ${product.name} does not have a Telegram URL`)
        }

        const transfer = await this.telegramTransferService.createTransfer({
          orderId: order.id,
          targetUrl: resolvedTargetUrl,
          transferType,
          customerTelegram,
          meta: {
            orderNumber: order.orderNumber,
            productName: product.name,
            allocatedTargets,
            allocatedTargetCount: allocatedTargets.length,
            allocatedFromAssignedPool: allocatedTargets.length > 0
          }
        })

        // Update status to VERIFICATION_REQUIRED and notify customer via email
        await this.telegramTransferService.updateStatusWithNotification(
          transfer.id,
          'VERIFICATION_REQUIRED',
          {
            adminNotes: 'Transfer created from order, awaiting customer verification'
          }
        )

        deliveryResults.transfers.push({
          orderId: order.id,
          productName: product.name,
          transferId: transfer.id,
          targetUrl: resolvedTargetUrl,
          status: 'VERIFICATION_REQUIRED'
        })
      } else if (product.platform === 'TELEGRAM') {
        // Handle Telegram accounts (deliver available stock)
        const { delivered, requested } = await this.deliverTelegramAccountsWithBackorder(
          order.id,
          order.productId,
          quantityToDeliver
        )

        if (delivered.length > 0) {
          deliveryResults.instant.push({
            orderId: order.id,
            productName: product.name,
            platform: 'TELEGRAM',
            accounts: delivered,
            requestedQty: requested,
            deliveredQty: delivered.length
          })

          // Auto-link premium orders in the same cart group
          await this.autoLinkPremiumOrders(order, delivered)

          // For backorder fulfillment, send separate email
          if (isBackorderFulfillment) {
            const userEmail = order.user?.email || order.guestEmail
            if (userEmail) {
              await this.sendBackorderDeliveryEmail(order, delivered, userEmail)
            }
          }
          // For initial delivery, the comprehensive notification will handle it
        }
      } else {
        // Handle other platforms (instant delivery with backorder support)
        if (!product.platform) {
          throw new Error(`Product ${product.name} has no platform specified`)
        }

        const { delivered, requested } = await this.deliverInstantAccountsWithBackorder(
          order.id,
          order.productId,
          quantityToDeliver,
          product.platform
        )

        if (delivered.length > 0) {
          deliveryResults.instant.push({
            orderId: order.id,
            productName: product.name,
            platform: product.platform,
            accounts: delivered,
            requestedQty: requested,
            deliveredQty: delivered.length
          })

          // For backorder fulfillment, send separate email
          if (isBackorderFulfillment) {
            const userEmail = order.user?.email || order.guestEmail
            if (userEmail) {
              await this.sendBackorderDeliveryEmail(order, delivered, userEmail)
            }
          }
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      deliveryResults.errors.push(`Failed to deliver ${order.product.name}: ${errorMsg}`)
    }

    // Calculate total delivered accounts
    const totalDelivered = deliveryResults.instant.reduce(
      (sum, item) => sum + (item.deliveredQty || 0),
      0
    )

    // Update order delivery status and backorder tracking
    const hasErrors = deliveryResults.errors.length > 0
    const hasTransfers = deliveryResults.transfers.length > 0

    // Ensure quantityOrdered is set (backward compatibility for old orders)
    const quantityOrdered = order.quantityOrdered || order.quantity
    const currentDelivered = order.quantityDelivered || 0

    const newQuantityDelivered = currentDelivered + totalDelivered
    const newQuantityPending = quantityOrdered - newQuantityDelivered

    let deliveryStatus: 'PENDING' | 'PROCESSING' | 'DELIVERED' | 'PARTIAL' = 'DELIVERED'
    if (hasTransfers)
      deliveryStatus = 'PROCESSING' // Waiting for OTP verification or transfer
    else if (newQuantityPending > 0)
      deliveryStatus = 'PARTIAL' // Partial delivery, backorder pending
    else if (
      hasErrors &&
      deliveryResults.instant.length === 0 &&
      deliveryResults.transfers.length === 0
    ) {
      deliveryStatus = 'PENDING' // All failed
    }

    // Create Delivery record if accounts were delivered
    const hasDeliveredAccounts = deliveryResults.instant.length > 0

    if (hasDeliveredAccounts) {
      // Combine all delivered accounts
      const allDeliveredAccounts = [
        ...deliveryResults.instant.flatMap((item) => item.accounts || [])
      ]

      await db.delivery.create({
        data: {
          orderId,
          status:
            deliveryStatus === 'DELIVERED'
              ? 'DELIVERED'
              : deliveryStatus === 'PARTIAL'
                ? 'PARTIAL'
                : 'PROCESSING',
          accounts: allDeliveredAccounts,
          format: 'json',
          deliveredAt: totalDelivered > 0 ? new Date() : null
        }
      })
    }

    await db.order.update({
      where: { id: orderId },
      data: {
        deliveryStatus,
        deliveredAt: deliveryStatus === 'DELIVERED' ? new Date() : null,
        quantityOrdered: quantityOrdered, // Use the calculated value
        quantityDelivered: newQuantityDelivered,
        quantityPending: newQuantityPending,
        meta: {
          ...((order.meta as any) || {}),
          deliveryResults,
          ...(isBackorderFulfillment && { lastBackorderFulfillment: new Date() })
        }
      }
    })

    // Log order delivery to audit log
    if (newQuantityDelivered > 0) {
      auditLogService.logOrderDelivery(orderId, newQuantityDelivered).catch(() => {
        // Ignore audit log errors
      });
    }

    // Send email notification to customer about order status (always send, regardless of delivery)
    const userEmail = order.user?.email || order.guestEmail
    if (userEmail && !isBackorderFulfillment) {
      try {
        await this.sendOrderDeliveryNotification(
          order,
          deliveryResults,
          userEmail,
          newQuantityDelivered,
          newQuantityPending,
          deliveryStatus
        )
        console.log('[OrderService] Order notification email sent', {
          orderId,
          email: userEmail,
          deliveredCount: newQuantityDelivered,
          pendingCount: newQuantityPending,
          deliveryStatus
        })
      } catch (emailError) {
        console.error('[OrderService] Failed to send order notification email', {
          orderId,
          error: emailError instanceof Error ? emailError.message : 'Unknown error'
        })
      }
    }

    console.log('[OrderService] Delivery completed', {
      orderId,
      quantityOrdered: order.quantity,
      quantityDelivered: newQuantityDelivered,
      quantityPending: newQuantityPending,
      deliveryStatus,
      isBackorderFulfillment
    })

    return deliveryResults
  }

  /**
   * Deliver Telegram accounts instantly with full credentials after payment
   */
  private async deliverTelegramAccountsInstantly(orderId: number, quantity: number) {
    // Get the order to find product
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { product: true }
    })

    if (!order) {
      throw new Error('Order not found')
    }

    // Assign accounts to the order
    const assignedAccounts = await this.telegramAccountService.assignAccountToOrder(
      order.productId,
      quantity
    )

    // Mark accounts as used and deliver credentials immediately
    const deliveredAccounts = []

    for (const account of assignedAccounts) {
      // Mark as used
      await this.telegramAccountService.markAsUsed(account.id, orderId)

      // Get decrypted credentials
      try {
        const credentials = await this.telegramAccountService.getAccountCredentials(account.id)

        if (credentials) {
          deliveredAccounts.push({
            id: account.id,
            phone: credentials.phone,
            password: credentials.password, // 2FA password if exists
            hasPremium: account.hasPremium,
            platform: 'TELEGRAM',
            isDelivered: true,
            deliveredAt: new Date().toISOString(),
            loginInstructions: {
              steps: [
                '1. Open Telegram app',
                '2. Enter phone number: ' + credentials.phone,
                '3. Go to your dashboard and Request for OTP for your purchased account from Order List. ',
                '4. OTP will be sent to your email, get it and copy it.',
                '4. Enter that OTP verification code',
                ...(credentials.password ? ['5. Enter 2FA password: ' + credentials.password] : [])
              ]
            }
          })
        }
      } catch (error) {
        console.error(`Failed to get credentials for account ${account.id}:`, error)
        // Still add account but mark as delivery failed
        deliveredAccounts.push({
          id: account.id,
          hasPremium: account.hasPremium,
          platform: 'TELEGRAM',
          isDelivered: false,
          error: 'Failed to decrypt credentials'
        })
      }
    }

    return deliveredAccounts
  }

  /**
   * Deliver accounts instantly for non-OTP platforms (Instagram, Twitter, etc.)
   */
  private async deliverInstantAccounts(orderId: number, quantity: number, platform: string) {
    // Validate platform parameter
    if (!platform) {
      throw new Error('Platform parameter is required and cannot be null')
    }

    // First get the order to find the product
    const order = await db.order.findUnique({
      where: { id: orderId },
      select: { productId: true }
    })

    if (!order) {
      throw new Error(`Order ${orderId} not found`)
    }

    // Find available accounts for this product and platform
    const availableAccounts = await db.account.findMany({
      where: {
        productId: order.productId,
        platform: platform as any, // Cast to satisfy enum type
        isUsed: false,
        isValid: true,
        archived: false // Exclude archived accounts
      },
      take: quantity,
      orderBy: { createdAt: 'asc' }
    })

    if (availableAccounts.length < quantity) {
      throw new Error(
        `Insufficient ${platform} accounts. Only ${availableAccounts.length} available.`
      )
    }

    // Mark accounts as used and return decrypted credentials
    const deliveredAccounts = []
    for (const account of availableAccounts) {
      // Mark as used
      await db.account.update({
        where: { id: account.id },
        data: {
          isUsed: true,
          usedAt: new Date(),
          usedByOrderId: orderId
        }
      })

      // For non-Telegram platforms, we might have different credential structures
      // This is a placeholder - you'd implement specific decryption based on platform
      deliveredAccounts.push({
        id: account.id,
        platform: account.platform,
        // Credentials would be decrypted here based on platform type
        credentials: await this.decryptAccountCredentials(account)
      })
    }

    return deliveredAccounts
  }

  /**
   * Deliver Telegram accounts with backorder support
   */
  private async deliverTelegramAccountsWithBackorder(
    orderId: number,
    productId: number,
    quantity: number
  ): Promise<{ delivered: any[]; requested: number }> {
    // Get available stock
    const availableAccounts = await db.account.findMany({
      where: {
        productId,
        platform: 'TELEGRAM',
        isUsed: false,
        isValid: true,
        archived: false
      },
      take: quantity,
      orderBy: { createdAt: 'asc' }
    })

    const quantityToDeliver = availableAccounts.length // Deliver only what's available
    const deliveredAccounts = []

    if (quantityToDeliver > 0) {
      // Assign and deliver available accounts
      for (const account of availableAccounts) {
        // Mark as used
        await this.telegramAccountService.markAsUsed(account.id, orderId)

        // Get decrypted credentials
        try {
          const credentials = await this.telegramAccountService.getAccountCredentials(account.id)

          if (credentials) {
            deliveredAccounts.push({
              id: account.id,
              username: credentials.username,
              email: credentials.email,
              phone: credentials.phone,
              password: credentials.password,
              sessionData: credentials.sessionData,
              backupCodes: credentials.backupCodes || [],
              note: (credentials as any).note,
              hasPremium: account.hasPremium,
              platform: 'TELEGRAM',
              credentials,
              isDelivered: true,
              deliveredAt: new Date().toISOString(),
              loginInstructions: {
                steps: [
                  '1. Open Telegram app',
                  '2. Enter phone number: ' + credentials.phone,
                  '3. Request OTP from dashboard',
                  '4. Enter OTP verification code',
                  ...(credentials.password
                    ? ['5. Enter 2FA password: ' + credentials.password]
                    : [])
                ]
              }
            })
          }
        } catch (error) {
          console.error(`Failed to get credentials for account ${account.id}:`, error)
          deliveredAccounts.push({
            id: account.id,
            hasPremium: account.hasPremium,
            platform: 'TELEGRAM',
            isDelivered: false,
            error: 'Failed to decrypt credentials'
          })
        }
      }

      // Update product stock - decrement stockCount and increment soldCount
      await db.product.update({
        where: { id: productId },
        data: {
          stockCount: { decrement: quantityToDeliver },
          soldCount: { increment: quantityToDeliver }
        }
      })
    }

    return {
      delivered: deliveredAccounts,
      requested: quantity
    }
  }

  /**
   * Deliver instant accounts with backorder support (Instagram, Twitter, etc.)
   */
  private async deliverInstantAccountsWithBackorder(
    orderId: number,
    productId: number,
    quantity: number,
    platform: string
  ): Promise<{ delivered: any[]; requested: number }> {
    // Get available stock
    const availableAccounts = await db.account.findMany({
      where: {
        productId,
        platform: platform as any,
        isUsed: false,
        isValid: true,
        archived: false
      },
      take: quantity,
      orderBy: { createdAt: 'asc' }
    })

    const quantityToDeliver = availableAccounts.length // Deliver only what's available
    const deliveredAccounts = []

    if (quantityToDeliver > 0) {
      for (const account of availableAccounts) {
        // Mark as used
        await db.account.update({
          where: { id: account.id },
          data: {
            isUsed: true,
            usedAt: new Date(),
            usedByOrderId: orderId
          }
        })

        // Decrypt and deliver credentials
        deliveredAccounts.push({
          id: account.id,
          platform: account.platform,
          credentials: await this.decryptAccountCredentials(account)
        })
      }

      // Update product stock - decrement stockCount and increment soldCount
      await db.product.update({
        where: { id: productId },
        data: {
          stockCount: { decrement: quantityToDeliver },
          soldCount: { increment: quantityToDeliver }
        }
      })
    }

    return {
      delivered: deliveredAccounts,
      requested: quantity
    }
  }

  // ================================
  // TELEGRAM OTP SYSTEM
  // ================================

  /**
   * Generate OTP for Telegram account access
   */
  async generateAccountOTP(
    accountId: number,
    userId?: number,
    guestEmail?: string
  ): Promise<string> {
    // Verify account belongs to user's order
    const account = await db.account.findFirst({
      where: {
        id: accountId,
        isUsed: true, // Must be assigned to an order
        product: {
          orders: {
            some: {
              OR: [{ userId: userId || undefined }, { guestEmail: guestEmail || undefined }]
            }
          }
        }
      }
    })

    if (!account) {
      throw new Error('Account not found or access denied')
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()

    // Store OTP in Redis with 10-minute expiration
    const otpKey = `telegram_otp:${accountId}:${userId || guestEmail}`
    await cacheService.set(otpKey, otp, 600) // 10 minutes

    // Also store attempt count to prevent brute force
    const attemptKey = `otp_attempts:${accountId}:${userId || guestEmail}`
    await cacheService.set(attemptKey, '0', 3600) // 1 hour

    return otp
  }

  /**
   * Verify OTP and deliver Telegram account credentials
   */
  async verifyAccountOTP(
    accountId: number,
    otp: string,
    userId?: number,
    guestEmail?: string
  ): Promise<{
    success: boolean
    credentials?: any
    message: string
  }> {
    const userIdentifier = userId || guestEmail
    const otpKey = `telegram_otp:${accountId}:${userIdentifier}`
    const attemptKey = `otp_attempts:${accountId}:${userIdentifier}`

    // Check attempt count
    const attempts = parseInt((await cacheService.get(attemptKey)) || '0')
    if (attempts >= 5) {
      return {
        success: false,
        message: 'Too many failed attempts. Please request a new OTP.'
      }
    }

    // Verify OTP
    const storedOTP = await cacheService.get(otpKey)
    if (!storedOTP || storedOTP !== otp) {
      // Increment attempt count
      await cacheService.set(attemptKey, (attempts + 1).toString(), 3600)
      return {
        success: false,
        message: 'Invalid or expired OTP'
      }
    }

    // OTP is valid - deliver credentials
    try {
      const credentials = await this.telegramAccountService.getAccountCredentials(accountId)

      // Clear OTP after successful verification
      await cacheService.del(otpKey)
      await cacheService.del(attemptKey)

      return {
        success: true,
        credentials,
        message: 'Account credentials delivered successfully'
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve account credentials'
      }
    }
  }

  // ================================
  // CUSTOMER ACCESS METHODS
  // ================================

  /**
   * Get total count of customer's purchased accounts
   */
  async getCustomerAccounts(userId: number) {
    const orders = await db.order.findMany({
      where: {
        userId,
        status: {
          in: ['PENDING', 'CONFIRMED', 'COMPLETED'] as any
        }
      },
      include: {
        product: true
      }
    })

    return orders
  }

  // ================================
  // UTILITY METHODS
  // ================================

  /**
   * Send email with Telegram account credentials to customer
   */
  private async sendTelegramAccountsEmail(order: any, accounts: any[], userEmail: string) {
    try {
      const customerName = order.user?.firstName || 'Customer'
      const emailSubject = `✅ Your Telegram Account Credentials - Order ${order.orderNumber}`

      // Plain text version (unchanged)
      const accountsText = accounts
        .map((acc, index) => {
          if (acc.isDelivered && acc.phone) {
            let credentialsText = `Account #${index + 1}:\n`
            credentialsText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
            credentialsText += `📱 Phone Number: ${acc.phone}\n`
            if (acc.password) credentialsText += `🔐 2FA Password: ${acc.password}\n`
            else credentialsText += `🔐 2FA Password: Not set\n`
            credentialsText += `⭐ Premium Status: ${acc.hasPremium ? 'Yes ✓' : 'No'}\n`
            if (acc.sessionData) credentialsText += `📄 Session Data: Available (see below)\n`
            else credentialsText += `📄 Session Data: Not available\n`
            if (acc.backupCodes && acc.backupCodes.length > 0) {
              credentialsText += `🔑 Backup Codes:\n`
              acc.backupCodes.forEach((code: string, i: number) => {
                credentialsText += `   ${i + 1}. ${code}\n`
              })
            }
            credentialsText += `\n📝 How to Login:\n`
            if (acc.sessionData) {
              credentialsText += `   Method: Session Import (Instant Access)\n`
              credentialsText += `   1. Download the session data from your dashboard\n`
              credentialsText += `   2. Import to Telegram Desktop or use with Telegram API\n`
              credentialsText += `   3. Account will be automatically logged in\n`
            } else {
              credentialsText += `   Method: Fresh Login\n`
              credentialsText += `   1. Open Telegram app\n`
              credentialsText += `   2. Enter phone number: ${acc.phone}\n`
              credentialsText += `   3. Enter SMS verification code\n`
              if (acc.password) credentialsText += `   4. Enter 2FA password: ${acc.password}\n`
            }
            if (acc.sessionData) {
              credentialsText += `\n📦 Session Data:\n${acc.sessionData.substring(0, 100)}...\n`
              credentialsText += `(Full session data available in your dashboard)\n`
            }
            return credentialsText.trim()
          }
          return `Account #${index + 1}: ❌ Delivery failed`
        })
        .join('\n\n' + '='.repeat(50) + '\n\n')

      const emailText = `
Hello ${customerName},

🎉 Great news! Your Telegram accounts have been delivered successfully!

📋 ORDER DETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Order Number: ${order.orderNumber}
Product: ${order.product.name}
Quantity: ${accounts.length} account${accounts.length > 1 ? 's' : ''}
Order Total: $${order.total}

🔑 ACCOUNT CREDENTIALS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${accountsText}

💡 QUICK ACCESS TIPS:
• Save this email in a secure location
• For session-based accounts, use the session data for instant access
• For fresh login, use the phone number and follow SMS verification
• If 2FA is enabled, use the provided password
• Backup codes are for emergency account recovery

🔒 IMPORTANT SECURITY NOTES:
⚠️  Keep these credentials HIGHLY confidential
⚠️  Never share these accounts with unauthorized persons
⚠️  Consider changing passwords after first login (optional)
⚠️  Store backup codes in a safe place
⚠️  Do not share session data - it grants full account access

📊 VIEW IN DASHBOARD:
You can also access your purchased accounts anytime:
1. Login to your account at our website
2. Go to "My Orders" or "Purchased Items"
3. Find order ${order.orderNumber}
4. View all account details

Need help? Contact our support team anytime!

Thank you for your purchase! 🙏

Best regards,
UHQ Accounts Team
      `.trim()

      // HTML version
      let credentialsHtml = ''
      accounts.forEach((acc, index) => {
        if (acc.isDelivered && acc.phone) {
          const rows: Array<{ label: string; value: string }> = [
            { label: 'Phone Number', value: acc.phone },
            { label: '2FA Password', value: acc.password ? acc.password : 'Not set' },
            { label: 'Premium Status', value: acc.hasPremium ? 'Yes ✓' : 'No' },
            { label: 'Session Data', value: acc.sessionData ? 'Available (see dashboard)' : 'Not available' }
          ]
          if (acc.backupCodes && acc.backupCodes.length > 0) {
            rows.push({
              label: 'Backup Codes',
              value: acc.backupCodes.slice(0, 5).join(', ') + (acc.backupCodes.length > 5 ? '...' : '')
            })
          }
          credentialsHtml += `<p style="margin:16px 0 8px;font-size:15px;font-weight:700;color:#0f766e;">Account #${index + 1}</p>`
          credentialsHtml += keyValueTable(rows)
          const loginMethod = acc.sessionData
            ? 'Session Import: Download session data from your dashboard and import to Telegram Desktop.'
            : `Fresh Login: Open Telegram, enter phone ${acc.phone}, then SMS code${acc.password ? ` and 2FA password` : ''}.`
          credentialsHtml += `<p style="margin:8px 0 0;font-size:14px;color:#6b7280;">${escapeHtml(loginMethod)}</p>`
        }
      })

      const contentHtml = [
        sectionGreeting(customerName),
        paragraph('Great news! Your Telegram accounts have been delivered successfully.', 'font-weight:600;'),
        sectionHeading('Order Details'),
        keyValueTable([
          { label: 'Order Number', value: order.orderNumber },
          { label: 'Product', value: order.product?.name || 'N/A' },
          { label: 'Quantity', value: `${accounts.length} account${accounts.length > 1 ? 's' : ''}` },
          { label: 'Order Total', value: `$${order.total}` }
        ]),
        sectionHeading('Account Credentials'),
        rawHtml(credentialsHtml),
        infoBox(
          bulletList([
            'Save this email in a secure location',
            'For session-based accounts, use the session data for instant access',
            'For fresh login, use the phone number and follow SMS verification',
            'If 2FA is enabled, use the provided password',
            'Backup codes are for emergency account recovery'
          ]),
          'info'
        ),
        infoBox(
          bulletList([
            'Keep these credentials HIGHLY confidential',
            'Never share these accounts with unauthorized persons',
            'Consider changing passwords after first login (optional)',
            'Store backup codes in a safe place',
            'Do not share session data — it grants full account access'
          ]),
          'warning'
        ),
        paragraph(`You can view all account details anytime in your dashboard: My Orders → find order ${order.orderNumber}.`),
        ctaButton('View My Orders', `${FRONTEND_URL}/user/purchased-items`),
        signOff()
      ].join('')

      const emailHtml = wrapOrderEmailHtml(`Your Telegram Account Credentials - Order ${order.orderNumber}`, contentHtml)
      await sendEmail(userEmail, emailText, emailSubject, emailHtml)
      console.log(`✅ Telegram accounts email sent to ${userEmail}`)
    } catch (error) {
      console.error('❌ Failed to send Telegram accounts email:', error)
    }
  }

  /**
   * Send email notification for Telegram account assignment (no credentials)
   * Customer must request OTP to access credentials
   */
  /**
   * Send email with instant account credentials to customer (Instagram, Twitter, Facebook, etc.)
   */
  private async sendInstantAccountsEmail(
    order: any,
    instantDeliveries: any[],
    userEmail: string,
    partialDeliveryNote?: string
  ) {
    try {
      // Format all delivered accounts grouped by platform
      const accountsByPlatform = instantDeliveries.reduce(
        (acc, delivery) => {
          const platform = delivery.platform || 'UNKNOWN'
          if (!acc[platform]) {
            acc[platform] = []
          }
          acc[platform].push(...delivery.accounts)
          return acc
        },
        {} as Record<string, any[]>
      )

      let accountsText = ''
      for (const [platform, accounts] of Object.entries(accountsByPlatform)) {
        accountsText += `\n\n${platform} Accounts:\n`
        accountsText += '='.repeat(50) + '\n\n'
        ;(accounts as any[]).forEach((acc: any, index: number) => {
          accountsText += `Account #${index + 1}:\n`
          accountsText += `  Username: ${acc.username || acc.id || 'N/A'}\n`
          accountsText += `  Password: ${acc.password || 'N/A'}\n`
          accountsText += `  Email: ${acc.email || 'N/A'}\n`
          if (acc.recoveryEmail) {
            accountsText += `  Recovery Email: ${acc.recoveryEmail}\n`
          }
          if (acc.phone) {
            accountsText += `  Phone: ${acc.phone}\n`
          }
          if (acc.twoFactorSecret) {
            accountsText += `  2FA Secret: ${acc.twoFactorSecret}\n`
          }
          accountsText += '\n'
        })
      }

      const totalAccounts = Object.values(accountsByPlatform).reduce(
        (sum: number, accs) => sum + (accs as any[]).length,
        0
      )

      const emailSubject = `Your Account Credentials - Order ${order.orderNumber}`
      const emailText = `
Hello ${order.user?.firstName || order.customerName || 'Customer'},

Your accounts have been delivered successfully!

Order Details:
  Order Number: ${order.orderNumber}
  Product: ${order.product.name}
  Total Accounts: ${totalAccounts}
  Order Total: $${order.total}

Account Credentials:
${accountsText}

How to Use Your Accounts:
1. Use the provided username and password to login
2. Change the password immediately after first login
3. Enable two-factor authentication if not already enabled
4. Update recovery email to your own email address

Important Security Notes:
⚠️  Keep these credentials secure and confidential
⚠️  Change all passwords after first login
⚠️  Do not share these accounts with unauthorized persons
⚠️  Contact support immediately if you face any issues

You can also view your purchased accounts in your dashboard:
- Login to your account
- Go to "My Orders"
- Find order ${order.orderNumber}
- View account details
${partialDeliveryNote || ''}

Thank you for your purchase!

Best regards,
UHQ Accounts Team

---
Support: support@flexora.com
Dashboard: https://flexora.com/dashboard
      `.trim()

      // HTML version
      const customerName = order.user?.firstName || order.customerName || 'Customer'
      let credentialsHtml = ''
      for (const [platform, platformAccounts] of Object.entries(accountsByPlatform)) {
        credentialsHtml += sectionHeading(`${platform} Accounts`)
        ;(platformAccounts as any[]).forEach((acc: any, index: number) => {
          const rows: Array<{ label: string; value: string }> = [
            { label: 'Username / ID', value: acc.username || acc.id || 'N/A' },
            { label: 'Password', value: acc.password || 'N/A' },
            { label: 'Email', value: acc.email || 'N/A' }
          ]
          if (acc.recoveryEmail) rows.push({ label: 'Recovery Email', value: acc.recoveryEmail })
          if (acc.phone) rows.push({ label: 'Phone', value: acc.phone })
          if (acc.twoFactorSecret) rows.push({ label: '2FA Secret', value: acc.twoFactorSecret })
          credentialsHtml += `<p style="margin:8px 0 4px;font-size:14px;font-weight:600;">Account #${index + 1}</p>`
          credentialsHtml += keyValueTable(rows)
        })
      }
      const contentHtml = [
        sectionGreeting(customerName),
        paragraph('Your accounts have been delivered successfully!', 'font-weight:600;'),
        sectionHeading('Order Details'),
        keyValueTable([
          { label: 'Order Number', value: order.orderNumber },
          { label: 'Product', value: order.product?.name || 'N/A' },
          { label: 'Total Accounts', value: String(totalAccounts) },
          { label: 'Order Total', value: `$${order.total}` }
        ]),
        sectionHeading('Account Credentials'),
        rawHtml(credentialsHtml),
        infoBox(
          bulletList([
            'Use the provided username and password to login',
            'Change the password immediately after first login',
            'Enable two-factor authentication if not already enabled',
            'Update recovery email to your own email address'
          ]),
          'info'
        ),
        infoBox(
          bulletList([
            'Keep these credentials secure and confidential',
            'Change all passwords after first login',
            'Do not share these accounts with unauthorized persons',
            'Contact support immediately if you face any issues'
          ]),
          'warning'
        ),
        paragraph(`View your purchased accounts in your dashboard: My Orders → order ${order.orderNumber}.`),
        ctaButton('View My Orders', `${FRONTEND_URL}/user/purchased-items`),
        partialDeliveryNote ? paragraph(partialDeliveryNote) : '',
        signOff()
      ].join('')

      const emailHtml = wrapOrderEmailHtml(`Account Credentials - Order ${order.orderNumber}`, contentHtml)
      await sendEmail(userEmail, emailText, emailSubject, emailHtml)
      console.log(`✅ Instant accounts email sent to ${userEmail} (${totalAccounts} accounts)`)
    } catch (error) {
      console.error('❌ Failed to send instant accounts email:', error)
      // Don't throw error, just log it - delivery already succeeded
    }
  }

  /**
   * Send email notification for backorder fulfillment
   */
  private async sendBackorderDeliveryEmail(order: any, accounts: any[], userEmail: string) {
    try {
      const platform = order.product.platform
      const isTelegram = platform === 'TELEGRAM'

      let accountsText = ''
      if (isTelegram) {
        accountsText = accounts
          .map(
            (acc, index) => `
Account #${index + 1}:
  Phone: ${acc.phone}
  ${acc.password ? `2FA Password: ${acc.password}` : 'No 2FA Password'}
  ${acc.hasPremium ? '✓ Premium Account' : '○ Standard Account'}
  
  Login Instructions:
  ${acc.loginInstructions?.steps?.join('\n  ') || 'Check dashboard for instructions'}
        `
          )
          .join('\n' + '='.repeat(50) + '\n')
      } else {
        accountsText = accounts
          .map((acc, index) => {
            const creds = acc.credentials || acc
            return `
Account #${index + 1}:
  Username: ${creds.username || creds.email || 'N/A'}
  Password: ${creds.password || 'N/A'}
  ${creds.email ? `Email: ${creds.email}` : ''}
  ${creds.phone ? `Phone: ${creds.phone}` : ''}
  ${creds.recoveryEmail ? `Recovery Email: ${creds.recoveryEmail}` : ''}
        `
          })
          .join('\n' + '='.repeat(50) + '\n')
      }

      const emailSubject = `🎉 Backorder Fulfilled - Order ${order.orderNumber}`
      const emailText = `
Hello ${order.user?.firstName || order.customerName || 'Customer'},

Great news! Your pending accounts have been delivered!

Order Details:
  Order Number: ${order.orderNumber}
  Product: ${order.product.name}
  Platform: ${platform}
  Just Delivered: ${accounts.length} account(s)
  Previously Delivered: ${order.quantityDelivered || 0} account(s)
  Total Ordered: ${order.quantity} account(s)
  ${order.quantityPending > 0 ? `Still Pending: ${order.quantityPending} account(s)` : '✓ Order Complete!'}

${accounts.length > 0 ? `New Account Credentials:\n${accountsText}` : ''}

${order.quantityPending > 0 ? '\nThe remaining accounts will be delivered automatically when stock becomes available.' : '\nYour order is now complete! Thank you for your patience.'}

View all your accounts: https://flexora.com/dashboard/orders/${order.id}

Thank you for your business!

Best regards,
UHQ Accounts Team

---
Support: support@flexora.com
Dashboard: https://flexora.com/dashboard
      `.trim()

      // HTML version
      const customerName = order.user?.firstName || order.customerName || 'Customer'
      let credentialsHtml = ''
      if (accounts.length > 0) {
        credentialsHtml += sectionHeading('New Account Credentials')
        accounts.forEach((acc, index) => {
          const rows: Array<{ label: string; value: string }> = []
          if (isTelegram) {
            if (acc.phone) rows.push({ label: 'Phone', value: acc.phone })
            if (acc.password) rows.push({ label: '2FA Password', value: acc.password })
            rows.push({ label: 'Premium', value: acc.hasPremium ? 'Yes' : 'No' })
          } else {
            const c = acc.credentials || acc
            if (c.username) rows.push({ label: 'Username', value: c.username })
            if (c.password) rows.push({ label: 'Password', value: c.password })
            if (c.email) rows.push({ label: 'Email', value: c.email })
            if (c.phone) rows.push({ label: 'Phone', value: c.phone })
          }
          if (rows.length) {
            credentialsHtml += `<p style="margin:8px 0 4px;font-size:14px;font-weight:600;">Account #${index + 1}</p>`
            credentialsHtml += keyValueTable(rows)
          }
        })
      }
      const contentHtml = [
        sectionGreeting(customerName),
        paragraph('Great news! Your pending accounts have been delivered!', 'font-weight:600;'),
        sectionHeading('Order Details'),
        keyValueTable([
          { label: 'Order Number', value: order.orderNumber },
          { label: 'Product', value: order.product?.name || 'N/A' },
          { label: 'Platform', value: platform },
          { label: 'Just Delivered', value: `${accounts.length} account(s)` },
          { label: 'Previously Delivered', value: `${order.quantityDelivered || 0} account(s)` },
          { label: 'Total Ordered', value: `${order.quantity} account(s)` },
          { label: 'Status', value: order.quantityPending > 0 ? `${order.quantityPending} still pending` : 'Order complete!' }
        ]),
        rawHtml(credentialsHtml),
        order.quantityPending > 0
          ? paragraph('The remaining accounts will be delivered automatically when stock becomes available. You will receive an email when ready.')
          : paragraph('Your order is now complete! Thank you for your patience.'),
        ctaButton('View My Orders', `${FRONTEND_URL}/user/purchased-items`),
        signOff()
      ].join('')

      const emailHtml = wrapOrderEmailHtml('Backorder Fulfilled', contentHtml)
      await sendEmail(userEmail, emailText, emailSubject, emailHtml)
      console.log(
        `✅ Backorder fulfillment email sent to ${userEmail} (${accounts.length} accounts)`
      )
    } catch (error) {
      console.error('❌ Failed to send backorder fulfillment email:', error)
      // Don't throw error, just log it - delivery already succeeded
    }
  }

  /**
   * Send comprehensive order delivery notification email
   * Handles all scenarios: full delivery, partial delivery, no delivery (backorder)
   */
  private async sendOrderDeliveryNotification(
    order: any,
    deliveryResults: any,
    userEmail: string,
    quantityDelivered: number,
    quantityPending: number,
    deliveryStatus: string
  ) {
    try {
      const frontendUrl = process.env.FRONTEND_URL || 'https://flexora.com'
      const totalOrdered = order.quantity
      const hasDeliveredAccounts = quantityDelivered > 0
      const hasFileDeliveries = Boolean(
        deliveryResults?.instant?.some((item: any) =>
          Array.isArray(item.accounts) && item.accounts.some((account: any) => account?.fileUrl)
        )
      )
      const hasPartialDelivery = quantityPending > 0
      const hasNoDelivery = quantityDelivered === 0

      // Determine email subject and status
      let emailSubject = ''
      let statusEmoji = ''
      let deliveryStatusText = ''

      if (hasNoDelivery) {
        emailSubject = `⏳ Order Received - Pending Stock - ${order.orderNumber}`
        statusEmoji = '⏳'
        deliveryStatusText = 'PENDING DELIVERY (Backorder)'
      } else if (hasPartialDelivery) {
        emailSubject = `📦 Partial Delivery - Order ${order.orderNumber}`
        statusEmoji = '📦'
        deliveryStatusText = 'PARTIALLY DELIVERED'
      } else {
        emailSubject = `✅ Order Delivered - ${order.orderNumber}`
        statusEmoji = '✅'
        deliveryStatusText = 'FULLY DELIVERED'
      }

      // Build account credentials section
      let accountsSection = ''

      if (hasDeliveredAccounts) {
        // Separate Telegram and non-Telegram accounts
        const telegramDeliveries = deliveryResults.instant.filter(
          (item: any) => item.platform === 'TELEGRAM'
        )
        const nonTelegramDeliveries = deliveryResults.instant.filter(
          (item: any) => item.platform !== 'TELEGRAM'
        )

        // Add Telegram accounts
        if (telegramDeliveries.length > 0) {
          accountsSection += '\n🔐 TELEGRAM ACCOUNT CREDENTIALS:\n'
          accountsSection += '━'.repeat(50) + '\n\n'

          telegramDeliveries.forEach((delivery: any) => {
            delivery.accounts.forEach((acc: any, index: number) => {
              const credentials = acc.credentials || acc
              accountsSection += `Account #${index + 1}:\n`
              accountsSection += `  📱 Phone: ${acc.phone || 'N/A'}\n`
              if (credentials.username) {
                accountsSection += `  👤 Username: ${credentials.username}\n`
              }
              if (credentials.email) {
                accountsSection += `  📧 Email: ${credentials.email}\n`
              }
              if (acc.password) {
                accountsSection += `  🔑 Password: ${acc.password}\n`
              }
              if (credentials.sessionData) {
                accountsSection += `  💾 Session Data: Included\n`
              }
              if (Array.isArray(credentials.backupCodes) && credentials.backupCodes.length > 0) {
                accountsSection += `  🛟 Backup Codes: ${credentials.backupCodes.join(', ')}\n`
              }
              if (credentials.note) {
                accountsSection += `  📝 Note: ${credentials.note}\n`
              }
              accountsSection += `  ⭐ Premium: ${acc.hasPremium ? 'Yes' : 'No'}\n`
              accountsSection += '\n'
            })
          })
        }

        // Add non-Telegram accounts
        if (nonTelegramDeliveries.length > 0) {
          accountsSection += '\n🔐 ACCOUNT CREDENTIALS:\n'
          accountsSection += '━'.repeat(50) + '\n\n'

          nonTelegramDeliveries.forEach((delivery: any) => {
            accountsSection += `\n${delivery.platform} Accounts:\n\n`
            delivery.accounts.forEach((acc: any, index: number) => {
              const credentials = acc.credentials || acc
              accountsSection += `Account #${index + 1}:\n`
              accountsSection += `  Username/ID: ${credentials.username || credentials.id || 'N/A'}\n`
              accountsSection += `  Password: ${credentials.password || 'N/A'}\n`
              if (credentials.email) {
                accountsSection += `  Email: ${credentials.email}\n`
              }
              if (credentials.phone) {
                accountsSection += `  Phone: ${credentials.phone}\n`
              }
              if (credentials.recoveryEmail) {
                accountsSection += `  Recovery Email: ${credentials.recoveryEmail}\n`
              }
              if (credentials.twoFactorSecret) {
                accountsSection += `  2FA Secret: ${credentials.twoFactorSecret}\n`
              }
              if (credentials.note) {
                accountsSection += `  Note: ${credentials.note}\n`
              }
              accountsSection += '\n'
            })
          })
        }
      }

      // Build pending notice section
      let pendingSection = ''
      if (hasPartialDelivery || hasNoDelivery) {
        pendingSection = `
⏳ BACKORDER NOTICE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${quantityPending} account(s) are currently out of stock and will be delivered automatically once inventory is restocked.

${hasNoDelivery ? '• No accounts delivered yet - all pending stock arrival' : `• ${quantityDelivered} account(s) delivered now`}
• ${quantityPending} account(s) pending delivery
• You will receive another email when the remaining accounts are ready
• No action required from you - we'll handle everything automatically

We apologize for the inconvenience and appreciate your patience!
        `.trim()
      }

      const emailText = `
Hello ${order.user?.firstName || order.customerName || 'Customer'},

${statusEmoji} ${deliveryStatusText}

📋 ORDER SUMMARY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Order Number: ${order.orderNumber}
Product: ${order.product.name}
Total Ordered: ${totalOrdered} account${totalOrdered > 1 ? 's' : ''}
Delivered Now: ${quantityDelivered} account${quantityDelivered !== 1 ? 's' : ''}
${hasPartialDelivery || hasNoDelivery ? `Pending: ${quantityPending} account${quantityPending !== 1 ? 's' : ''}` : ''}
Order Total: $${order.total}
${accountsSection}
${pendingSection}

${
  hasDeliveredAccounts
    ? `
💡 IMPORTANT SECURITY TIPS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  Keep these credentials secure and confidential
⚠️  Change passwords after first login (recommended)
⚠️  Enable two-factor authentication if not already enabled
⚠️  Never share these accounts with unauthorized persons
⚠️  Contact support immediately if you face any issues
`
    : ''
}

📊 VIEW IN DASHBOARD:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
You can access your order details anytime:
1. Login to your account at our website
2. Go to "My Orders" section
3. Find order ${order.orderNumber}
4. View complete order details and status

${
  hasDeliveredAccounts
    ? `
📥 DOWNLOAD YOUR ORDER:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${hasFileDeliveries ? 'Download your delivered files from the direct links in your order details.' : 'Download your order credentials in multiple formats:'}

For Registered Users:
• Dashboard: ${frontendUrl}/user/purchased-items
• Find order ${order.orderNumber} and open delivery details
• ${hasFileDeliveries ? 'File products show direct download links' : 'Available formats: TXT, Excel, JSON'}

For Guest Users:
• Access Page: ${frontendUrl}/guest/orders
• Enter order number: ${order.orderNumber}
• Enter your email: ${userEmail}
• ${hasFileDeliveries ? 'File products show direct download links' : 'Available formats: TXT, Excel, JSON'}

${hasFileDeliveries ? 'Direct file links are shown in your delivery details.' : 'All formats include complete account credentials and order details.'}
`
    : ''
}

${
  hasPartialDelivery || hasNoDelivery
    ? `
📧 NEXT STEPS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• We're working to restock your ordered items
• You'll receive an email when remaining accounts are ready
• Check your dashboard for real-time order status updates
• Estimated delivery: As soon as stock becomes available
`
    : ''
}

Thank you for your purchase! ${hasPartialDelivery || hasNoDelivery ? 'We appreciate your patience.' : ''}

Best regards,
UHQ Accounts Team

---
Support: support@flexora.com
Dashboard: ${frontendUrl}/dashboard
      `.trim()

      // Build HTML version
      const customerName = order.user?.firstName || order.customerName || 'Customer'
      const statusBadgeType = hasNoDelivery ? 'warning' : hasPartialDelivery ? 'info' : 'success'
      let accountsHtml = ''
      if (hasDeliveredAccounts) {
        const telegramDeliveries = deliveryResults.instant.filter((item: any) => item.platform === 'TELEGRAM')
        const nonTelegramDeliveries = deliveryResults.instant.filter((item: any) => item.platform !== 'TELEGRAM')
        if (telegramDeliveries.length > 0) {
          accountsHtml += sectionHeading('Telegram Account Credentials')
          telegramDeliveries.forEach((delivery: any) => {
            delivery.accounts.forEach((acc: any, index: number) => {
              const credentials = acc.credentials || acc
              const rows: Array<{ label: string; value: string }> = [
                { label: 'Phone', value: acc.phone || 'N/A' },
                { label: 'Premium', value: acc.hasPremium ? 'Yes' : 'No' }
              ]
              if (credentials.username) rows.push({ label: 'Username', value: credentials.username })
              if (credentials.email) rows.push({ label: 'Email', value: credentials.email })
              if (acc.password) rows.push({ label: 'Password', value: acc.password })
              if (credentials.sessionData) rows.push({ label: 'Session Data', value: 'Included' })
              if (Array.isArray(credentials.backupCodes) && credentials.backupCodes.length > 0) {
                rows.push({ label: 'Backup Codes', value: credentials.backupCodes.join(', ') })
              }
              if (credentials.note) rows.push({ label: 'Note', value: credentials.note })
              accountsHtml += `<p style="margin:8px 0 4px;font-size:14px;font-weight:600;">Account #${index + 1}</p>`
              accountsHtml += keyValueTable(rows)
            })
          })
        }
        if (nonTelegramDeliveries.length > 0) {
          accountsHtml += sectionHeading('Account Credentials')
          nonTelegramDeliveries.forEach((delivery: any) => {
            accountsHtml += `<p style="margin:8px 0 4px;font-size:14px;font-weight:600;">${escapeHtml(delivery.platform)}</p>`
            delivery.accounts.forEach((acc: any, index: number) => {
              const c = acc.credentials || acc
              const rows: Array<{ label: string; value: string }> = [
                { label: 'Username / ID', value: c.username || c.id || 'N/A' },
                { label: 'Password', value: c.password || 'N/A' }
              ]
              if (c.email) rows.push({ label: 'Email', value: c.email })
              if (c.phone) rows.push({ label: 'Phone', value: c.phone })
              if (c.recoveryEmail) rows.push({ label: 'Recovery Email', value: c.recoveryEmail })
              if (c.twoFactorSecret) rows.push({ label: '2FA Secret', value: c.twoFactorSecret })
              if (c.note) rows.push({ label: 'Note', value: c.note })
              accountsHtml += keyValueTable(rows)
            })
          })
        }
      }
      const orderSummaryRows: Array<{ label: string; value: string }> = [
        { label: 'Order Number', value: order.orderNumber },
        { label: 'Product', value: order.product?.name || 'N/A' },
        { label: 'Total Ordered', value: `${totalOrdered} account${totalOrdered !== 1 ? 's' : ''}` },
        { label: 'Delivered Now', value: `${quantityDelivered} account${quantityDelivered !== 1 ? 's' : ''}` },
        { label: 'Order Total', value: `$${order.total}` }
      ]
      if (hasPartialDelivery || hasNoDelivery) {
        orderSummaryRows.push({ label: 'Pending', value: `${quantityPending} account${quantityPending !== 1 ? 's' : ''}` })
      }
      const contentParts = [
        sectionGreeting(customerName),
        rawHtml(statusBadge(deliveryStatusText, statusBadgeType)),
        sectionHeading('Order Summary'),
        keyValueTable(orderSummaryRows),
        rawHtml(accountsHtml)
      ]
      if (hasPartialDelivery || hasNoDelivery) {
        contentParts.push(
          infoBox(
            bulletList([
              `${quantityPending} account(s) are currently out of stock and will be delivered automatically once restocked.`,
              hasNoDelivery ? 'No accounts delivered yet — all pending stock arrival.' : `${quantityDelivered} account(s) delivered now.`,
              `${quantityPending} account(s) pending delivery.`,
              'You will receive another email when the remaining accounts are ready.',
              'No action required — we\'ll handle everything automatically.'
            ]),
            'warning'
          )
        )
      }
      if (hasDeliveredAccounts) {
        contentParts.push(
          infoBox(
            bulletList([
              'Keep these credentials secure and confidential',
              'Change passwords after first login (recommended)',
              'Enable two-factor authentication if not already enabled',
              'Never share these accounts with unauthorized persons',
              'Contact support immediately if you face any issues'
            ]),
            'warning'
          )
        )
      }
      contentParts.push(
        paragraph('You can access your order details anytime in your dashboard: My Orders → find order ' + order.orderNumber + '.')
      )
      if (hasDeliveredAccounts) {
        contentParts.push(
          paragraph(`Download credentials: ${frontendUrl}/user/purchased-items (registered) or ${frontendUrl}/guest/access (guest). Formats: TXT, Excel, JSON.`)
        )
      }
      if (hasPartialDelivery || hasNoDelivery) {
        contentParts.push(
          infoBox(
            bulletList([
              "We're working to restock your ordered items.",
              "You'll receive an email when remaining accounts are ready.",
              'Check your dashboard for real-time order status updates.',
              'Estimated delivery: As soon as stock becomes available.'
            ]),
            'info'
          )
        )
      }
      contentParts.push(ctaButton('View My Orders', `${frontendUrl}/user/purchased-items`))
      contentParts.push(signOff())
      const emailHtml = wrapOrderEmailHtml(deliveryStatusText + ' - ' + order.orderNumber, contentParts.join(''))

      // Append customizable post-purchase content from default DeliveryTemplate
      try {
        const deliveryTemplate = await deliveryTemplateService.getDefaultTemplate()
        if (deliveryTemplate && typeof (deliveryTemplate as any).id === 'number') {
          const t = deliveryTemplate as any
          const parts: string[] = []
          if (t.thankYouMessage?.trim()) parts.push(t.thankYouMessage.trim())
          if (t.couponPromotionText?.trim()) parts.push(t.couponPromotionText.trim())
          if (t.supportContactInfo?.trim()) parts.push(t.supportContactInfo.trim())
          if (t.feedbackRequestText?.trim()) parts.push(t.feedbackRequestText.trim())
          if (parts.length > 0) {
            const appended = '\n\n' + parts.join('\n\n')
            await sendEmail(userEmail, emailText + appended, emailSubject, emailHtml)
            console.log(`✅ Order delivery notification sent to ${userEmail} (with delivery template)`, {
              deliveredCount: quantityDelivered,
              pendingCount: quantityPending,
              status: deliveryStatusText
            })
            return
          }
        }
      } catch (_) {
        // ignore
      }

      await sendEmail(userEmail, emailText, emailSubject, emailHtml)
      console.log(`✅ Order delivery notification sent to ${userEmail}`, {
        deliveredCount: quantityDelivered,
        pendingCount: quantityPending,
        status: deliveryStatusText
      })
    } catch (error) {
      console.error('❌ Failed to send order delivery notification:', error)
      throw error // Re-throw to be caught by caller
    }
  }

  /**
   * Decrypt account credentials based on platform
   */
  private async decryptAccountCredentials(account: any) {
    if (account.platform === 'TELEGRAM') {
      // Use TelegramAccountService for decryption
      return await this.telegramAccountService.getAccountCredentials(account.id)
    }

    // For other platforms, decrypt the encrypted data
    try {
      if (!account.encryptedData) {
        console.error(`Account ${account.id} has no encrypted data`)
        return null
      }

      // Decrypt the encrypted data
      const decryptedData = decrypt(account.encryptedData)
      const credentials = JSON.parse(decryptedData)

      return credentials
    } catch (error) {
      console.error(`Failed to decrypt account ${account.id}:`, error)
      return null
    }
  }

  /**
   * Check if an order has Telegram products
   */
  hasTelegramProducts(order: any): boolean {
    return order.product?.platform === PlatformType.TELEGRAM
  }

  /**
   * Get order delivery summary
   */
  async getDeliveryStatus(orderId: number) {
    const order = await this.findById(orderId)

    const summary = {
      orderNumber: order.orderNumber,
      status: order.status,
      deliveryStatus: order.deliveryStatus,
      deliveredAt: order.deliveredAt,
      productName: order.product.name,
      platform: order.product.platform,
      quantity: order.quantity,
      requiresOtp: order.product.platform === PlatformType.TELEGRAM,
      isDelivered: false,
      deliveredCount: 0,
      pendingCount: order.quantity
    }

    // Count accounts actually assigned to this specific order
    const assignedCount = await db.account.count({
      where: { usedByOrderId: orderId }
    })
    summary.deliveredCount = assignedCount
    summary.pendingCount = Math.max(0, order.quantity - assignedCount)
    summary.isDelivered = assignedCount >= order.quantity

    return summary
  }

  /**
   * Process pending orders when new stock becomes available
   * Called automatically after account creation
   */
  async processPendingOrdersForProduct(productId: number) {
    console.log('[OrderService] Processing pending orders for product', { productId })

    // Find orders with pending quantities for this product (FIFO: First In, First Out)
    const pendingOrders = await db.order.findMany({
      where: {
        productId,
        quantityPending: { gt: 0 },
        status: { in: ['COMPLETED', 'PARTIAL'] } // Only completed/paid orders
      },
      orderBy: { createdAt: 'asc' }, // Process oldest orders first
      include: {
        product: {
          select: {
            id: true,
            name: true,
            platform: true,
            type: true
          }
        },
        user: {
          select: {
            email: true,
            firstName: true
          }
        }
      }
    })

    if (pendingOrders.length === 0) {
      console.log('[OrderService] No pending orders found for product', { productId })
      return
    }

    console.log('[OrderService] Found pending orders', {
      productId,
      count: pendingOrders.length,
      totalPending: pendingOrders.reduce((sum, o) => sum + o.quantityPending, 0)
    })

    // Get available stock for this product
    let availableStock = await db.account.count({
      where: {
        productId,
        isUsed: false,
        isValid: true,
        archived: false
      }
    })

    console.log('[OrderService] Available stock', { productId, availableStock })

    if (availableStock === 0) {
      console.log('[OrderService] No available stock to fulfill pending orders', { productId })
      return
    }

    // Process each pending order
    for (const order of pendingOrders) {
      if (availableStock === 0) {
        console.log('[OrderService] Stock depleted, stopping backorder processing')
        break
      }

      const quantityToDeliver = Math.min(order.quantityPending, availableStock)

      console.log('[OrderService] Processing backorder', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        quantityPending: order.quantityPending,
        quantityToDeliver
      })

      try {
        // Deliver pending accounts
        await this.deliverOrderAccounts(order.id, true) // true = isBackorderFulfillment

        availableStock -= quantityToDeliver

        console.log('[OrderService] Backorder fulfilled', {
          orderId: order.id,
          orderNumber: order.orderNumber,
          quantityDelivered: quantityToDeliver,
          remainingStock: availableStock
        })
      } catch (error) {
        console.error('[OrderService] Failed to process backorder', {
          orderId: order.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        // Continue with next order even if one fails
      }
    }

    console.log('[OrderService] Backorder processing completed', {
      productId,
      remainingStock: availableStock
    })
  }

  // ================================
  // ADMIN / MANAGEMENT HELPERS
  // ================================

  private buildOrderHistoryEvent(params: {
    action: string
    from?: string | null
    to: string
    source?: string
    actorId?: number
    actorEmail?: string
    note?: string
  }) {
    return {
      action: params.action,
      from: params.from || null,
      to: params.to,
      source: params.source || 'ADMIN_UPDATE',
      actorId: params.actorId || null,
      actorEmail: params.actorEmail || null,
      note: params.note || null,
      changedAt: new Date().toISOString()
    }
  }

  async updateStatus(
    orderId: number,
    status: string,
    adminNotes?: any,
    actor?: { actorId?: number; actorEmail?: string; source?: string }
  ) {
    const order = await this.findById(orderId)
    const meta = ((order.meta as any) || {}) as Record<string, any>
    const statusHistory = Array.isArray(meta.statusHistory) ? meta.statusHistory : []
    const historyEvent = this.buildOrderHistoryEvent({
      action: status === 'COMPLETED' ? 'MARK_COMPLETED' : 'STATUS_UPDATE',
      from: order.status,
      to: status,
      source: actor?.source || (status === 'COMPLETED' ? 'MANUAL_MARK_COMPLETED' : 'ADMIN_STATUS_UPDATE'),
      actorId: actor?.actorId,
      actorEmail: actor?.actorEmail,
      note:
        typeof adminNotes === 'string'
          ? adminNotes
          : typeof adminNotes?.note === 'string'
            ? adminNotes.note
            : undefined
    })

    await db.order.update({
      where: { id: orderId },
      data: {
        status: status as any,
        meta: {
          ...meta,
          adminNotes: adminNotes || meta.adminNotes || null,
          statusHistory: [...statusHistory, historyEvent]
        }
      }
    })

    await this.syncParentMultiItemOrderState(orderId)

    return { success: true, orderId, status }
  }

  async updateDeliveryStatus(
    orderId: number,
    deliveryStatus: string,
    actor?: { actorId?: number; actorEmail?: string; source?: string; note?: string }
  ) {
    const order = await this.findById(orderId)
    const oldDeliveryStatus = order.deliveryStatus

    // For ACCOUNT type orders, validate that accounts are assigned before allowing DELIVERED status
    if (deliveryStatus === 'DELIVERED' && order.product?.type === 'ACCOUNT') {
      // Check if accounts are actually assigned to this order
      const assignedAccounts = await db.account.findMany({
        where: { usedByOrderId: orderId },
        select: { id: true }
      })

      const assignedCount = assignedAccounts.length
      const requiredQuantity = order.quantity || 1

      // If no accounts assigned, try to auto-assign them
      if (assignedCount === 0) {
        console.log(`[OrderService] No accounts assigned to order ${orderId}, attempting auto-assignment...`)
        try {
          // Attempt to deliver accounts automatically
          await this.deliverOrderAccounts(orderId, false)
          
          // Re-check after delivery attempt
          const recheckAccounts = await db.account.findMany({
            where: { usedByOrderId: orderId },
            select: { id: true }
          })

          if (recheckAccounts.length === 0) {
            throw new Error(
              `Cannot set order to DELIVERED: No accounts available to assign. ` +
              `Order requires ${requiredQuantity} account(s), but none are available in stock. ` +
              `Please assign accounts manually or ensure product has available stock.`
            )
          }

          console.log(`[OrderService] Auto-assigned ${recheckAccounts.length} account(s) to order ${orderId}`)
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          console.error(`[OrderService] Failed to auto-assign accounts:`, errorMessage)
          throw new Error(
            `Cannot set order to DELIVERED: Failed to assign accounts. ${errorMessage}`
          )
        }
      } else if (assignedCount < requiredQuantity) {
        // Partial assignment - set to PARTIAL instead
        console.log(
          `[OrderService] Order ${orderId} has ${assignedCount}/${requiredQuantity} accounts assigned. ` +
          `Setting status to PARTIAL instead of DELIVERED.`
        )
        deliveryStatus = 'PARTIAL'
      }
    }

    const meta = ((order.meta as any) || {}) as Record<string, any>
    const deliveryStatusHistory = Array.isArray(meta.deliveryStatusHistory)
      ? meta.deliveryStatusHistory
      : []
    const historyEvent = this.buildOrderHistoryEvent({
      action: deliveryStatus === 'DELIVERED' ? 'MARK_DELIVERED' : 'DELIVERY_STATUS_UPDATE',
      from: oldDeliveryStatus,
      to: deliveryStatus,
      source:
        actor?.source ||
        (deliveryStatus === 'DELIVERED' ? 'MANUAL_MARK_DELIVERED' : 'ADMIN_DELIVERY_STATUS_UPDATE'),
      actorId: actor?.actorId,
      actorEmail: actor?.actorEmail,
      note: actor?.note
    })

    await db.order.update({
      where: { id: orderId },
      data: {
        deliveryStatus: deliveryStatus as any,
        deliveredAt: deliveryStatus === 'DELIVERED' ? new Date() : null,
        meta: {
          ...meta,
          deliveryStatusHistory: [...deliveryStatusHistory, historyEvent]
        }
      }
    })

    if (deliveryStatus === 'DELIVERED') {
      const latestDelivery = await db.delivery.findFirst({
        where: { orderId },
        orderBy: { createdAt: 'desc' },
        select: { id: true }
      })

      if (!latestDelivery) {
        await db.delivery.create({
          data: {
            orderId,
            status: 'DELIVERED',
            accounts: [],
            format: 'manual',
            meta: {
              manualDelivery: true,
              deliveryType: 'MANUAL_STATUS_UPDATE',
              action: 'MARK_DELIVERED',
              note: actor?.note || null,
              actorId: actor?.actorId || null,
              actorEmail: actor?.actorEmail || null,
              createdFromStatusUpdate: true
            },
            deliveredAt: new Date()
          }
        })
      }
    }

    await this.syncParentMultiItemOrderState(orderId)

    // Send email notification when delivery status changes to DELIVERED
    if (deliveryStatus === 'DELIVERED' && oldDeliveryStatus !== 'DELIVERED') {
      try {
        const userEmail = order.user?.email || order.guestEmail
        if (userEmail) {
          // Get delivery information
          const delivery = await db.delivery.findFirst({
            where: { orderId },
            orderBy: { createdAt: 'desc' }
          })
          const isFileDelivery = order.product?.type === 'FILE'
          const isPremiumDelivery = ['PREMIUM_1M', 'PREMIUM_3M', 'PREMIUM_6M', 'PREMIUM_12M'].includes(
            String(order.product?.type || '')
          )
          const deliveryAccessText = isFileDelivery
            ? 'Open delivery details to use the direct file download links. TXT, Excel, and JSON exports are hidden for file products.'
            : isPremiumDelivery
              ? 'Open delivery details to review the Premium activation status. Credential exports are hidden for Premium products.'
              : 'Open delivery details to review delivered credentials. Available formats: TXT, Excel, JSON.'

          const emailSubject = `✅ Order Delivered - ${order.orderNumber}`
          const emailText = `
Hello ${order.user?.firstName || order.customerName || 'Customer'},

🎉 Your order has been delivered!

📋 ORDER DETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Order Number: ${order.orderNumber}
Product: ${order.product.name}
Quantity: ${order.quantity}
Total: $${order.total}
Delivery Status: DELIVERED
Delivered At: ${new Date().toLocaleDateString()}

📥 ACCESS YOUR ORDER:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${order.userId
  ? `• Dashboard: https://flexora.com/user/purchased-items
• Find order ${order.orderNumber} and open delivery details
• ${deliveryAccessText}`
  : `• Guest Access: https://flexora.com/guest/access
• Enter order number: ${order.orderNumber}
• Enter your email: ${userEmail}
• ${deliveryAccessText}`}

💡 IMPORTANT SECURITY TIPS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  Keep your account credentials secure and confidential
⚠️  Change passwords after first login (recommended)
⚠️  Enable two-factor authentication if not already enabled
⚠️  Never share these accounts with unauthorized persons
⚠️  Contact support immediately if you face any issues

Thank you for your purchase!

Best regards,
UHQ Accounts Team

---
Support: support@flexora.com
Dashboard: https://flexora.com/dashboard
          `.trim()

          const customerName = order.user?.firstName || order.customerName || 'Customer'
          const dashboardUrl = FRONTEND_URL + '/user/purchased-items'
          const guestUrl = FRONTEND_URL + '/guest/access'
          const contentHtml = [
            sectionGreeting(customerName),
            paragraph('Your order has been delivered!', 'font-weight:600;'),
            sectionHeading('Order Details'),
            keyValueTable([
              { label: 'Order Number', value: order.orderNumber },
              { label: 'Product', value: order.product?.name || 'N/A' },
              { label: 'Quantity', value: String(order.quantity) },
              { label: 'Total', value: `$${order.total}` },
              { label: 'Delivery Status', value: 'DELIVERED' },
              { label: 'Delivered At', value: new Date().toLocaleDateString() }
            ]),
            paragraph(
              order.userId
                ? `Dashboard: ${dashboardUrl} - Find order ${order.orderNumber} and open delivery details. ${deliveryAccessText}`
                : `Guest access: ${guestUrl} - Enter order ${order.orderNumber} and your email ${userEmail}. ${deliveryAccessText}`
            ),
            infoBox(
              bulletList([
                'Keep your account credentials secure and confidential',
                'Change passwords after first login (recommended)',
                'Enable two-factor authentication if not already enabled',
                'Never share these accounts with unauthorized persons',
                'Contact support immediately if you face any issues'
              ]),
              'warning'
            ),
            ctaButton('View My Orders', dashboardUrl),
            signOff()
          ].join('')
          const emailHtml = wrapOrderEmailHtml('Order Delivered - ' + order.orderNumber, contentHtml)

          await sendEmail(userEmail, emailText, emailSubject, emailHtml)
          console.log('[OrderService] Delivery status email sent', {
            orderId,
            orderNumber: order.orderNumber,
            email: userEmail,
            deliveryStatus
          })
        }
      } catch (emailError) {
        console.error('[OrderService] Failed to send delivery status email', {
          orderId,
          error: emailError instanceof Error ? emailError.message : 'Unknown error'
        })
        // Don't fail status update if email fails
      }
    }

    return { success: true, orderId, deliveryStatus }
  }

  private async syncParentMultiItemOrderState(childOrderId: number) {
    const parentOrders = await db.order.findMany({
      where: {
        meta: {
          path: ['multiItemOrder', 'isParent'],
          equals: true
        }
      },
      select: {
        id: true,
        meta: true
      }
    })

    const parent = parentOrders.find((order) => {
      const childOrderIds = (order.meta as any)?.multiItemOrder?.childOrderIds
      return Array.isArray(childOrderIds) && childOrderIds.map(Number).includes(childOrderId)
    })

    if (!parent) return

    const childOrderIds = ((parent.meta as any)?.multiItemOrder?.childOrderIds || [])
      .map((value: unknown) => Number(value))
      .filter((value: number) => Number.isInteger(value) && value > 0)

    if (childOrderIds.length === 0) return

    const childOrders = await db.order.findMany({
      where: {
        id: { in: childOrderIds }
      },
      select: {
        status: true,
        deliveryStatus: true,
        quantity: true,
        quantityOrdered: true,
        quantityDelivered: true,
        quantityPending: true,
        deliveredAt: true
      }
    })

    if (childOrders.length === 0) return

    const orderStatuses = childOrders.map((order) => order.status)
    const deliveryStatuses = childOrders.map((order) => order.deliveryStatus)
    const nextStatus = orderStatuses.every((status) => status === 'COMPLETED')
      ? 'COMPLETED'
      : orderStatuses.every((status) => status === 'CANCELLED')
        ? 'CANCELLED'
        : orderStatuses.every((status) => status === 'REFUNDED')
          ? 'REFUNDED'
          : orderStatuses.some((status) => status === 'COMPLETED' || status === 'PARTIAL')
            ? 'PARTIAL'
            : orderStatuses.some((status) => status === 'CONFIRMED')
              ? 'CONFIRMED'
              : 'PENDING'
    const nextDeliveryStatus = deliveryStatuses.every((status) => status === 'DELIVERED')
      ? 'DELIVERED'
      : deliveryStatuses.some((status) => status === 'FAILED')
        ? 'FAILED'
        : deliveryStatuses.some((status) => status === 'DELIVERED' || status === 'PARTIAL')
          ? 'PARTIAL'
          : deliveryStatuses.some((status) => status === 'PROCESSING')
            ? 'PROCESSING'
            : 'PENDING'
    const quantityOrdered = childOrders.reduce(
      (sum, order) => sum + Number(order.quantityOrdered || order.quantity || 0),
      0
    )
    const quantityDelivered = childOrders.reduce(
      (sum, order) => sum + Number(order.quantityDelivered || 0),
      0
    )
    const quantityPending = childOrders.reduce(
      (sum, order) => sum + Number(order.quantityPending || 0),
      0
    )
    const deliveredAt =
      nextDeliveryStatus === 'DELIVERED'
        ? childOrders
            .map((order) => order.deliveredAt)
            .filter(Boolean)
            .sort((left, right) => right!.getTime() - left!.getTime())[0] || new Date()
        : null

    await db.order.update({
      where: { id: parent.id },
      data: {
        status: nextStatus as any,
        deliveryStatus: nextDeliveryStatus as any,
        quantityOrdered,
        quantityDelivered,
        quantityPending,
        isPartial: nextStatus === 'PARTIAL' || nextDeliveryStatus === 'PARTIAL',
        deliveredAt
      }
    })
  }

  /**
   * Manually assign accounts to an order (mark accounts as used)
   */
  async manualAssignAccounts(orderId: number, quantity: number) {
    const order = await this.findById(orderId)

    // Use telegram account service for assignment if platform is TELEGRAM
    const accounts = await this.telegramAccountService.assignAccountToOrder(
      order.productId,
      quantity
    )

    // Mark accounts as used
    for (const acc of accounts) {
      await this.telegramAccountService.markAsUsed(acc.id, orderId)
    }

    // Update order meta with manual assignment
    await db.order.update({
      where: { id: orderId },
      data: {
        meta: {
          ...((order.meta as any) || {}),
          manualAssigned: true
        }
      }
    })

    return accounts
  }

  /**
   * Force delivery: call deliverOrderAccounts and return result
   */
  async forceDeliver(orderId: number) {
    const result = await this.deliverOrderAccounts(orderId)
    return result
  }

  /**
   * Refund an order: update payment/order status and attempt to restore stock and accounts
   * @param refundTo - 'BALANCE' to refund to user balance, 'GATEWAY' to refund via payment gateway (default)
   */
  async refundOrder(
    orderId: number,
    options?: { reason?: string; refundTo?: 'BALANCE' | 'GATEWAY' }
  ) {
    const order = await this.findById(orderId)

    if (order.status === 'REFUNDED') {
      throw new Error('Order is already refunded')
    }

    // Validate refund destination
    const refundTo = options?.refundTo || 'GATEWAY'

    if (refundTo === 'BALANCE' && !order.userId) {
      throw new Error('Cannot refund to balance for guest orders. Use GATEWAY refund instead.')
    }

    await db.$transaction(async (tx) => {
      // Update payment record if exists
      const paymentId = (order as any).paymentId
      if (paymentId) {
        await tx.payment.update({
          where: { id: paymentId },
          data: {
            status: 'REFUNDED',
            meta: {
              refundReason: options?.reason || null,
              refundTo
            }
          }
        })
      }

      // Update order status
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'REFUNDED',
          meta: {
            ...((order.meta as any) || {}),
            refundReason: options?.reason || null,
            refundTo
          }
        }
      })

      // Unmark accounts assigned to this order first so we know the exact count
      const unmarkResult = await tx.account.updateMany({
        where: { usedByOrderId: orderId },
        data: { isUsed: false, usedAt: null, usedByOrderId: null }
      })

      // Restore stock only for accounts that were actually delivered (not the full ordered quantity)
      // This correctly handles partial-delivery orders where quantityDelivered < quantity
      const actualRestored = unmarkResult.count
      if (actualRestored > 0) {
        await tx.product.update({
          where: { id: order.productId },
          data: {
            stockCount: { increment: actualRestored },
            soldCount: { decrement: actualRestored }
          }
        })
      }
    })

    // Handle balance refund outside transaction
    if (refundTo === 'BALANCE' && order.userId) {
      await this.balanceService.refundToBalance(
        orderId,
        Number(order.total),
        options?.reason || 'Order refund'
      )

      return {
        success: true,
        message: `Order refunded successfully. ${order.total.toString()} added to user balance.`
      }
    }

    return { success: true, message: 'Order refunded successfully' }
  }

  // ================================
  // RESEND & REPLACE FUNCTIONALITY
  // ================================

  /**
   * Resend order products to customer (same accounts)
   */
  async resendOrder(
    orderId: number,
    reason?: string,
    sendEmail: boolean = true,
    options: { selectedOrderIds?: number[]; resendAll?: boolean } = {}
  ) {
    const order = await this.findById(orderId)
    const targetOrders = await this.getResendTargetOrders(orderId, options)

    if (targetOrders.length === 0) {
      throw new Error('No items selected for resend')
    }

    const resendItems = []

    for (const targetOrder of targetOrders) {
      if (targetOrder.deliveryStatus !== 'DELIVERED') {
        throw new Error(`Can only resend delivered items. ${targetOrder.orderNumber} is ${targetOrder.deliveryStatus}`)
      }

      if (!targetOrder.canResend) {
        throw new Error(`${targetOrder.orderNumber} cannot be resent. Please contact support.`)
      }

      const lastDelivery = await db.delivery.findFirst({
        where: { orderId: targetOrder.id },
        orderBy: { createdAt: 'desc' }
      })

      if (!lastDelivery || (!lastDelivery.accounts && !lastDelivery.fileUrl)) {
        throw new Error(`No delivery history found for ${targetOrder.orderNumber}`)
      }

      const newDelivery = await db.delivery.create({
        data: {
          orderId: targetOrder.id,
          status: 'DELIVERED',
          accounts: lastDelivery.accounts === null ? undefined : (lastDelivery.accounts as any),
          format: lastDelivery.format,
          fileUrl: lastDelivery.fileUrl,
          meta: lastDelivery.meta === null ? undefined : (lastDelivery.meta as any),
          deliveredAt: new Date()
        }
      })

      const resendHistory = ((targetOrder.meta as any)?.resendHistory || []) as any[]
      await db.order.update({
        where: { id: targetOrder.id },
        data: {
          meta: {
            ...((targetOrder.meta as any) || {}),
            resendHistory: [
              ...resendHistory,
              {
                resendAt: new Date(),
                deliveryId: newDelivery.id,
                reason: reason || 'Admin resend',
                parentOrderId: orderId === targetOrder.id ? null : orderId
              }
            ]
          }
        }
      })

      resendItems.push({
        order: targetOrder,
        delivery: newDelivery,
        accounts: this.normalizeResendAccounts(lastDelivery.accounts),
        files: this.getResendFiles(lastDelivery)
      })
    }

    // Send email if requested
    if (sendEmail) {
      const customerEmail = order.user?.email || order.guestEmail
      if (customerEmail) {
        await this.sendResendEmail(order, resendItems, customerEmail, reason)
      }
    }

    return {
      success: true,
      resentCount: resendItems.length,
      deliveries: resendItems.map((item) => excludeKeys(item.delivery, ['accounts']))
    }
  }

  /**
   * Replace order products with new accounts
   */
  async replaceOrder(
    orderId: number,
    options: {
      reason?: string
      replaceAll?: boolean
      accountIds?: number[]
    } = {}
  ) {
    const { reason, replaceAll = true, accountIds } = options
    const order = await this.findById(orderId)

    // Validate order status
    if (order.deliveryStatus !== 'DELIVERED' && order.deliveryStatus !== 'FAILED') {
      throw new Error('Can only replace delivered or failed orders')
    }

    // Check canReplace flag
    if (!order.canReplace) {
      throw new Error('This order cannot be replaced. Please contact support.')
    }

    // Determine quantity to replace
    const quantityToReplace = replaceAll ? order.quantity : accountIds?.length || 0

    if (!replaceAll && (!accountIds || accountIds.length === 0)) {
      throw new Error('Must specify accountIds for partial replacement')
    }

    // Check stock availability
    const product = await db.product.findUnique({
      where: { id: order.productId },
      select: {
        stockCount: true,
        name: true,
        platform: true,
        _count: {
          select: {
            accounts: {
              where: {
                isUsed: false,
                isValid: true,
                archived: false
              }
            }
          }
        }
      }
    })

    if (!product) {
      throw new Error('Product not found')
    }

    const availableReplacementStock = product._count.accounts

    if (availableReplacementStock < quantityToReplace) {
      throw new Error(
        `Insufficient stock for replacement. Available: ${availableReplacementStock}, Needed: ${quantityToReplace}`
      )
    }

    // Start transaction
    const result = await db.$transaction(async (tx) => {
      // Get old accounts to mark as archived
      const oldAccounts = replaceAll
        ? await tx.account.findMany({
            where: { usedByOrderId: orderId }
          })
        : await tx.account.findMany({
            where: { id: { in: accountIds! } }
          })

      if (oldAccounts.length === 0) {
        throw new Error('No accounts found to replace')
      }

      // Mark old accounts as archived and invalid
      await tx.account.updateMany({
        where: { id: { in: oldAccounts.map((a) => a.id) } },
        data: {
          archived: true,
          isValid: false,
          meta: {
            replacedAt: new Date(),
            replacedForOrder: orderId,
            reason: reason || 'Admin replacement'
          }
        }
      })

      // Get new accounts from available pool
      const newAccounts = await tx.account.findMany({
        where: {
          productId: order.productId,
          platform: product.platform as any,
          isUsed: false,
          isValid: true,
          archived: false
        },
        take: quantityToReplace,
        orderBy: { createdAt: 'asc' }
      })

      if (newAccounts.length < quantityToReplace) {
        throw new Error(
          `Not enough valid accounts available. Found: ${newAccounts.length}, Needed: ${quantityToReplace}`
        )
      }

      // Mark new accounts as used
      const now = new Date()
      await tx.account.updateMany({
        where: { id: { in: newAccounts.map((a) => a.id) } },
        data: {
          isUsed: true,
          usedAt: now,
          usedByOrderId: orderId
        }
      })

      // Decrypt new accounts for delivery
      const decryptedAccounts = []
      for (const account of newAccounts) {
        try {
          const credentials = await this.decryptAccountCredentials(account)
          decryptedAccounts.push({
            accountId: account.id,
            platform: account.platform,
            ...credentials
          })
        } catch (error) {
          console.error(`Failed to decrypt account ${account.id}:`, error)
        }
      }

      // Create delivery record
      const delivery = await tx.delivery.create({
        data: {
          orderId,
          status: 'DELIVERED',
          accounts: decryptedAccounts,
          format: 'json',
          meta: {
            isReplacement: true,
            deliveryType: 'REPLACEMENT',
            replacementReason: reason || 'Admin replacement',
            replacedAt: now,
            productId: order.productId,
            productName: order.product.name
          },
          deliveredAt: now
        }
      })

      // Update product stock (decrement available stock, increment sold count for new accounts)
      await tx.product.update({
        where: { id: order.productId },
        data: {
          stockCount: { decrement: quantityToReplace },
          soldCount: { increment: quantityToReplace }
        }
      })

      // Update order meta with replacement history
      const replacementHistory = ((order.meta as any)?.replacementHistory || []) as any[]
      await tx.order.update({
        where: { id: orderId },
        data: {
          deliveryStatus: 'DELIVERED',
          deliveredAt: now,
          meta: {
            ...((order.meta as any) || {}),
            replacementHistory: [
              ...replacementHistory,
              {
                replacedAt: now,
                deliveryId: delivery.id,
                oldAccountIds: oldAccounts.map((a) => a.id),
                newAccountIds: newAccounts.map((a) => a.id),
                reason: reason || 'Admin replacement',
                quantity: quantityToReplace,
                availableStockBeforeReplacement: availableReplacementStock
              }
            ]
          }
        }
      })

      return {
        oldAccounts,
        newAccounts,
        decryptedAccounts,
        delivery
      }
    })

    // Send email with new credentials
    const customerEmail = order.user?.email || order.guestEmail
    if (customerEmail) {
      await this.sendReplacementEmail(order, result.decryptedAccounts, customerEmail, reason)
    }

    return {
      success: true,
      oldAccounts: result.oldAccounts.length,
      newAccounts: result.newAccounts.length
    }
  }

  /**
   * Replace order with a completely different product
   */
  async replaceProductForOrder(orderId: number, newProductId: number, reason?: string, replacementQuantity?: number) {
    const order = await this.findById(orderId)

    // Validate order status
    if (order.deliveryStatus !== 'DELIVERED' && order.deliveryStatus !== 'FAILED') {
      throw new Error('Can only replace delivered or failed orders')
    }

    // Check canReplace flag
    if (!order.canReplace) {
      throw new Error('This order cannot be replaced. Please contact support.')
    }

    // Get new product details
    const newProduct = await db.product.findUnique({
      where: { id: newProductId },
      select: {
        id: true,
        name: true,
        platform: true,
        stockCount: true,
        price: true,
        category: true,
        _count: {
          select: {
            accounts: {
              where: {
                isUsed: false,
                isValid: true,
                archived: false
              }
            }
          }
        }
      }
    })

    if (!newProduct) {
      throw new Error('New product not found')
    }

    // Use provided quantity or fall back to original order quantity
    const quantityToReplace = replacementQuantity || order.quantity

    // Validate quantity
    if (quantityToReplace < 1) {
      throw new Error('Replacement quantity must be at least 1')
    }

    // Check stock availability for the new product
    const availableReplacementStock = newProduct._count.accounts

    if (availableReplacementStock < quantityToReplace) {
      throw new Error(
        `Insufficient stock for new product. Available: ${availableReplacementStock}, Needed: ${quantityToReplace}`
      )
    }

    // Start transaction
    const result = await db.$transaction(async (tx) => {
      // Mark old accounts as archived and invalid
      const oldAccounts = await tx.account.findMany({
        where: { usedByOrderId: orderId }
      })

      if (oldAccounts.length > 0) {
        await tx.account.updateMany({
          where: { id: { in: oldAccounts.map((a) => a.id) } },
          data: {
            archived: true,
            isValid: false,
            meta: {
              replacedAt: new Date(),
              replacedForOrder: orderId,
              replacedWithProduct: newProductId,
              reason: reason || 'Admin product replacement'
            }
          }
        })

        // Restore stock for old product
        await tx.product.update({
          where: { id: order.productId },
          data: {
            stockCount: { increment: oldAccounts.length }
          }
        })
      }

      // Get new accounts from the new product
      const newAccounts = await tx.account.findMany({
        where: {
          productId: newProductId,
          platform: newProduct.platform as any,
          isUsed: false,
          isValid: true,
          archived: false
        },
        take: quantityToReplace,
        orderBy: { createdAt: 'asc' }
      })

      if (newAccounts.length < quantityToReplace) {
        throw new Error(
          `Not enough valid accounts available for new product. Found: ${newAccounts.length}, Needed: ${quantityToReplace}`
        )
      }

      // Mark new accounts as used
      const now = new Date()
      await tx.account.updateMany({
        where: { id: { in: newAccounts.map((a) => a.id) } },
        data: {
          isUsed: true,
          usedAt: now,
          usedByOrderId: orderId
        }
      })

      // Decrypt new accounts for delivery
      const decryptedAccounts = []
      for (const account of newAccounts) {
        try {
          const credentials = await this.decryptAccountCredentials(account)
          decryptedAccounts.push({
            accountId: account.id,
            platform: account.platform,
            ...credentials
          })
        } catch (error) {
          console.error(`Failed to decrypt account ${account.id}:`, error)
        }
      }

      // Create delivery record
      const delivery = await tx.delivery.create({
        data: {
          orderId,
          status: 'DELIVERED',
          accounts: decryptedAccounts,
          format: 'json',
          meta: {
            isReplacement: true,
            deliveryType: 'REPLACEMENT',
            replacementReason: reason || 'Admin product replacement',
            replacedAt: now,
            oldProductId: order.productId,
            oldProductName: order.product.name,
            newProductId,
            newProductName: newProduct.name
          },
          deliveredAt: now
        }
      })

      // Update product stock for new product
      await tx.product.update({
        where: { id: newProductId },
        data: {
          stockCount: { decrement: quantityToReplace }
        }
      })

      // Update order with new product and replacement history
      const replacementHistory = ((order.meta as any)?.replacementHistory || []) as any[]
      await tx.order.update({
        where: { id: orderId },
        data: {
          productId: newProductId,
          quantity: quantityToReplace, // Update order quantity if different
          deliveryStatus: 'DELIVERED',
          deliveredAt: now,
          meta: {
            ...((order.meta as any) || {}),
            replacementHistory: [
              ...replacementHistory,
              {
                replacedAt: now,
                deliveryId: delivery.id,
                oldProductId: order.productId,
                oldProductName: order.product.name,
                oldQuantity: order.quantity,
                newProductId: newProductId,
                newQuantity: quantityToReplace,
                newProductName: newProduct.name,
                oldAccountIds: oldAccounts.map((a) => a.id),
                newAccountIds: newAccounts.map((a) => a.id),
                reason: reason || 'Admin product replacement',
                availableStockBeforeReplacement: availableReplacementStock
              }
            ]
          }
        }
      })

      return {
        oldAccounts,
        newAccounts,
        decryptedAccounts,
        delivery,
        newProduct
      }
    })

    // Send email with new credentials
    const customerEmail = order.user?.email || order.guestEmail
    if (customerEmail) {
      await this.sendProductReplacementEmail(
        order,
        result.newProduct,
        result.decryptedAccounts,
        customerEmail,
        reason
      )
    }

    return {
      success: true,
      message: `Order product replaced from "${order.product.name}" to "${result.newProduct.name}"`,
      oldProduct: {
        id: order.productId,
        name: order.product.name,
        accountsReplaced: result.oldAccounts.length
      },
      newProduct: {
        id: result.newProduct.id,
        name: result.newProduct.name,
        accountsDelivered: result.newAccounts.length
      }
    }
  }

  /**
   * Get delivery history for an order
   */
  async getOrderDeliveryHistory(orderId: number) {
    const deliveries = await db.delivery.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' }
    })

    const order = await db.order.findUnique({
      where: { id: orderId },
      select: { meta: true }
    })

    const meta = (order?.meta as any) || {}

    return {
      deliveries,
      resendHistory: meta.resendHistory || [],
      replacementHistory: meta.replacementHistory || [],
      statusHistory: meta.statusHistory || [],
      deliveryStatusHistory: meta.deliveryStatusHistory || []
    }
  }

  /**
   * Send email for resent products
   */
  private async getResendTargetOrders(
    orderId: number,
    options: { selectedOrderIds?: number[]; resendAll?: boolean }
  ) {
    const baseOrder = await db.order.findUnique({
      where: { id: orderId },
      include: {
        product: { select: { id: true, name: true, sku: true, platform: true, type: true } },
        user: { select: { id: true, email: true, firstName: true } },
        telegramTransfer: true
      }
    })

    if (!baseOrder) throw new Error('Order not found')

    const childOrderIds = Array.isArray((baseOrder.meta as any)?.multiItemOrder?.childOrderIds)
      ? ((baseOrder.meta as any).multiItemOrder.childOrderIds as any[])
          .map((value) => Number(value))
          .filter((value) => Number.isInteger(value) && value > 0)
      : []

    if (childOrderIds.length === 0) return [baseOrder]

    const selectedIds =
      options.resendAll || !Array.isArray(options.selectedOrderIds) || options.selectedOrderIds.length === 0
        ? childOrderIds
        : options.selectedOrderIds
            .map((value) => Number(value))
            .filter((value) => childOrderIds.includes(value))

    if (selectedIds.length === 0) return []

    return await db.order.findMany({
      where: {
        id: { in: selectedIds }
      },
      include: {
        product: { select: { id: true, name: true, sku: true, platform: true, type: true } },
        user: { select: { id: true, email: true, firstName: true } },
        telegramTransfer: true
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }]
    })
  }

  private normalizeResendAccounts(accounts: unknown) {
    const rawAccounts = Array.isArray(accounts) ? accounts : accounts ? [accounts] : []

    return rawAccounts
      .map((entry: any, index: number) => {
        const credentials = entry?.credentials || entry || {}
        return {
          id: entry?.id || index + 1,
          username: entry?.username || credentials?.username || '',
          email: entry?.email || credentials?.email || '',
          phone: entry?.phone || entry?.phoneNumber || credentials?.phone || credentials?.phoneNumber || '',
          password: entry?.password || entry?.meta?.password || credentials?.password || '',
          twoFactorSecret: entry?.twoFactorSecret || credentials?.twoFactorSecret || '',
          backupCodes: entry?.backupCodes || credentials?.backupCodes || [],
          note: entry?.note || credentials?.note || '',
          hasPremium: Boolean(entry?.hasPremium ?? credentials?.hasPremium),
          fileUrl: entry?.fileUrl || credentials?.fileUrl || entry?.meta?.fileUrl || '',
          fileName: entry?.fileName || credentials?.fileName || entry?.meta?.fileName || ''
        }
      })
      .filter((account) => !account.fileUrl)
  }

  private getResendFiles(delivery: any) {
    const accountFiles = (Array.isArray(delivery.accounts) ? delivery.accounts : [])
      .map((entry: any, index: number) => ({
        name: entry?.fileName || entry?.meta?.fileName || `File ${index + 1}`,
        url: entry?.fileUrl || entry?.meta?.fileUrl || ''
      }))
      .filter((file: { url: string }) => file.url)
    const deliveryFile = delivery.fileUrl
      ? [
          {
            name: delivery.meta?.fileName || 'Delivered file',
            url: delivery.fileUrl
          }
        ]
      : []

    return [...accountFiles, ...deliveryFile].filter(
      (file, index, list) => list.findIndex((entry) => entry.url === file.url) === index
    )
  }

  private buildResendExport(items: any[], format: 'txt' | 'json' | 'csv') {
    if (format === 'json') {
      return JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          items: items.map((item) => ({
            orderNumber: item.order.orderNumber,
            product: item.order.product?.name,
            productType: item.order.product?.type,
            platform: item.order.product?.platform,
            quantity: item.order.quantity,
            accounts: item.accounts,
            files: item.files,
            transfer: item.order.telegramTransfer || null
          }))
        },
        null,
        2
      )
    }

    if (format === 'csv') {
      const csvValue = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`
      const rows = [
        [
          'Order Number',
          'Product',
          'Type',
          'Platform',
          'Item #',
          'Username',
          'Email',
          'Phone',
          'Password',
          '2FA',
          'File URL',
          'Status'
        ].map(csvValue).join(',')
      ]

      items.forEach((item) => {
        const maxRows = Math.max(item.accounts.length, item.files.length, 1)
        for (let index = 0; index < maxRows; index++) {
          const account = item.accounts[index] || {}
          const file = item.files[index] || {}
          rows.push(
            [
              item.order.orderNumber,
              item.order.product?.name,
              item.order.product?.type,
              item.order.product?.platform,
              index + 1,
              account.username,
              account.email,
              account.phone,
              account.password,
              account.twoFactorSecret || (account.backupCodes || []).join(' '),
              file.url,
              item.order.telegramTransfer?.status || item.order.deliveryStatus
            ].map(csvValue).join(',')
          )
        }
      })

      return rows.join('\n')
    }

    const lines: string[] = []
    items.forEach((item, itemIndex) => {
      lines.push(`${itemIndex + 1}. ${item.order.product?.name || 'Product'}`)
      lines.push(`Order: ${item.order.orderNumber}`)
      lines.push(`Type: ${item.order.product?.type || 'N/A'}`)
      lines.push(`Platform: ${item.order.product?.platform || 'N/A'}`)
      lines.push(`Quantity: ${item.order.quantity}`)
      lines.push(`Delivery Status: ${item.order.deliveryStatus}`)

      item.accounts.forEach((account: any, accountIndex: number) => {
        lines.push(`Account #${accountIndex + 1}`)
        if (account.username) lines.push(`Username: ${account.username}`)
        if (account.email) lines.push(`Email: ${account.email}`)
        if (account.phone) lines.push(`Phone: ${account.phone}`)
        if (account.password) lines.push(`Password: ${account.password}`)
        if (account.twoFactorSecret) lines.push(`2FA: ${account.twoFactorSecret}`)
        if ((account.backupCodes || []).length) lines.push(`Backup Codes: ${account.backupCodes.join(', ')}`)
        if (account.note) lines.push(`Note: ${account.note}`)
      })

      item.files.forEach((file: any, fileIndex: number) => {
        lines.push(`File #${fileIndex + 1}: ${file.name}`)
        lines.push(`Download: ${file.url}`)
      })

      if (item.order.telegramTransfer) {
        lines.push(`Transfer Status: ${item.order.telegramTransfer.status}`)
        if (item.order.telegramTransfer.targetUrl) lines.push(`Target URL: ${item.order.telegramTransfer.targetUrl}`)
      }

      if (['PREMIUM_1M', 'PREMIUM_3M', 'PREMIUM_6M', 'PREMIUM_12M'].includes(String(item.order.product?.type || ''))) {
        lines.push('Premium: delivered/activation status is available in your order dashboard.')
      }

      lines.push('')
    })

    return lines.join('\n')
  }

  private async sendResendEmail(order: any, items: any[], customerEmail: string, reason?: string) {
    const itemDetails = this.buildResendExport(items, 'txt')
    const emailText = `
Hello,

Your order #${order.orderNumber} products have been resent as requested.
${reason ? `\nReason: ${reason}` : ''}

Resent Items:
${items.map((item, index) => `${index + 1}. ${item.order.product?.name || 'Product'} (${item.order.orderNumber})`).join('\n')}

Item Details:
${itemDetails}

If you have any issues, please contact support.

Best regards,
UHQ Accounts Team
    `.trim()

    const customerName = order.user?.firstName || order.customerName || 'Customer'
    const itemHtml = items
      .map((item, itemIndex) => {
        const rows: Array<{ label: string; value: string }> = [
          { label: 'Order Number', value: item.order.orderNumber },
          { label: 'Product', value: item.order.product?.name || 'N/A' },
          { label: 'Type', value: item.order.product?.type || 'N/A' },
          { label: 'Quantity', value: String(item.order.quantity) },
          { label: 'Delivery Status', value: item.order.deliveryStatus }
        ]

        let html = `<h3 style="font-size:16px;margin:18px 0 8px;">${itemIndex + 1}. ${escapeHtml(item.order.product?.name || 'Product')}</h3>`
        html += keyValueTable(rows)

        if (item.accounts.length > 0) {
          html += `<p style="margin:12px 0 6px;font-size:14px;font-weight:600;">Accounts</p>`
          item.accounts.forEach((acc: any, index: number) => {
            const accountRows: Array<{ label: string; value: string }> = []
            if (acc.username) accountRows.push({ label: 'Username', value: acc.username })
            if (acc.email) accountRows.push({ label: 'Email', value: acc.email })
            if (acc.password) accountRows.push({ label: 'Password', value: acc.password })
            if (acc.phone) accountRows.push({ label: 'Phone', value: acc.phone })
            if (acc.twoFactorSecret) accountRows.push({ label: '2FA', value: acc.twoFactorSecret })
            if (accountRows.length) {
              html += `<p style="margin:8px 0 4px;font-size:13px;font-weight:600;">Account #${index + 1}</p>`
              html += keyValueTable(accountRows)
            }
          })
        }

        if (item.files.length > 0) {
          html += `<p style="margin:12px 0 6px;font-size:14px;font-weight:600;">File Links</p>`
          html += item.files
            .map(
              (file: any) =>
                `<p style="margin:6px 0;"><a href="${escapeHtml(file.url)}">${escapeHtml(file.name)} - Download</a></p>`
            )
            .join('')
        }

        if (item.order.telegramTransfer) {
          html += keyValueTable([
            { label: 'Transfer Status', value: item.order.telegramTransfer.status || 'N/A' },
            { label: 'Target URL', value: item.order.telegramTransfer.targetUrl || 'N/A' }
          ])
        }

        return html
      })
      .join('')
    const attachments = [
      {
        filename: `order-${order.orderNumber}-resent-items.txt`,
        content: this.buildResendExport(items, 'txt'),
        contentType: 'text/plain'
      },
      {
        filename: `order-${order.orderNumber}-resent-items.json`,
        content: this.buildResendExport(items, 'json'),
        contentType: 'application/json'
      },
      {
        filename: `order-${order.orderNumber}-resent-items.csv`,
        content: this.buildResendExport(items, 'csv'),
        contentType: 'text/csv'
      }
    ]
    const contentHtml = [
      sectionGreeting(customerName),
      paragraph('Your order products have been resent as requested.', 'font-weight:600;'),
      reason ? paragraph(`Reason: ${reason}`) : '',
      sectionHeading('Order Details'),
      keyValueTable([
        { label: 'Order Number', value: order.orderNumber },
        { label: 'Resent Items', value: String(items.length) }
      ]),
      sectionHeading('Resent Item Details'),
      rawHtml(itemHtml),
      infoBox(
        bulletList([
          'TXT, JSON, and CSV files are attached to this email.',
          'File products also include direct download links above.',
          'You can still open your dashboard for the latest order delivery details.'
        ]),
        'info'
      ),
      paragraph('If you have any issues, please contact support.'),
      ctaButton('View My Orders', `${FRONTEND_URL}/user/purchased-items`),
      signOff()
    ].join('')
    const emailHtml = wrapOrderEmailHtml('Order Products Resent - ' + order.orderNumber, contentHtml)
    await sendEmail(
      customerEmail,
      emailText,
      `Order Products Resent - ${order.orderNumber}`,
      emailHtml,
      attachments
    )
  }

  /**
   * Send email for replacement products
   */
  private async sendReplacementEmail(
    order: any,
    accounts: any[],
    customerEmail: string,
    reason?: string
  ) {
    const accountDetails = Array.isArray(accounts)
      ? accounts
          .map((acc, index) => {
            const details = [`Account #${index + 1}:`]
            if (acc.username) details.push(`Username: ${acc.username}`)
            if (acc.email) details.push(`Email: ${acc.email}`)
            if (acc.password) details.push(`Password: ${acc.password}`)
            if (acc.phone) details.push(`Phone: ${acc.phone}`)
            return details.join('\n')
          })
          .join('\n\n')
      : 'See attachment'

    const emailText = `
Hello,

Replacement delivered for order #${order.orderNumber}. Your products have been replaced with new accounts.

${reason ? `Reason: ${reason}\n` : ''}
Product: ${order.product.name}
Quantity: ${accounts.length}

New Account Details:
${accountDetails}

If you have any issues with the new accounts, please contact support.

Best regards,
UHQ Accounts Team
    `.trim()

    const customerName = order.user?.firstName || order.customerName || 'Customer'
    let credentialsHtml = ''
    if (Array.isArray(accounts)) {
      accounts.forEach((acc, index) => {
        const rows: Array<{ label: string; value: string }> = []
        if (acc.username) rows.push({ label: 'Username', value: acc.username })
        if (acc.email) rows.push({ label: 'Email', value: acc.email })
        if (acc.password) rows.push({ label: 'Password', value: acc.password })
        if (acc.phone) rows.push({ label: 'Phone', value: acc.phone })
        if (rows.length) {
          credentialsHtml += `<p style="margin:8px 0 4px;font-size:14px;font-weight:600;">Account #${index + 1}</p>`
          credentialsHtml += keyValueTable(rows)
        }
      })
    } else {
      credentialsHtml = paragraph('See attachment for details.')
    }
    const contentParts = [
      sectionGreeting(customerName),
      paragraph('Replacement delivered. Your order products have been replaced with new accounts.', 'font-weight:600;'),
      sectionHeading('Order Details'),
      keyValueTable([
        { label: 'Order Number', value: order.orderNumber },
        { label: 'Product', value: order.product?.name || 'N/A' },
        { label: 'Quantity', value: String(accounts.length) }
      ])
    ]
    if (reason) contentParts.push(paragraph('Reason: ' + reason))
    contentParts.push(
      sectionHeading('New Account Details'),
      rawHtml(credentialsHtml),
      paragraph('If you have any issues with the new accounts, please contact support.'),
      ctaButton('View My Orders', `${FRONTEND_URL}/user/purchased-items`),
      signOff()
    )
    const emailHtml = wrapOrderEmailHtml('Replacement Products - ' + order.orderNumber, contentParts.join(''))
    await sendEmail(
      customerEmail,
      emailText,
      `Replacement Delivered - ${order.orderNumber}`,
      emailHtml
    )
  }

  /**
   * Send email for product replacement (different product)
   */
  private async sendProductReplacementEmail(
    order: any,
    newProduct: any,
    accounts: any[],
    customerEmail: string,
    reason?: string
  ) {
    const accountDetails = Array.isArray(accounts)
      ? accounts
          .map((acc, index) => {
            const details = [`Account #${index + 1}:`]
            if (acc.username) details.push(`Username: ${acc.username}`)
            if (acc.email) details.push(`Email: ${acc.email}`)
            if (acc.password) details.push(`Password: ${acc.password}`)
            if (acc.phone) details.push(`Phone: ${acc.phone}`)
            return details.join('\n')
          })
          .join('\n\n')
      : 'See attachment'

    const emailText = `
Hello,

Replacement delivered for order #${order.orderNumber}. Your order has been replaced with a different product.

${reason ? `Reason: ${reason}\n` : ''}
Original Product: ${order.product.name}
New Product: ${newProduct.name}
Quantity: ${accounts.length}

New Account Details:
${accountDetails}

If you have any questions or issues, please contact our support team.

Best regards,
UHQ Accounts Team
    `.trim()

    const customerName = order.user?.firstName || order.customerName || 'Customer'
    let credentialsHtml = ''
    if (Array.isArray(accounts)) {
      accounts.forEach((acc, index) => {
        const rows: Array<{ label: string; value: string }> = []
        if (acc.username) rows.push({ label: 'Username', value: acc.username })
        if (acc.email) rows.push({ label: 'Email', value: acc.email })
        if (acc.password) rows.push({ label: 'Password', value: acc.password })
        if (acc.phone) rows.push({ label: 'Phone', value: acc.phone })
        if (rows.length) {
          credentialsHtml += `<p style="margin:8px 0 4px;font-size:14px;font-weight:600;">Account #${index + 1}</p>`
          credentialsHtml += keyValueTable(rows)
        }
      })
    } else {
      credentialsHtml = paragraph('See attachment for details.')
    }
    const contentParts = [
      sectionGreeting(customerName),
      paragraph('Replacement delivered. Your order has been replaced with a different product.', 'font-weight:600;'),
      sectionHeading('Order Details'),
      keyValueTable([
        { label: 'Order Number', value: order.orderNumber },
        { label: 'Original Product', value: order.product?.name || 'N/A' },
        { label: 'New Product', value: newProduct?.name || 'N/A' },
        { label: 'Quantity', value: String(accounts.length) }
      ])
    ]
    if (reason) contentParts.push(paragraph('Reason: ' + reason))
    contentParts.push(
      sectionHeading('New Account Details'),
      rawHtml(credentialsHtml),
      paragraph('If you have any questions or issues, please contact our support team.'),
      ctaButton('View My Orders', `${FRONTEND_URL}/user/purchased-items`),
      signOff()
    )
    const emailHtml = wrapOrderEmailHtml('Product Replacement - ' + order.orderNumber, contentParts.join(''))
    await sendEmail(
      customerEmail,
      emailText,
      `Replacement Delivered - ${order.orderNumber}`,
      emailHtml
    )
  }

  /**
   * Auto-link premium orders to delivered Telegram accounts
   * Finds premium orders in the same cart group and activates premium for delivered accounts
   */
  private async autoLinkPremiumOrders(order: any, deliveredAccounts: any[]) {
    try {
      const orderMeta = order.meta as any
      const cartGroup = orderMeta?.cartGroup

      if (!cartGroup?.groupNumber) {
        // Not part of a cart group, skip
        return
      }

      // Find premium orders in the same cart group
      const premiumOrders = await db.order.findMany({
        where: {
          meta: {
            path: ['cartGroup', 'groupNumber'],
            equals: cartGroup.groupNumber
          },
          product: {
            type: {
              in: ['PREMIUM_1M', 'PREMIUM_3M', 'PREMIUM_6M', 'PREMIUM_12M']
            }
          },
          status: 'COMPLETED'
        },
        include: {
          product: true
        },
        orderBy: {
          createdAt: 'asc'
        }
      })

      if (premiumOrders.length === 0) {
        return
      }

      // Extract phone numbers from delivered accounts
      const deliveryTargets = deliveredAccounts
        .map((acc) => acc.phone || acc.phoneNumber || acc.username || acc.email || '')
        .filter(Boolean)

      if (deliveryTargets.length === 0) {
        console.log('[OrderService] No delivery targets found in delivered accounts for premium linking')
        return
      }

      const remainingTargets = [...deliveryTargets]

      // Process each premium order
      for (const premiumOrder of premiumOrders) {
        const premiumMeta = premiumOrder.meta as any
        
        // Skip standalone premium orders or already-linked premium orders
        if (premiumMeta?.telegramUsername || (Array.isArray(premiumMeta?.premiumTargets) && premiumMeta.premiumTargets.length > 0)) {
          continue
        }

        const quantityToLink = Math.max(1, Number(premiumOrder.quantity || 1))
        const assignedTargets = remainingTargets.splice(0, quantityToLink)

        if (assignedTargets.length === 0) {
          continue
        }

        const updatedMeta = {
          ...premiumMeta,
          premiumTargets: assignedTargets,
          linkedAccounts: assignedTargets,
          autoLinked: true,
          linkedAt: new Date().toISOString()
        }

        await db.order.update({
          where: { id: premiumOrder.id },
          data: {
            meta: updatedMeta
          }
        })

        console.log('[OrderService] Premium order auto-linked to Telegram accounts', {
          premiumOrderId: premiumOrder.id,
          accountCount: assignedTargets.length,
          targets: assignedTargets.slice(0, 3)
        })

        // Note: Premium activation will be handled by the payment service
        // when it processes premium orders after payment completion
      }
    } catch (error) {
      console.error('[OrderService] Failed to auto-link premium orders:', error)
      // Don't fail delivery if premium linking fails
    }
  }
}
