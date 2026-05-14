import type { Prisma, Ticket, TicketReply } from '@prisma/client'
import db from '../configs/db'
import type { Pagination } from '../types/req-res'
import { PAGELIMIT } from '../validations/common/pagination.schema'
import type {
  CreateTicket,
  TicketReply as CreateTicketReplyInput,
  TicketQuery,
  UpdateTicket,
  UpdateTicketReply
} from '../validations/zod/ticket.schema'
import { NotificationService } from './notification.service'
import { UserService } from './user.services'
import rankService from './rank.service'

export class TicketService {
  private notificationService = new NotificationService()
  private userService = new UserService()
  /**
   * Generate unique ticket number
   */
  private async generateTicketNumber(): Promise<string> {
    const year = new Date().getFullYear()
    const prefix = `TKT-${year}-`

    // Get the latest ticket number for this year
    const latestTicket = await db.ticket.findFirst({
      where: {
        ticketNumber: {
          startsWith: prefix
        }
      },
      orderBy: {
        ticketNumber: 'desc'
      }
    })

    let sequence = 1
    if (latestTicket) {
      const lastSequence = parseInt(latestTicket.ticketNumber.replace(prefix, ''))
      sequence = lastSequence + 1
    }

    return `${prefix}${sequence.toString().padStart(6, '0')}`
  }

  async createTicket(data: CreateTicket): Promise<Ticket> {
    try {
      const ticketNumber = await this.generateTicketNumber()
      const { userId, ...rest } = data

      const ticket = await db.ticket.create({
        data: {
          ...rest,
          ticketNumber,
          ...(userId != null && { user: { connect: { id: userId } } })
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true
            }
          }
        }
      })

      // Notify admins about the new ticket
      try {
        if (ticket.user) {
          await this.notificationService.notifyAdminsTicketCreated({
            customerName: ticket.user.firstName || ticket.user.email,
            customerEmail: ticket.user.email,
            ticketNumber: ticket.ticketNumber,
            subject: ticket.subject,
            priority: ticket.priority,
            ticketId: ticket.id
          })
          console.log('[Ticket] Admin notification sent for new ticket', {
            ticketId: ticket.id,
            ticketNumber: ticket.ticketNumber
          })
        }
      } catch (error) {
        console.error('[Ticket] Failed to send admin notification', {
          ticketId: ticket.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }

      return ticket
    } catch (error) {
      throw error
    }
  }

  async updateTicket(id: number, data: UpdateTicket): Promise<Ticket> {
    try {
      const existing = await db.ticket.findUnique({
        where: { id }
      })

      if (!existing) {
        throw new Error('Ticket not found')
      }

      // Handle resolvedAt timestamp
      const updateData: any = { ...data }
      if (data.status === 'RESOLVED' && !existing.resolvedAt) {
        updateData.resolvedAt = new Date()
      } else if (data.status !== 'RESOLVED' && existing.resolvedAt) {
        updateData.resolvedAt = null
      }

      const ticket = await db.ticket.update({
        where: { id },
        data: updateData
      })

      return ticket
    } catch (error) {
      throw error
    }
  }

  async deleteTicket(id: number): Promise<void> {
    try {
      const ticket = await db.ticket.findUnique({
        where: { id }
      })

      if (!ticket) {
        throw new Error('Ticket not found')
      }

      await db.ticket.delete({
        where: { id }
      })
    } catch (error) {
      throw error
    }
  }

  async getTicketById(id: number): Promise<Partial<Ticket> | null> {
    try {
      const ticket = await db.ticket.findUnique({
        where: { id },
        select: {
          subject: true,
          guestEmail: true,
          id: true,
          userId: true,
          ticketNumber: true,
          status: true,
          priority: true,
          createdAt: true,
          updatedAt: true,
          assignedTo: true,
          description: true,
          attachments: true,
          meta: true,
          replies: {
            select: {
              id: true,
              content: true,
              createdAt: true,
              attachments: true,
              authorName: true,
              isStaff: true
            }
          },
          user: {
            select: {
              id: true,
              email: true,
              firstName: true
            }
          }
        }
      })

      return ticket
    } catch (error) {
      throw error
    }
  }

  async getTicketByNumber(ticketNumber: string): Promise<Partial<Ticket> | null> {
    try {
      const ticket = await db.ticket.findUnique({
        where: { ticketNumber },
        select: {
          id: true,
          description: true,
          subject: true,
          attachments: true,
          createdAt: true,
          updatedAt: true,
          ticketNumber: true,
          priority: true,
          resolvedAt: true,
          status: true,
          guestEmail: true,
          meta: true,
          userId: true,
          user: {
            select: {
              email: true,
              firstName: true,
              username: true,
              phone: true,
              telegramUsername: true
            }
          },
          replies: {
            select: {
              authorName: true,
              content: true,
              attachments: true,
              isStaff: true,
              createdAt: true,
              id: true,
              updatedAt: true,
              ticketId: true
            },
            orderBy: {
              createdAt: 'asc'
            }
          }
        }
      })

      return ticket
    } catch (error) {
      throw error
    }
  }

  async getTickets(query: Partial<TicketQuery> = {}): Promise<{
    tickets: Partial<Ticket>[]
    pagination: Pagination
  }> {
    try {
      const {
        search,
        status,
        priority,
        assignedTo,
        userId,
        page = 1,
        limit = PAGELIMIT,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = query

      const where: Prisma.TicketWhereInput = {}

      if (search) {
        const searchConditions: Prisma.TicketWhereInput[] = [
          { ticketNumber: { contains: search, mode: 'insensitive' } },
          { subject: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { guestEmail: { contains: search, mode: 'insensitive' } },
          {
            user: {
              email: {
                contains: search,
                mode: 'insensitive'
              }
            }
          },
          {
            user: {
              firstName: {
                contains: search,
                mode: 'insensitive'
              }
            }
          }
        ]

        const matchedOrders = await db.order.findMany({
          where: {
            orderNumber: {
              contains: search,
              mode: 'insensitive'
            }
          },
          select: {
            userId: true,
            guestEmail: true
          },
          take: 100
        })

        const matchedUserIds = Array.from(
          new Set(
            matchedOrders
              .map((order) => order.userId)
              .filter((value): value is number => typeof value === 'number')
          )
        )

        const matchedGuestEmails = Array.from(
          new Set(
            matchedOrders
              .map((order) => order.guestEmail?.trim())
              .filter((value): value is string => Boolean(value))
          )
        )

        if (matchedUserIds.length > 0) {
          searchConditions.push({
            userId: {
              in: matchedUserIds
            }
          })
        }

        if (matchedGuestEmails.length > 0) {
          searchConditions.push({
            guestEmail: {
              in: matchedGuestEmails
            }
          })
        }

        where.OR = searchConditions
      }

      if (status) {
        where.status = status
      }

      if (priority) {
        where.priority = priority
      }

      if (assignedTo) {
        where.assignedTo = assignedTo
      }

      if (userId) {
        where.userId = userId
      }

      const skip = (page - 1) * limit

      const [tickets, total] = await Promise.all([
        db.ticket.findMany({
          where,
          select: {
            subject: true,
            guestEmail: true,
            id: true,
            ticketNumber: true,
            status: true,
            priority: true,
            createdAt: true,
            updatedAt: true,
            assignedTo: true,
            user: {
              select: {
                id: true,
                email: true,
                firstName: true
              }
            },
            _count: {
              select: {
                replies: true
              }
            }
          },
          orderBy: { [sortBy]: sortOrder },
          take: limit,
          skip
        }),
        db.ticket.count({ where })
      ])

      return {
        tickets,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      }
    } catch (error) {
      throw error
    }
  }

  async getUserTickets(
    userId: number,
    query: Partial<TicketQuery> = {}
  ): Promise<{
    tickets: Partial<Ticket>[]
    pagination: Pagination
  }> {
    try {
      const { page = 1, limit = PAGELIMIT, sortBy = 'createdAt', sortOrder = 'desc' } = query

      const where: Prisma.TicketWhereInput = {
        userId: userId
      }

      if (query.status) {
        where.status = query.status
      }

      if (query.priority) {
        where.priority = query.priority
      }

      const skip = (page - 1) * limit

      const [tickets, total] = await Promise.all([
        db.ticket.findMany({
          where,
          select: {
            id: true,
            ticketNumber: true,
            subject: true,
            status: true,
            priority: true,
            createdAt: true,
            updatedAt: true,
            meta: true,
            _count: {
              select: {
                replies: true
              }
            }
          },
          orderBy: { [sortBy]: sortOrder },
          take: limit,
          skip
        }),
        db.ticket.count({ where })
      ])

      return {
        tickets,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      }
    } catch (error) {
      throw error
    }
  }

  // ================================
  // TICKET REPLIES
  // ================================

  async createTicketReply(
    data: CreateTicketReplyInput & { authorId: number; authorName: string }
  ): Promise<TicketReply> {
    try {
      // Check if ticket exists
      const ticket = await db.ticket.findUnique({
        where: { id: data.ticketId },
        include: { user: true }
      })

      if (!ticket) {
        throw new Error('Ticket not found')
      }

      const reply = await db.ticketReply.create({
        data
      })

      // Optionally update ticket status if it was closed
      if (ticket.status === 'CLOSED' || ticket.status === 'RESOLVED') {
        await db.ticket.update({
          where: { id: data.ticketId },
          data: {
            status: 'IN_PROGRESS',
            resolvedAt: null
          }
        })
      }

      // Send email notification in background (do not block API response)
      void (async () => {
        try {
          const { sendTicketUpdateEmail } = await import('../utils/email-helpers')
          const customerEmail = ticket.user?.email || ticket.guestEmail

          if (customerEmail && data.isStaff) {
            // Staff replied - notify customer
            await sendTicketUpdateEmail(customerEmail, {
              ticketNumber: ticket.ticketNumber,
              ticketSubject: ticket.subject,
              updateMessage: data.content,
              userName: ticket.user?.firstName || ticket.user?.email || undefined,
              isStaffReply: true
            })
          }
          // Note: Customer replies don't send emails to staff (they can check dashboard)
        } catch (emailError) {
          console.error('[TicketService] Failed to send ticket update email:', emailError)
          // Don't throw - email failure shouldn't break ticket functionality
        }
      })()

      return reply
    } catch (error) {
      throw error
    }
  }

  async updateTicketReply(id: number, data: UpdateTicketReply): Promise<TicketReply> {
    try {
      const existing = await db.ticketReply.findUnique({
        where: { id }
      })

      if (!existing) {
        throw new Error('Ticket reply not found')
      }

      const reply = await db.ticketReply.update({
        where: { id },
        data
      })

      return reply
    } catch (error) {
      throw error
    }
  }

  async deleteTicketReply(id: number): Promise<void> {
    try {
      const reply = await db.ticketReply.findUnique({
        where: { id }
      })

      if (!reply) {
        throw new Error('Ticket reply not found')
      }

      await db.ticketReply.delete({
        where: { id }
      })
    } catch (error) {
      throw error
    }
  }

  async getTicketReplies(ticketId: number): Promise<Partial<TicketReply>[]> {
    try {
      const replies = await db.ticketReply.findMany({
        where: { ticketId },
        select: {
          authorName: true,
          content: true,
          attachments: true,
          isStaff: true,
          createdAt: true,
          id: true,
          updatedAt: true,
          ticketId: true
        },
        orderBy: { createdAt: 'asc' }
      })

      return replies
    } catch (error) {
      throw error
    }
  }

  // ================================
  // STATISTICS & ANALYTICS
  // ================================

  async getTicketStats(): Promise<{
    total: number
    open: number
    replied: number
    inProgress: number
    resolved: number
    closed: number
    byPriority: Record<string, number>
  }> {
    try {
      const [total, statusCounts, priorityCounts] = await Promise.all([
        db.ticket.count(),
        db.ticket.groupBy({
          by: ['status'],
          _count: true
        }),
        db.ticket.groupBy({
          by: ['priority'],
          _count: true
        })
      ])

      const statusStats = {
        open: 0,
        inProgress: 0,
        resolved: 0,
        closed: 0
      }

      statusCounts.forEach((item) => {
        switch (item.status) {
          case 'OPEN':
            statusStats.open = item._count
            break
          case 'IN_PROGRESS':
            statusStats.inProgress = item._count
            break
          case 'RESOLVED':
            statusStats.resolved = item._count
            break
          case 'CLOSED':
            statusStats.closed = item._count
            break
        }
      })

      const byPriority: Record<string, number> = {}
      priorityCounts.forEach((item) => {
        byPriority[item.priority] = item._count
      })

      return {
        total,
        replied: statusStats.inProgress,
        ...statusStats,
        byPriority
      }
    } catch (error) {
      throw error
    }
  }

  async getTicketCustomerProfile(ticketId: number) {
    const ticket = await db.ticket.findUnique({
      where: { id: ticketId },
      select: {
        id: true,
        ticketNumber: true,
        userId: true,
        guestEmail: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            phone: true,
            telegramUsername: true,
            photoUrl: true,
            isBanned: true,
            isVerified: true,
            balance: true,
            totalSpent: true,
            totalOrders: true
          }
        }
      }
    })

    if (!ticket) {
      throw new Error('Ticket not found')
    }

    const normalizedGuestEmail = ticket.guestEmail?.trim() || null
    const profileUser =
      typeof ticket.userId === 'number'
        ? await this.userService.findById(ticket.userId)
        : normalizedGuestEmail
          ? await db.user.findUnique({
              where: { email: normalizedGuestEmail },
              select: { id: true }
            }).then((user) => (user?.id ? this.userService.findById(user.id) : null))
          : null

    const orderWhere: Prisma.OrderWhereInput =
      typeof ticket.userId === 'number'
        ? { userId: ticket.userId }
        : normalizedGuestEmail
          ? { guestEmail: normalizedGuestEmail }
          : { id: -1 }

    const orders = await db.order.findMany({
      where: orderWhere,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        deliveryStatus: true,
        total: true,
        subtotal: true,
        discount: true,
        quantity: true,
        createdAt: true,
        guestEmail: true,
        customerName: true,
        customerPhone: true,
        product: {
          select: {
            id: true,
            name: true,
            platform: true,
            sku: true,
            type: true,
            thumbnail: true
          }
        },
        telegramTransfer: {
          select: {
            id: true,
            status: true,
            customerTelegram: true,
            targetUrl: true,
            joinVerified: true,
            transferCompletedAt: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50
    })

    const completedStatuses = new Set(['COMPLETED', 'PARTIAL'])
    const totalSpent = orders.reduce((sum, order) => {
      if (!completedStatuses.has(order.status)) return sum
      return sum + Number(order.total?.toString() || 0)
    }, 0)

    const computedRank = await rankService.getRankForUser(totalSpent)
    const displayName =
      profileUser?.firstName ||
      ticket.user?.firstName ||
      ticket.user?.email ||
      normalizedGuestEmail ||
      'Guest customer'

    const email = profileUser?.email || ticket.user?.email || normalizedGuestEmail
    const registeredUserId =
      typeof profileUser?.id === 'number' ? profileUser.id : typeof ticket.userId === 'number' ? ticket.userId : null

    return {
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      customer: {
        type: registeredUserId ? 'registered' : 'guest',
        id: registeredUserId,
        displayName,
        email,
        phone: profileUser?.phone || ticket.user?.phone || orders[0]?.customerPhone || null,
        telegramUsername:
          profileUser?.telegramUsername ||
          orders.find((order) => order.telegramTransfer?.customerTelegram)?.telegramTransfer
            ?.customerTelegram ||
          null,
        photoUrl: profileUser?.photoUrl || ticket.user?.photoUrl || null,
        isBanned: Boolean(profileUser?.isBanned || ticket.user?.isBanned),
        isVerified: Boolean(profileUser?.isVerified || ticket.user?.isVerified),
        balance: Number(profileUser?.balance || ticket.user?.balance || 0),
        totalOrders: orders.length,
        totalSpent,
        rank:
          profileUser?.rank ||
          computedRank?.name ||
          null,
        canManageFunds: Boolean(registeredUserId),
        canBan: Boolean(registeredUserId),
        canEmail: Boolean(email),
        canOpenCustomer: Boolean(email)
      },
      purchases: orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        deliveryStatus: order.deliveryStatus,
        total: Number(order.total?.toString() || 0),
        subtotal: Number(order.subtotal?.toString() || 0),
        discount: Number(order.discount?.toString() || 0),
        quantity: order.quantity,
        createdAt: order.createdAt,
        product: order.product,
        telegramTransfer: order.telegramTransfer
          ? {
              ...order.telegramTransfer,
              isTelegramProduct: true
            }
          : null
      }))
    }
  }
}
