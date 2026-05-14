import type { NotificationType, UserRole } from '@prisma/client'
import db from '../configs/db'
import { PAGELIMIT } from '../validations/common/pagination.schema'
import type {
  GroupNotificationFilters,
  GroupNotificationTarget,
  SendGroupNotification
} from '../validations/zod/notification.schema'

type GroupNotificationRecipient = {
  id?: number
  email: string
  name: string | null
  country: string | null
  role: UserRole | 'GUEST'
  isGuest?: boolean
  totalSpent: number
  source: 'user' | 'guest-order'
}

const GROUP_NOTIFICATION_PURCHASED_STATUSES = ['COMPLETED', 'CONFIRMED']
const toNumber = (value: unknown): number => {
  if (value === null || value === undefined) return 0
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const normalizeEmail = (email: string): string => email.trim().toLowerCase()

const stripHtml = (html: string): string =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

export class NotificationService {
  // ================================
  // CORE NOTIFICATION OPERATIONS
  // ================================

  async create(data: {
    userId?: number | null
    type: NotificationType
    title: string
    message: string
    attachments?: string[]
    role?: UserRole
    meta?: any
  }) {
    const notification = await db.notification.create({
      data: {
        userId: data.userId ?? null,
        type: data.type,
        title: data.title,
        message: data.message,
        attachments: data.attachments || [],
        role: data.role || 'CUSTOMER',
        meta: data.meta
      }
    })

    return notification
  }

  async getGroupNotificationStats() {
    const [users, completedOrders, categories] = await Promise.all([
      db.user.findMany({
        where: {
          email: { not: '' },
          isActive: true,
          isBanned: false
        },
        select: {
          id: true,
          email: true,
          role: true,
          country: true,
          isGuest: true,
          totalSpent: true
        }
      }),
      db.order.findMany({
        where: {
          status: { in: GROUP_NOTIFICATION_PURCHASED_STATUSES as any },
          OR: [{ userId: { not: null } }, { guestEmail: { not: null } }]
        },
        select: {
          userId: true,
          guestEmail: true
        }
      }),
      db.category.findMany({
        where: { isActive: true },
        select: { id: true, name: true, slug: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
      })
    ])

    const purchasedUserIds = new Set<number>()
    const guestEmails = new Set<string>()

    completedOrders.forEach((order) => {
      if (order.userId) purchasedUserIds.add(order.userId)
      if (order.guestEmail) guestEmails.add(normalizeEmail(order.guestEmail))
    })

    const activeUsers = users.filter((user) => Boolean(user.email))
    const loggedInUsers = activeUsers.filter((user) => !user.isGuest && user.role !== 'GUEST')
    const purchasedUsers = activeUsers.filter(
      (user) => toNumber(user.totalSpent) > 0 || purchasedUserIds.has(user.id)
    )
    const guestUserEmails = new Set(
      activeUsers
        .filter((user) => user.isGuest || user.role === 'GUEST')
        .map((user) => normalizeEmail(user.email))
    )
    guestEmails.forEach((email) => guestUserEmails.add(email))

    const countries = Array.from(
      new Set(
        activeUsers
          .map((user) => user.country?.trim())
          .filter((country): country is string => Boolean(country))
      )
    ).sort((a, b) => a.localeCompare(b))

    const roles = Array.from(new Set(activeUsers.map((user) => user.role))).sort()

    return {
      totalUsers: activeUsers.length,
      guestUsers: guestUserEmails.size,
      loggedInUsers: loggedInUsers.length,
      purchasedUsers: purchasedUsers.length,
      loggedInNoPurchase: loggedInUsers.filter(
        (user) => toNumber(user.totalSpent) <= 0 && !purchasedUserIds.has(user.id)
      ).length,
      countries,
      roles,
      categories
    }
  }

  async previewGroupNotificationRecipients(
    targetUsers: GroupNotificationTarget,
    customFilters?: GroupNotificationFilters
  ) {
    const recipients = await this.resolveGroupNotificationRecipients(targetUsers, customFilters)

    return {
      users: recipients.slice(0, 100),
      total: recipients.length,
      showing: Math.min(recipients.length, 100),
      dashboardEligible: recipients.filter((recipient) => recipient.id).length,
      emailEligible: recipients.filter((recipient) => recipient.email).length
    }
  }

  async sendGroupNotification(data: SendGroupNotification) {
    const recipients = await this.resolveGroupNotificationRecipients(
      data.targetUsers,
      data.customFilters
    )

    if (recipients.length === 0) {
      throw new Error('No users found matching the selected filters')
    }

    const dashboardRecipients = recipients.filter((recipient) => recipient.id)
    const plainMessage = stripHtml(data.message)

    let dashboardCreated = 0

    if (dashboardRecipients.length === 0) {
      throw new Error('No registered users found for dashboard notification delivery')
    }

    const uniqueUserIds = Array.from(new Set(dashboardRecipients.map((recipient) => recipient.id!)))

    await db.notification.createMany({
      data: uniqueUserIds.map((userId) => ({
        userId,
        type: data.type,
        title: data.title,
        message: plainMessage,
        role: 'CUSTOMER' as UserRole,
        meta: {
          targetUsers: data.targetUsers,
          customFilters: data.customFilters,
          delivery: { dashboard: true, email: false },
          createdVia: 'group_notification'
        }
      }))
    })

    dashboardCreated = uniqueUserIds.length

    await this.create({
      userId: null,
      type: data.type,
      title: `Group Notification Sent: ${data.title}`,
      message: `Sent dashboard notification to ${dashboardCreated} registered user(s) from ${recipients.length} matched recipient(s).`,
      role: 'ADMIN',
      meta: {
        targetUsers: data.targetUsers,
        customFilters: data.customFilters,
        delivery: { dashboard: true, email: false },
        dashboardCreated,
        totalRecipients: recipients.length,
        createdVia: 'group_notification_admin_summary'
      }
    })

    return {
      totalRecipients: recipients.length,
      dashboardCreated,
      delivery: { dashboard: true, email: false },
      recipients: recipients.map((recipient) => ({
        id: recipient.id,
        email: recipient.email,
        name: recipient.name,
        country: recipient.country,
        role: recipient.role,
        totalSpent: recipient.totalSpent,
        source: recipient.source
      }))
    }
  }

  private async resolveGroupNotificationRecipients(
    targetUsers: GroupNotificationTarget,
    customFilters?: GroupNotificationFilters
  ): Promise<GroupNotificationRecipient[]> {
    const categoryIds = customFilters?.categoryIds ?? []
    const hasCategoryFilter = categoryIds.length > 0

    const [users, completedOrders] = await Promise.all([
      db.user.findMany({
        where: {
          email: { not: '' },
          isActive: true,
          isBanned: false
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          country: true,
          role: true,
          isGuest: true,
          totalSpent: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      db.order.findMany({
        where: {
          status: { in: GROUP_NOTIFICATION_PURCHASED_STATUSES as any },
          OR: [{ userId: { not: null } }, { guestEmail: { not: null } }],
          ...(hasCategoryFilter
            ? {
                product: {
                  categoryId: { in: categoryIds }
                }
              }
            : {})
        },
        select: {
          userId: true,
          guestEmail: true,
          customerName: true,
          total: true
        }
      })
    ])

    const purchasedUserIds = new Set<number>()
    const guestSpendByEmail = new Map<string, { total: number; name: string | null }>()
    const userSpendById = new Map<number, number>()

    completedOrders.forEach((order) => {
      if (order.userId) {
        purchasedUserIds.add(order.userId)
        userSpendById.set(order.userId, (userSpendById.get(order.userId) ?? 0) + toNumber(order.total))
      }

      if (order.guestEmail) {
        const email = normalizeEmail(order.guestEmail)
        const current = guestSpendByEmail.get(email) ?? { total: 0, name: null }
        guestSpendByEmail.set(email, {
          total: current.total + toNumber(order.total),
          name: current.name ?? order.customerName ?? null
        })
      }
    })

    const userRecipients: GroupNotificationRecipient[] = users
      .filter((user) => Boolean(user.email))
      .map((user) => ({
        id: user.id,
        email: normalizeEmail(user.email),
        name: user.firstName,
        country: user.country,
        role: user.role,
        isGuest: user.isGuest,
        totalSpent: hasCategoryFilter
          ? userSpendById.get(user.id) ?? 0
          : Math.max(toNumber(user.totalSpent), userSpendById.get(user.id) ?? 0),
        source: 'user'
      }))

    const guestOrderRecipients: GroupNotificationRecipient[] = Array.from(guestSpendByEmail.entries()).map(
      ([email, value]) => ({
        email,
        name: value.name,
        country: null,
        role: 'GUEST',
        isGuest: true,
        totalSpent: value.total,
        source: 'guest-order'
      })
    )

    let recipients: GroupNotificationRecipient[] = []

    if (targetUsers === 'all') {
      recipients = hasCategoryFilter
        ? [
            ...userRecipients.filter((user) => user.id && purchasedUserIds.has(user.id)),
            ...guestOrderRecipients
          ]
        : userRecipients
    } else if (targetUsers === 'guest') {
      recipients = [
        ...userRecipients.filter((user) => user.role === 'GUEST' || user.isGuest),
        ...guestOrderRecipients
      ]
    } else if (targetUsers === 'loggedIn') {
      recipients = hasCategoryFilter
        ? userRecipients.filter(
            (user) => user.role !== 'GUEST' && !user.isGuest && user.id && purchasedUserIds.has(user.id)
          )
        : userRecipients.filter((user) => user.role !== 'GUEST' && !user.isGuest)
    } else if (targetUsers === 'purchased') {
      recipients = [
        ...userRecipients.filter((user) => user.id && purchasedUserIds.has(user.id)),
        ...guestOrderRecipients
      ]
    } else if (targetUsers === 'loggedInNoPurchase') {
      recipients = hasCategoryFilter
        ? []
        : userRecipients.filter(
            (user) => user.role !== 'GUEST' && !user.isGuest && !(user.id && purchasedUserIds.has(user.id))
          )
    }

    recipients = this.applyGroupNotificationFilters(recipients, customFilters)

    const uniqueRecipients = new Map<string, GroupNotificationRecipient>()
    recipients.forEach((recipient) => {
      if (!uniqueRecipients.has(recipient.email)) {
        uniqueRecipients.set(recipient.email, recipient)
      }
    })

    return Array.from(uniqueRecipients.values())
  }

  private applyGroupNotificationFilters(
    recipients: GroupNotificationRecipient[],
    customFilters?: GroupNotificationFilters
  ): GroupNotificationRecipient[] {
    if (!customFilters) return recipients

    let filtered = [...recipients]
    const countries = customFilters.countries?.filter((country) => country !== 'all') ?? []
    const roles = customFilters.roles ?? []

    if (countries.length > 0) {
      const countrySet = new Set(countries.map((country) => country.toLowerCase()))
      filtered = filtered.filter(
        (recipient) => recipient.country && countrySet.has(recipient.country.toLowerCase())
      )
    }

    if (roles.length > 0) {
      const roleSet = new Set(roles)
      filtered = filtered.filter((recipient) => roleSet.has(recipient.role as UserRole))
    }

    if (typeof customFilters.minSpent === 'number' && customFilters.minSpent > 0) {
      filtered = filtered.filter((recipient) => recipient.totalSpent >= customFilters.minSpent!)
    }

    return filtered
  }

  async findByUserId({
    userId,
    userRole,
    userCreatedAt,
    type,
    role,
    isRead,
    page = 1,
    limit = PAGELIMIT,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  }: {
    userId: number
    userRole: UserRole
    userCreatedAt: Date
    type?: NotificationType
    role?: UserRole
    isRead?: boolean
    page?: number
    limit?: number
    sortBy?: 'createdAt' | 'updatedAt' | 'type'
    sortOrder?: 'asc' | 'desc'
  }) {
    const skip = (page - 1) * limit

    // The `role` query param should only narrow the BROADCAST branch.
    // Personal notifications are always included regardless of their stored `role` field.
    const broadcastWhere: any = {
      userId: null,
      role: role ?? userRole, // Use the requested role filter for broadcasts; fall back to user's role
      createdAt: { gte: userCreatedAt }
    }

    // Base WHERE: personal notifications OR broadcasts to the user's role
    const baseWhere: any = {
      OR: [
        { userId }, // All personal notifications for this user (no role restriction)
        broadcastWhere
      ]
    }

    // Apply type filter (affects both personal and broadcast)
    if (type) baseWhere.type = type

    // Build main query WHERE with DB-level isRead filter via the junction table
    const mainWhere: any = { ...baseWhere }
    if (isRead === true) {
      // Only notifications already read by this user
      mainWhere.readStatus = { some: { userId } }
    } else if (isRead === false) {
      // Only notifications NOT yet read by this user
      mainWhere.readStatus = { none: { userId } }
    }

    // Unread count always uses the base scope with a `none` filter (ignores the isRead param)
    const unreadWhere: any = { ...baseWhere, readStatus: { none: { userId } } }

    // Run count + paginated fetch + unread count in parallel for efficiency
    const [total, notifications, unreadCount] = await Promise.all([
      db.notification.count({ where: mainWhere }),
      db.notification.findMany({
        where: mainWhere,
        include: {
          readStatus: {
            where: { userId }, // Only THIS user's read status row
            select: { id: true, readAt: true }
          }
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit
      }),
      db.notification.count({ where: unreadWhere })
    ])

    // Transform: attach per-user `isRead` flag derived from the junction table
    const transformedNotifications = notifications.map((n) => ({
      id: n.id,
      userId: n.userId,
      title: n.title,
      message: stripHtml(n.message),
      attachments: n.attachments,
      role: n.role,
      type: n.type,
      isRead: (n.readStatus?.length ?? 0) > 0,
      meta: n.meta,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt
    }))

    return {
      notifications: transformedNotifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
        hasNext: page * limit < total,
        hasPrev: page > 1
      },
      unreadCount
    }
  }

  async markAsRead(id: number, userId: number) {
    // Get user to check role and createdAt for broadcast notifications
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true, createdAt: true }
    })

    if (!user) {
      throw new Error('User not found')
    }

    // Check if notification exists and user has access to it
    const notification = await db.notification.findFirst({
      where: {
        id,
        OR: [
          { userId }, // Personal notification
          {
            userId: null,
            role: user.role,
            createdAt: { gte: user.createdAt } // Only broadcast created after user signup
          } // Broadcast notification for user's role
        ]
      }
    })

    if (!notification) {
      throw new Error('Notification not found or access denied')
    }

    // Create read status record (upsert to handle duplicates)
    await db.notificationReadStatus.upsert({
      where: {
        notificationId_userId: {
          notificationId: id,
          userId
        }
      },
      create: {
        notificationId: id,
        userId
      },
      update: {
        readAt: new Date()
      }
    })

    // For backward compatibility: mark personal notifications as read
    if (notification.userId === userId) {
      await db.notification.update({
        where: { id },
        data: { isRead: true }
      })
    }

    return notification
  }

  async markAllAsRead(userId: number, userRole?: UserRole) {
    // Fetch all notifications for this user (personal + broadcast for their role)
    const notifications = await db.notification.findMany({
      where: {
        OR: [
          { userId }, // Personal notifications
          ...(userRole ? [{ userId: null, role: userRole }] : []) // Broadcast for user's role
        ]
      },
      select: { id: true, userId: true }
    })

    if (!notifications.length) {
      return { count: 0 }
    }

    // Prepare junction table records
    const readStatusRecords = notifications.map((n) => ({
      notificationId: n.id,
      userId
    }))

    // Bulk insert into junction table (skipDuplicates prevents errors)
    await db.notificationReadStatus.createMany({
      data: readStatusRecords,
      skipDuplicates: true
    })

    // Backward compatibility: Update isRead for personal notifications only
    const personalNotificationIds = notifications.filter((n) => n.userId !== null).map((n) => n.id)

    if (personalNotificationIds.length > 0) {
      await db.notification.updateMany({
        where: { id: { in: personalNotificationIds } },
        data: { isRead: true }
      })
    }

    return { count: notifications.length }
  }

  // ================================
  // GENERAL ORDER NOTIFICATIONS
  // ================================

  /**
   * Send notification for order completion
   */
  async sendOrderCompleted(data: { userId?: number; orderNumber: string; total: number }) {
    const { userId, orderNumber, total } = data

    const message = `Your order ${orderNumber} has been completed! Total: $${total}.`

    const notification = await this.create({
      userId,
      type: 'ORDER',
      title: `Order Completed - ${orderNumber}`,
      message,
      meta: {
        orderNumber,
        total
      }
    })

    return notification
  }

  // ================================
  // ADMIN NOTIFICATIONS
  // ================================

  /**
   * Send notification to all admins when a subscription is purchased
   */
  async notifyAdminsSubscriptionPurchase(data: {
    customerName: string
    customerEmail: string
    packageName: string
    amount: number
    subscriptionPaymentId: number
  }) {
    const { customerName, customerEmail, packageName, amount, subscriptionPaymentId } = data

    const message = `${customerName} (${customerEmail}) purchased "${packageName}" subscription package for $${amount}.`

    const notification = await this.create({
      userId: null, // Broadcast to all admins
      type: 'PAYMENT',
      title: '🎉 New Subscription Purchase',
      message,
      role: 'ADMIN',
      meta: {
        subscriptionPaymentId,
        customerEmail,
        packageName,
        amount
      }
    })

    return notification
  }

  /**
   * Send notification to all admins when a ticket is created
   */
  async notifyAdminsTicketCreated(data: {
    customerName: string
    customerEmail: string
    ticketNumber: string
    subject: string
    priority: string
    ticketId: number
  }) {
    const { customerName, customerEmail, ticketNumber, subject, priority, ticketId } = data

    const priorityEmoji = priority === 'URGENT' ? '🔥' : priority === 'HIGH' ? '⚠️' : '📝'
    const message = `${customerName} (${customerEmail}) opened a ${priority.toLowerCase()} priority ticket: "${subject}"`

    const notification = await this.create({
      userId: null, // Broadcast to all admins
      type: 'SYSTEM',
      title: `${priorityEmoji} New Support Ticket - ${ticketNumber}`,
      message,
      role: 'ADMIN',
      meta: {
        ticketId,
        ticketNumber,
        customerEmail,
        subject,
        priority
      }
    })

    return notification
  }

  /**
   * Send notification to all admins when a product is purchased
   */
  async notifyAdminsProductPurchase(data: {
    customerName: string
    customerEmail: string
    orderNumber: string
    productName: string
    quantity: number
    total: number
    orderId: number
  }) {
    const { customerName, customerEmail, orderNumber, productName, quantity, total, orderId } = data

    const message = `${customerName} (${customerEmail}) purchased ${quantity}x "${productName}" for $${total}.`

    const notification = await this.create({
      userId: null, // Broadcast to all admins
      type: 'ORDER',
      title: `💰 New Order - ${orderNumber}`,
      message,
      role: 'ADMIN',
      meta: {
        orderId,
        orderNumber,
        customerEmail,
        productName,
        quantity,
        total
      }
    })

    return notification
  }

  /**
   * Send notification to all admins when a withdrawal request is created
   */
  async notifyAdminsWithdrawalRequest(data: {
    customerName: string
    customerEmail: string
    amount: number
    method: string
    currentBalance: number
    withdrawalId: number
  }) {
    const { customerName, customerEmail, amount, method, currentBalance, withdrawalId } = data

    const message = `${customerName} (${customerEmail}) requested withdrawal of $${amount.toFixed(2)} via ${method}. Current balance: $${currentBalance.toFixed(2)}`

    const notification = await this.create({
      userId: null, // Broadcast to all admins
      type: 'SYSTEM',
      title: '💸 New Withdrawal Request',
      message,
      role: 'ADMIN',
      meta: {
        withdrawalId,
        customerEmail,
        amount,
        method,
        currentBalance
      }
    })

    return notification
  }

  /**
   * Send notification to all admins when a subscription is renewed
   */
  async notifyAdminsSubscriptionRenewal(data: {
    customerName: string
    customerEmail: string
    packageName: string
    amount: number
    subscriptionPaymentId: number
    renewalType: 'auto' | 'manual'
  }) {
    const { customerName, customerEmail, packageName, amount, subscriptionPaymentId, renewalType } =
      data

    const renewalText = renewalType === 'auto' ? 'automatically' : 'manually'
    const message = `${customerName} (${customerEmail}) ${renewalText} renewed "${packageName}" subscription for $${amount}.`

    const notification = await this.create({
      userId: null, // Broadcast to all admins
      type: 'PAYMENT',
      title: '🔄 Subscription Renewed',
      message,
      role: 'ADMIN',
      meta: {
        subscriptionPaymentId,
        customerEmail,
        packageName,
        amount,
        renewalType
      }
    })

    return notification
  }

  /**
   * Send notification to all admins when a subscription is cancelled
   */
  async notifyAdminsSubscriptionCancellation(data: {
    customerName: string
    customerEmail: string
    packageName: string
    reason?: string
    subscriptionId: number
  }) {
    const { customerName, customerEmail, packageName, reason, subscriptionId } = data

    const reasonText = reason ? ` Reason: ${reason}` : ''
    const message = `${customerName} (${customerEmail}) cancelled their "${packageName}" subscription.${reasonText}`

    const notification = await this.create({
      userId: null, // Broadcast to all admins
      type: 'SYSTEM',
      title: '❌ Subscription Cancelled',
      message,
      role: 'ADMIN',
      meta: {
        subscriptionId,
        customerEmail,
        packageName,
        reason: reason || null
      }
    })

    return notification
  }

  // ================================
  // UTILITY METHODS
  // ================================

  /**
   * Clean up old notifications (older than specified days)
   * For personal notifications: Only delete if owner has marked as read (check junction table)
   * For broadcast notifications: Delete if older than cutoff, regardless of read status
   */
  async cleanupOldNotifications(olderThanDays: number = 30) {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

    // Get old notifications (both personal and broadcast)
    const oldNotifications = await db.notification.findMany({
      where: {
        createdAt: {
          lt: cutoffDate
        }
      },
      select: {
        id: true,
        userId: true,
        readStatus: true // Include junction table records
      }
    })

    // Separate personal and broadcast notifications
    const personalToDelete: number[] = []
    const broadcastToDelete: number[] = []

    for (const notification of oldNotifications) {
      if (notification.userId !== null) {
        // Personal notification: Only delete if owner has read it
        const hasRead = notification.readStatus.some((rs) => rs.userId === notification.userId)
        if (hasRead) {
          personalToDelete.push(notification.id)
        }
      } else {
        // Broadcast notification: Delete if old enough (no easy way to check if ALL users read)
        broadcastToDelete.push(notification.id)
      }
    }

    const idsToDelete = [...personalToDelete, ...broadcastToDelete]

    if (idsToDelete.length === 0) {
      return {
        deleted: 0,
        cutoffDate
      }
    }

    // Delete notifications (cascade will handle junction table cleanup)
    const result = await db.notification.deleteMany({
      where: {
        id: { in: idsToDelete }
      }
    })

    return {
      deleted: result.count,
      cutoffDate
    }
  }

  /**
   * Bulk mark notifications as read
   */
  async markMultipleAsRead(notificationIds: number[], userId: number) {
    if (!notificationIds.length) {
      return { count: 0 }
    }

    // Get user to check role and createdAt for broadcast notifications
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true, createdAt: true }
    })

    if (!user) {
      throw new Error('User not found')
    }

    // Validate notifications belong to user (personal) or are broadcast for user's role (created after user signup)
    const notifications = await db.notification.findMany({
      where: {
        id: { in: notificationIds },
        OR: [
          { userId }, // Personal notifications
          {
            userId: null,
            role: user.role,
            createdAt: { gte: user.createdAt } // Only broadcast created after user signup
          } // Broadcast for user's role
        ]
      },
      select: { id: true, userId: true }
    })

    if (!notifications.length) {
      return { count: 0 }
    }

    // Prepare junction table records
    const readStatusRecords = notifications.map((n) => ({
      notificationId: n.id,
      userId
    }))

    // Bulk insert into junction table (skipDuplicates prevents errors)
    await db.notificationReadStatus.createMany({
      data: readStatusRecords,
      skipDuplicates: true
    })

    // Backward compatibility: Update isRead for personal notifications only
    const personalNotificationIds = notifications.filter((n) => n.userId !== null).map((n) => n.id)

    if (personalNotificationIds.length > 0) {
      await db.notification.updateMany({
        where: { id: { in: personalNotificationIds } },
        data: { isRead: true }
      })
    }

    return { count: notifications.length }
  }

  /**
   * Delete a notification by ID
   * If userId is provided, only delete if it belongs to that user OR is a broadcast notification created after user signup (user isolation)
   * If userId is not provided, delete any notification (admin access)
   */
  async deleteById(id: number, userId?: number) {
    // If userId is provided (customer access), check access rights
    if (userId !== undefined) {
      // Get user to check createdAt for broadcast notifications
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { role: true, createdAt: true }
      })

      if (!user) {
        throw new Error('User not found')
      }

      // Check if notification exists and user has access to it
      const notification = await db.notification.findFirst({
        where: {
          id,
          OR: [
            { userId }, // Personal notifications
            {
              userId: null,
              role: user.role,
              createdAt: { gte: user.createdAt } // Only broadcast created after user signup
            } // Broadcast for user's role
          ]
        }
      })

      if (!notification) {
        throw new Error('Notification not found or access denied')
      }
    } else {
      // Admin access - verify notification exists
      const notification = await db.notification.findUnique({
        where: { id },
        select: { id: true }
      })

      if (!notification) {
        throw new Error('Notification not found')
      }
    }

    // Delete notification (cascade will handle junction table cleanup)
    const deleted = await db.notification.delete({
      where: { id }
    })

    return deleted
  }
}
