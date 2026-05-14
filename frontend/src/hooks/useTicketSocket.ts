'use client'

import Cookies from 'js-cookie'
import { useCallback, useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'

const SOCKET_PATH = '/api/v1/socket.io'
const NAMESPACE = '/tickets'

export type TypingUser = {
  userId: number
  name: string
  isStaff: boolean
}

export type NewReplyPayload = {
  id: number
  ticketId?: number
  content: string
  createdAt: string
  attachments: string[]
  authorName: string
  isStaff: boolean
}

const getSocketUrl = () => {
  if (typeof window === 'undefined') return ''
  const api = process.env.NEXT_PUBLIC_APP_ROOT_API || ''
  try {
    const u = new URL(api)
    return `${u.protocol}//${u.host}`
  } catch {
    return window.location.origin
  }
}

const TYPING_DEBOUNCE_MS = 500
const TYPING_STALE_MS = 3000

export function useTicketSocket(
  ticketId: number | null,
  options: {
    isAdmin: boolean
    onNewReply?: (reply: NewReplyPayload) => void
    subscribeAllTickets?: boolean
  }
) {
  const [typingUser, setTypingUser] = useState<TypingUser | null>(null)
  const [connected, setConnected] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const emitTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const joinFallbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const joinedRef = useRef(false)
  const lastTypingEmitRef = useRef(0)
  const onNewReplyRef = useRef(options.onNewReply)
  onNewReplyRef.current = options.onNewReply

  const { isAdmin, subscribeAllTickets = false } = options

  const emitTyping = useCallback(() => {
    if (!ticketId || !socketRef.current?.connected) return

    const now = Date.now()
    if (now - lastTypingEmitRef.current < TYPING_DEBOUNCE_MS) {
      if (!emitTypingTimeoutRef.current) {
        emitTypingTimeoutRef.current = setTimeout(() => {
          emitTypingTimeoutRef.current = null
          lastTypingEmitRef.current = Date.now()
          socketRef.current?.emit('typing', { ticketId })
        }, TYPING_DEBOUNCE_MS)
      }
      return
    }
    lastTypingEmitRef.current = now
    socketRef.current?.emit('typing', { ticketId })
  }, [ticketId])

  const emitStopTyping = useCallback(() => {
    if (emitTypingTimeoutRef.current) {
      clearTimeout(emitTypingTimeoutRef.current)
      emitTypingTimeoutRef.current = null
    }
    if (ticketId && socketRef.current?.connected) {
      socketRef.current.emit('stop_typing', { ticketId })
    }
  }, [ticketId])

  useEffect(() => {
    if (!ticketId && !subscribeAllTickets) return

    const baseURL = getSocketUrl()
    if (!baseURL) return

    const token = Cookies.get(isAdmin ? 'adminToken' : 'token')
    if (!token) return

    let mounted = true
    const socket = io(`${baseURL}${NAMESPACE}`, {
      path: SOCKET_PATH,
      auth: { token },
      // Websocket only: avoids long-polling overhead and duplicate network traffic
      transports: ['websocket'],
      timeout: 8000,
      reconnection: true,
      reconnectionAttempts: 2,
      reconnectionDelay: 800
    })
    socketRef.current = socket

    socket.on('connect', () => {
      if (mounted) {
        setConnected(true)
        joinedRef.current = false
        if (joinFallbackTimeoutRef.current) {
          clearTimeout(joinFallbackTimeoutRef.current)
        }
        // Fallback in case "ticket_socket_ready" is delayed/missed.
        joinFallbackTimeoutRef.current = setTimeout(() => {
          if (!joinedRef.current && ticketId) {
            socket.emit('join_ticket', ticketId)
            joinedRef.current = true
          }
        }, 1200)
      }
    })

    socket.on('ticket_socket_ready', () => {
      if (!mounted) return
      if (ticketId) {
        socket.emit('join_ticket', ticketId)
        joinedRef.current = true
      }
    })

    socket.on('disconnect', (reason) => {
      if (mounted) setConnected(false)
    })

    socket.on('connect_error', (err) => {
      if (mounted) setConnected(false)
      console.error('[TicketSocket] connect_error:', err?.message || err)
    })

    socket.on('typing', (payload: TypingUser) => {
      if (!mounted) return
      setTypingUser(payload)
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(() => {
        typingTimeoutRef.current = null
        if (mounted) setTypingUser(null)
      }, TYPING_STALE_MS)
    })

    socket.on('stop_typing', (payload: { userId: number }) => {
      if (mounted) {
        setTypingUser((prev) => (prev && prev.userId === payload.userId ? null : prev))
      }
    })

    socket.on('new_reply', (payload: NewReplyPayload) => {
      onNewReplyRef.current?.(payload)
    })

    if (subscribeAllTickets) {
      socket.on('ticket_inbox_reply', (payload: NewReplyPayload) => {
        onNewReplyRef.current?.(payload)
      })
    }

    return () => {
      mounted = false
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      if (emitTypingTimeoutRef.current) clearTimeout(emitTypingTimeoutRef.current)
      if (joinFallbackTimeoutRef.current) clearTimeout(joinFallbackTimeoutRef.current)
      if (ticketId) {
        socket.emit('leave_ticket', ticketId)
      }
      socket.removeAllListeners()
      socket.disconnect()
      socketRef.current = null
      joinedRef.current = false
      setTypingUser(null)
      setConnected(false)
    }
  }, [ticketId, isAdmin, subscribeAllTickets])

  return { typingUser, emitTyping, emitStopTyping, connected }
}
