import db from '../configs/db'
import { sendEmail } from '../libs/email'
import type { GroupEmailFilters, GroupEmailTarget } from '../validations/zod/email.schema'

type LegacyAudience = 'customer' | 'moderator' | 'admin'

type GroupEmailRecipient = {
  id?: number
  email: string
  name: string | null
  country: string | null
  role: string
  isGuest: boolean
  totalSpent: number
  source: 'user' | 'guest-order'
}

type AdvancedGroupEmailInput = {
  targetUsers: GroupEmailTarget
  subject: string
  body?: string
  html?: string
  customFilters?: GroupEmailFilters
}

const MAX_ADVANCED_RECIPIENTS = 50
const PURCHASED_ORDER_STATUSES = ['COMPLETED', 'CONFIRMED']

const toNumber = (value: unknown): number => {
  if (value === null || value === undefined) return 0
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const normalizeEmail = (email: string): string => email.trim().toLowerCase()

export class EmailService {
  /**
   * Send group email to specified legacy role audience.
   */
  async sendGroupEmail(audience: LegacyAudience, subject: string, body?: string, html?: string) {
    try {
      const whereClause: any = {
        isVerified: true,
        isBanned: false
      }

      if (audience === 'customer') {
        whereClause.role = 'CUSTOMER'
      } else if (audience === 'moderator') {
        whereClause.role = 'MODERATOR'
      } else if (audience === 'admin') {
        whereClause.role = 'ADMIN'
      }

      const users = await db.user.findMany({
        where: whereClause,
        select: {
          id: true,
          email: true,
          firstName: true
        }
      })

      if (users.length === 0) {
        throw new Error(`No ${audience}s found to send email`)
      }

      return this.dispatchEmails(
        users.map((user) => user.email),
        subject,
        body,
        html
      )
    } catch (error) {
      console.error('Error sending group email:', error)
      throw error
    }
  }

  async getGroupEmailStats() {
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
          role: true,
          country: true,
          isGuest: true,
          totalSpent: true
        }
      }),
      db.order.findMany({
        where: {
          status: { in: PURCHASED_ORDER_STATUSES as any },
          OR: [{ userId: { not: null } }, { guestEmail: { not: null } }]
        },
        select: {
          userId: true,
          guestEmail: true,
          total: true
        }
      })
    ])

    const purchasedUserIds = new Set<number>()
    const purchasedGuestEmails = new Set<string>()

    completedOrders.forEach((order) => {
      if (order.userId) purchasedUserIds.add(order.userId)
      if (order.guestEmail) purchasedGuestEmails.add(normalizeEmail(order.guestEmail))
    })

    const activeUsers = users.filter((user) => Boolean(user.email))
    const loggedInUsers = activeUsers.filter((user) => !user.isGuest)
    const guestUserEmails = new Set(
      activeUsers
        .filter((user) => user.isGuest || user.role === 'GUEST')
        .map((user) => normalizeEmail(user.email))
    )

    purchasedGuestEmails.forEach((email) => guestUserEmails.add(email))

    const purchasedUsers = activeUsers.filter(
      (user) => toNumber(user.totalSpent) > 0 || purchasedUserIds.has(user.id)
    )

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
      roles
    }
  }

  async previewGroupEmailRecipients(
    targetUsers: GroupEmailTarget,
    customFilters?: GroupEmailFilters
  ) {
    const recipients = await this.resolveRecipients(targetUsers, customFilters)

    return {
      users: recipients.slice(0, 100),
      total: recipients.length,
      showing: Math.min(recipients.length, 100)
    }
  }

  async sendAdvancedGroupEmail(input: AdvancedGroupEmailInput) {
    const recipients = await this.resolveRecipients(input.targetUsers, input.customFilters)

    if (recipients.length === 0) {
      throw new Error('No users found matching the selected filters')
    }

    if (recipients.length > MAX_ADVANCED_RECIPIENTS) {
      throw new Error(
        `Too many recipients selected (${recipients.length}). Please narrow filters to ${MAX_ADVANCED_RECIPIENTS} recipients or fewer.`
      )
    }

    const dispatchResult = await this.dispatchEmails(
      recipients.map((recipient) => recipient.email),
      input.subject,
      input.body,
      input.html
    )

    return {
      ...dispatchResult,
      targetUsers: input.targetUsers,
      recipients: recipients.map((recipient) => ({
        email: recipient.email,
        name: recipient.name,
        country: recipient.country,
        role: recipient.role,
        totalSpent: recipient.totalSpent,
        source: recipient.source
      }))
    }
  }

  private async resolveRecipients(
    targetUsers: GroupEmailTarget,
    customFilters?: GroupEmailFilters
  ): Promise<GroupEmailRecipient[]> {
    const [users, purchasedOrders] = await Promise.all([
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
          isVerified: true,
          totalSpent: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      db.order.findMany({
        where: {
          status: { in: PURCHASED_ORDER_STATUSES as any },
          OR: [{ userId: { not: null } }, { guestEmail: { not: null } }]
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

    purchasedOrders.forEach((order) => {
      if (order.userId) purchasedUserIds.add(order.userId)
      if (order.guestEmail) {
        const email = normalizeEmail(order.guestEmail)
        const current = guestSpendByEmail.get(email) ?? { total: 0, name: null }
        guestSpendByEmail.set(email, {
          total: current.total + toNumber(order.total),
          name: current.name ?? order.customerName ?? null
        })
      }
    })

    const userRecipients: GroupEmailRecipient[] = users
      .filter((user) => Boolean(user.email))
      .map((user) => ({
        id: user.id,
        email: normalizeEmail(user.email),
        name: user.firstName,
        country: user.country,
        role: user.role,
        isGuest: user.isGuest,
        totalSpent: toNumber(user.totalSpent),
        source: 'user'
      }))

    const guestOrderRecipients: GroupEmailRecipient[] = Array.from(guestSpendByEmail.entries()).map(
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

    let recipients: GroupEmailRecipient[] = []

    if (targetUsers === 'all') {
      recipients = userRecipients
    } else if (targetUsers === 'guest') {
      recipients = [
        ...userRecipients.filter((user) => user.role === 'GUEST' || user.isGuest),
        ...guestOrderRecipients
      ]
    } else if (targetUsers === 'loggedIn') {
      recipients = userRecipients.filter((user) => user.role !== 'GUEST' && !user.isGuest)
    } else if (targetUsers === 'purchased') {
      recipients = [
        ...userRecipients.filter(
          (user) => user.totalSpent > 0 || (user.id ? purchasedUserIds.has(user.id) : false)
        ),
        ...guestOrderRecipients
      ]
    } else if (targetUsers === 'loggedInNoPurchase') {
      recipients = userRecipients.filter(
        (user) =>
          user.role !== 'GUEST' &&
          !user.isGuest &&
          user.totalSpent <= 0 &&
          !(user.id ? purchasedUserIds.has(user.id) : false)
      )
    }

    recipients = this.applyRecipientFilters(recipients, customFilters)

    const uniqueRecipients = new Map<string, GroupEmailRecipient>()
    recipients.forEach((recipient) => {
      if (!uniqueRecipients.has(recipient.email)) {
        uniqueRecipients.set(recipient.email, recipient)
      }
    })

    return Array.from(uniqueRecipients.values())
  }

  private applyRecipientFilters(
    recipients: GroupEmailRecipient[],
    customFilters?: GroupEmailFilters
  ): GroupEmailRecipient[] {
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
      filtered = filtered.filter((recipient) => roleSet.has(recipient.role as any))
    }

    if (typeof customFilters.minSpent === 'number' && customFilters.minSpent > 0) {
      filtered = filtered.filter((recipient) => recipient.totalSpent >= customFilters.minSpent!)
    }

    return filtered
  }

  private async dispatchEmails(
    emails: string[],
    subject: string,
    body?: string,
    html?: string
  ) {
    const recipients = Array.from(new Set(emails.map(normalizeEmail).filter(Boolean)))

    if (recipients.length === 0) {
      throw new Error('No recipients found to send email')
    }

    const BATCH_SIZE = 50
    let successCount = 0
    let failedCount = 0
    const failedEmails: string[] = []

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE)

      const promises = batch.map(async (email) => {
        try {
          await sendEmail(email, body, subject, html)
          successCount++
        } catch (error) {
          failedCount++
          failedEmails.push(email)
          console.error(`Failed to send email to ${email}:`, error)
        }
      })

      await Promise.all(promises)

      if (i + BATCH_SIZE < recipients.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }

    return {
      success: true,
      totalRecipients: recipients.length,
      successCount,
      failedCount,
      failedEmails
    }
  }
}

export const emailService = new EmailService()
