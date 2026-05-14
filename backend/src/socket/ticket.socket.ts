import type { Server as HttpServer } from 'http'
import { Server } from 'socket.io'
import { AdminService } from '../services/admin.services'
import { AuthService } from '../services/auth.services'

const authService = new AuthService()
const adminService = new AdminService()

let ticketIO: Server | null = null

export function getTicketIO(): Server | null {
  return ticketIO
}

export function initTicketSocket(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    path: '/api/v1/socket.io',
    cors: {
      origin: true,
      credentials: true
    }
  })

  const ticketNamespace = io.of('/tickets')

  ticketNamespace.on('connection', (socket) => {
    const safeJoinTicketRoom = (ticketId: number) => {
      if (!Number.isFinite(ticketId)) return
      const room = `ticket:${ticketId}`
      socket.join(room)
    }

    const token =
      (socket.handshake.auth?.token as string) || (socket.handshake.query?.token as string)

    if (!token) {
      socket.disconnect(true)
      return
    }

    socket.on('join_ticket', (ticketId: number) => {
      safeJoinTicketRoom(Number(ticketId))
    })

    socket.on('leave_ticket', (ticketId: number) => {
      socket.leave(`ticket:${ticketId}`)
    })

    socket.on('typing', (payload: { ticketId: number }) => {
      const user = socket.data.user as { id: number; name: string; isAdmin: boolean } | undefined
      if (!user) return
      const room = `ticket:${payload.ticketId}`
      socket.to(room).emit('typing', { userId: user.id, name: user.name, isStaff: user.isAdmin })
    })

    socket.on('stop_typing', (payload: { ticketId: number }) => {
      const user = socket.data.user as { id: number; name: string; isAdmin: boolean } | undefined
      if (!user) return
      const room = `ticket:${payload.ticketId}`
      socket.to(room).emit('stop_typing', { userId: user.id })
    })

    socket.on('disconnect', () => {})

    // Authenticate in background; emit ready only after auth succeeds.
    void (async () => {
      let user: { id: number; name: string; isAdmin: boolean } | null = null

      try {
        const adminDecoded = await adminService.verifyAdminToken(token)
        user = {
          id: adminDecoded.userId,
          name: (adminDecoded as any).user?.firstName || adminDecoded.email,
          isAdmin: true
        }
      } catch {
        try {
          const decoded = await authService.verifyToken(token)
          user = {
            id: decoded.userId,
            name: (decoded as any).user?.firstName || decoded.email,
            isAdmin: false
          }
        } catch {
          socket.disconnect(true)
          return
        }
      }

      socket.data.user = user

      // Admin dashboard sockets receive all ticket reply updates.
      if (user.isAdmin) {
        socket.join('admin:tickets')
      }

      socket.emit('ticket_socket_ready')
    })()
  })

  ticketIO = io
  return io
}

export function emitTicketNewReply(ticketId: number, reply: Record<string, unknown>): void {
  if (!ticketIO) return
  const nsp = ticketIO.of('/tickets')
  nsp.to(`ticket:${ticketId}`).emit('new_reply', reply)
  nsp.to('admin:tickets').emit('ticket_inbox_reply', reply)
}
