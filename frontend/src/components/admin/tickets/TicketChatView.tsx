'use client'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useConfirmationModal } from '@/hooks/useConfirmationModal'
import { useTicketSocket } from '@/hooks/useTicketSocket'
import { showError } from '@/lib/errMsg'
import { cn } from '@/lib/utils'
import requests from '@/services/network/http'
import { AlertTriangle, Download, Paperclip } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import TicketReplyForm from '../form/TicketReply'
import TicketCustomerProfileDialog from './TicketCustomerProfileDialog'

interface TicketReplyType {
  id: number
  content: string
  createdAt: string
  attachments: string[]
  authorName: string
  isStaff: boolean
}

interface TicketChatViewProps {
  ticket: {
    id: number
    subject: string
    description: string
    ticketNumber: string
    status: string
    priority: string
    createdAt?: string
    attachments?: string[]
    guestEmail?: string
    meta?: {
      orderContext?: {
        orderId?: number
        orderNumber?: string
        status?: string
        deliveryStatus?: string
        quantity?: number
        total?: number
        createdAt?: string
        product?: {
          name?: string
          sku?: string
          type?: string
          platform?: string
        }
        telegramTransfer?: {
          status?: string
          customerTelegram?: string
        } | null
        client?: {
          email?: string
          name?: string
          phone?: string | null
          telegramUsername?: string | null
        }
      }
    }
    user: {
      id?: number
      email?: string
      firstName?: string
      phone?: string
      telegramUsername?: string
    } | null
    replies: TicketReplyType[]
  }
  refetch: () => void
  showHeader?: boolean
  variant?: 'admin' | 'customer'
}

const TicketChatView = ({ ticket, refetch, showHeader = false, variant = 'admin' }: TicketChatViewProps) => {
  const chatAreaRef = useRef<HTMLDivElement | null>(null)
  const isCustomer = variant === 'customer'
  const [profileOpen, setProfileOpen] = useState(false)

  const scrollToLatest = useCallback((behavior: ScrollBehavior = 'auto') => {
    const chatArea = chatAreaRef.current
    if (!chatArea) return
    chatArea.scrollTo({ top: chatArea.scrollHeight, behavior })
  }, [])

  const handleNewReply = useCallback(() => {
    refetch()
    setTimeout(() => {
      scrollToLatest('smooth')
    }, 100)
  }, [refetch, scrollToLatest])

  const { typingUser, emitTyping, emitStopTyping } = useTicketSocket(ticket.id, {
    isAdmin: !isCustomer,
    onNewReply: handleNewReply
  })

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()

    if (isToday) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    } else {
      return (
        date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        }) +
        ' at ' +
        date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })
      )
    }
  }

  const getInitials = (name: string) => {
    if (!name) return '??'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const isImageUrl = (url: string) =>
    /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url) || /^https?:\/\/.+\/supportTicket\/.+/i.test(url)
  const orderContext = ticket.meta?.orderContext

  const renderAttachments = (attachments: string[]) => {
    if (!attachments?.length) return null

    return (
      <div className='mt-3'>
        <div className='flex items-center gap-1 text-muted-foreground text-sm mb-2'>
          <Paperclip className='w-4 h-4' />
          <span>Attachments ({attachments.length})</span>
        </div>
        <div className='grid grid-cols-2 sm:grid-cols-3 gap-2'>
          {attachments.map((url, index) => (
            <a
              key={index}
              href={url}
              target='_blank'
              rel='noopener noreferrer'
              className='group block rounded-lg border border-border overflow-hidden bg-muted/30 hover:bg-muted/50 transition-colors'
            >
              {isImageUrl(url) ? (
                <div className='aspect-square relative'>
                  <img
                    src={url}
                    alt={`Attachment ${index + 1}`}
                    className='w-full h-full object-cover'
                  />
                  <div className='absolute inset-0 flex justify-center items-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity'>
                    <Download className='w-5 h-5 text-primary-foreground' />
                  </div>
                </div>
              ) : (
                <div className='flex justify-between items-center p-2'>
                  <span className='font-medium text-sm text-foreground truncate flex-1'>
                    {url.split('/').pop() || `File ${index + 1}`}
                  </span>
                  <Download className='w-4 h-4 shrink-0 text-primary' />
                </div>
              )}
            </a>
          ))}
        </div>
      </div>
    )
  }

  const { openModal, ModalComponent } = useConfirmationModal({
    title: 'Close Ticket',
    description:
      'Are you sure you want to close this ticket? This action will mark the ticket as closed.',
    confirmText: 'Close Ticket',
    cancelText: 'Cancel',
    variant: 'destructive',
    icon: AlertTriangle
  })

  const handleCloseTicket = async (ticketId: number) => {
    openModal(async () => {
      try {
        if (isCustomer) {
          await requests.post(`/customer/tickets/${ticket.ticketNumber}/close`, {})
        } else {
          const readyData = { id: ticketId, isStaff: true, status: 'CLOSED' }
          await requests.put(`/admin/tickets/${ticketId}`, readyData)
        }
        toast.success('Ticket closed successfully!')
      } catch (error) {
        showError(error)
      } finally {
        refetch?.()
      }
    })
  }

  const renderOrderContext = () => {
    if (!orderContext) return null

    return (
      <div className='mt-6 rounded-xl border border-border bg-card p-5'>
        <div className='flex flex-col gap-4 lg:flex-row lg:justify-between'>
          <div className='space-y-2'>
            <h4 className='font-semibold text-foreground'>Order Details</h4>
            <div className='grid gap-2 text-sm text-muted-foreground sm:grid-cols-2'>
              <p>
                <span className='text-foreground'>Order ID:</span> {orderContext.orderNumber || 'N/A'}
              </p>
              <p>
                <span className='text-foreground'>Product:</span> {orderContext.product?.name || 'N/A'}
              </p>
              <p>
                <span className='text-foreground'>Order status:</span> {orderContext.status || 'N/A'}
              </p>
              <p>
                <span className='text-foreground'>Delivery status:</span>{' '}
                {orderContext.deliveryStatus || 'N/A'}
              </p>
              <p>
                <span className='text-foreground'>Quantity:</span> {orderContext.quantity ?? 'N/A'}
              </p>
              <p>
                <span className='text-foreground'>Total:</span>{' '}
                {typeof orderContext.total === 'number' ? `$${orderContext.total.toFixed(2)}` : 'N/A'}
              </p>
              {orderContext.product?.platform ? (
                <p>
                  <span className='text-foreground'>Platform:</span> {orderContext.product.platform}
                </p>
              ) : null}
              {orderContext.telegramTransfer?.customerTelegram ? (
                <p>
                  <span className='text-foreground'>Telegram:</span>{' '}
                  {orderContext.telegramTransfer.customerTelegram}
                </p>
              ) : null}
            </div>
          </div>

          <div className='space-y-2'>
            <h4 className='font-semibold text-foreground'>Client Details</h4>
            <div className='grid gap-2 text-sm text-muted-foreground'>
              <p>
                <span className='text-foreground'>Name:</span>{' '}
                {orderContext.client?.name || ticket.user?.firstName || ticket.user?.email || ticket.guestEmail || 'N/A'}
              </p>
              <p>
                <span className='text-foreground'>Email:</span>{' '}
                {orderContext.client?.email || ticket.user?.email || ticket.guestEmail || 'N/A'}
              </p>
              {orderContext.client?.phone ? (
                <p>
                  <span className='text-foreground'>Phone:</span> {orderContext.client.phone}
                </p>
              ) : null}
              {orderContext.client?.telegramUsername ? (
                <p>
                  <span className='text-foreground'>Telegram username:</span>{' '}
                  {orderContext.client.telegramUsername}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const handleReopenTicket = async (ticketId: number) => {
    try {
      await requests.put(`/admin/tickets/${ticketId}`, {
        id: ticketId,
        isStaff: true,
        status: 'OPEN'
      })
      toast.success('Ticket reopened successfully!')
    } catch (error) {
      showError(error)
    } finally {
      refetch?.()
    }
  }

  const handleReplySuccess = () => {
    // Refresh the ticket data to show new reply
    refetch()
    setTimeout(() => {
      scrollToLatest('smooth')
    }, 100)
  }

  useEffect(() => {
    // Keep latest message visible when ticket/replies change.
    scrollToLatest('auto')
  }, [ticket.id, ticket.replies?.length, scrollToLatest])

  return (
    <div
      className={cn(
        'flex flex-col bg-card text-card-foreground shadow-sm rounded-lg overflow-hidden border border-border',
        showHeader && 'border-2'
      )}
    >
      {/* Enhanced Admin Header */}
      {showHeader && (
        <div className='relative bg-muted/80 dark:bg-muted/60 shadow-sm p-6 border-b border-border'>
          {/* Decorative elements */}
          <div className='top-0 right-0 absolute bg-primary/5 blur-3xl rounded-full w-64 h-64 -translate-y-1/2 translate-x-1/2' />
          <div className='bottom-0 left-0 absolute bg-primary/5 blur-2xl rounded-full w-48 h-48 -translate-x-1/2 translate-y-1/2' />

          <div className='relative flex justify-between items-start gap-4'>
            <div className='flex flex-1 items-start gap-4'>
              <Avatar className='shadow-lg border-2 border-border ring-2 ring-muted w-14 h-14'>
                <AvatarFallback className='bg-muted font-bold text-foreground text-lg'>
                  {getInitials(ticket.user?.firstName || ticket.guestEmail || 'Guest')}
                </AvatarFallback>
              </Avatar>
              <div className='flex-1'>
                <h3 className='mb-2 font-bold text-foreground text-xl leading-tight'>
                  {ticket.subject}
                </h3>
                <div className='flex flex-wrap items-center gap-x-4 gap-y-2'>
                  <button
                    type='button'
                    onClick={() => !isCustomer && setProfileOpen(true)}
                    className={cn(
                      'flex items-center gap-1.5 text-muted-foreground',
                      !isCustomer && 'rounded-md transition-colors hover:bg-muted/70 px-2 py-1'
                    )}
                    disabled={isCustomer}
                  >
                    <div className='bg-muted p-1 rounded'>
                      <svg
                        className='w-4 h-4'
                        fill='none'
                        viewBox='0 0 24 24'
                        stroke='currentColor'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
                        />
                      </svg>
                    </div>
                    <span className='font-medium text-sm'>
                      {ticket.user?.firstName || ticket.user?.email || ticket.guestEmail || 'Guest customer'}
                    </span>
                  </button>
                  <div className='flex items-center gap-1.5 text-muted-foreground'>
                    <div className='bg-muted p-1 rounded'>
                      <svg
                        className='w-4 h-4'
                        fill='none'
                        viewBox='0 0 24 24'
                        stroke='currentColor'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z'
                        />
                      </svg>
                    </div>
                    <span className='font-mono text-sm'>#{ticket.ticketNumber}</span>
                  </div>
                  <div className='flex items-center gap-1.5 text-muted-foreground'>
                    <div className='bg-muted p-1 rounded'>
                      <svg
                        className='w-4 h-4'
                        fill='none'
                        viewBox='0 0 24 24'
                        stroke='currentColor'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z'
                        />
                      </svg>
                    </div>
                    <span className='text-sm'>{ticket.replies?.length || 0} Replies</span>
                  </div>
                </div>
              </div>
            </div>

            <div className='flex flex-col items-end gap-3'>
              {!isCustomer ? (
                ticket.status === 'CLOSED' ? (
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => handleReopenTicket(ticket.id)}
                    className='shadow-lg transition-all hover:shadow-xl'
                  >
                    Reopen Ticket
                  </Button>
                ) : (
                  <Button
                    variant='destructive'
                    size='sm'
                    onClick={() => handleCloseTicket(ticket.id)}
                    className='shadow-lg transition-all hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50'
                  >
                    <svg className='w-4 h-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M6 18L18 6M6 6l12 12'
                      />
                    </svg>
                    Close Ticket
                  </Button>
                )
              ) : (
                <Button
                  variant='destructive'
                  size='sm'
                  onClick={() => handleCloseTicket(ticket.id)}
                  disabled={ticket.status === 'CLOSED'}
                  className='shadow-lg transition-all hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50'
                >
                  <svg className='w-4 h-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M6 18L18 6M6 6l12 12'
                    />
                  </svg>
                  Close Ticket
                </Button>
              )}

              <div className='flex flex-wrap justify-end items-center gap-2'>
                <Badge
                  variant='secondary'
                  className={cn(
                    'shadow-sm font-semibold border',
                    ticket.status === 'OPEN' &&
                      'bg-emerald-500/20 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-400/40',
                    ticket.status === 'IN_PROGRESS' &&
                      'bg-amber-500/20 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-400/40',
                    ticket.status === 'RESOLVED' &&
                      'bg-muted text-muted-foreground border-border',
                    ticket.status === 'CLOSED' &&
                      'bg-red-500/20 text-red-800 dark:bg-red-950/50 dark:text-red-300 border-red-400/40'
                  )}
                >
                  {ticket.status.toLowerCase().replace('_', ' ')}
                </Badge>
                <Badge
                  variant='outline'
                  className={cn(
                    'shadow-sm border-border font-semibold text-foreground',
                    ticket.priority === 'HIGH' &&
                      'border-orange-300/50 bg-orange-500/10 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300',
                    ticket.priority === 'URGENT' &&
                      'border-red-300/50 bg-red-500/10 dark:bg-red-950/30 text-red-700 dark:text-red-300',
                    ticket.priority === 'MEDIUM' &&
                      'border-amber-300/50 bg-amber-500/10 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300',
                    ticket.priority === 'LOW' &&
                      'border-emerald-300/50 bg-emerald-500/10 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                  )}
                >
                  <div
                    className={cn(
                      'mr-1 rounded-full w-2 h-2',
                      ticket.priority === 'HIGH' && 'bg-orange-400',
                      ticket.priority === 'URGENT' && 'bg-red-400 animate-pulse',
                      ticket.priority === 'MEDIUM' && 'bg-yellow-400',
                      ticket.priority === 'LOW' && 'bg-green-400'
                    )}
                  />
                  {ticket.priority.toLowerCase()} priority
                </Badge>
              </div>
            </div>
          </div>
        </div>
      )}

      {!isCustomer ? (
        <TicketCustomerProfileDialog
          open={profileOpen}
          onOpenChange={setProfileOpen}
          ticketId={ticket.id}
        />
      ) : null}

      {/* Enhanced Chat Area */}
      <div
        ref={chatAreaRef}
        className='bg-muted/20 dark:bg-muted/10 min-h-[400px] max-h-[60vh] overflow-y-auto chatItemsWrapper custom-scrollbar'
      >
        <div className='space-y-6 p-3 lg:p-6'>
          {/* Enhanced Initial Ticket */}
          <div className='flex gap-3 mr-auto max-w-[90%] lg:max-w-[95%]'>
              <Avatar className='md:flex flex-shrink-0 shadow-md ring-2 ring-emerald-500/30 w-10 h-10'>
                <AvatarFallback className='bg-emerald-500/80 dark:bg-emerald-600 font-semibold text-white text-sm'>
                  {getInitials(ticket?.user?.firstName || ticket.guestEmail || 'Guest')}
                </AvatarFallback>
              </Avatar>

            <div className='flex-1 space-y-2'>
              <div className='flex justify-start items-center gap-2'>
                    <span className='font-bold text-foreground text-sm'>
                      {ticket?.user?.firstName || ticket?.user?.email || ticket.guestEmail || 'Guest customer'}
                    </span>
                <Badge
                  variant='secondary'
                  className='bg-emerald-500/20 dark:bg-emerald-950/40 border-emerald-500/30 font-medium text-emerald-700 dark:text-emerald-300 text-xs'
                >
                  Customer
                </Badge>
                <Badge
                  variant='outline'
                  className='bg-primary/10 border-primary/30 font-medium text-primary text-xs'
                >
                  Initial Ticket
                </Badge>
              </div>

              <div className='relative bg-card border border-border border-r-4 border-r-emerald-500 shadow-sm hover:shadow-md p-5 rounded-xl transition-shadow'>
                <div className='top-0 right-0 absolute bg-emerald-500/5 blur-2xl rounded-full w-32 h-32' />
                <div className='relative'>
                  <div className='mb-4 pb-3 border-border border-b'>
                    <h4 className='flex items-center gap-2 font-bold text-foreground text-base'>
                      <svg
                        className='w-5 h-5 text-emerald-600 dark:text-emerald-400'
                        fill='none'
                        viewBox='0 0 24 24'
                        stroke='currentColor'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z'
                        />
                      </svg>
                      {ticket.subject}
                    </h4>
                  </div>
                  <div className='max-w-none prose prose-sm'>
                    <p className='m-0 text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap'>
                      {ticket.description}
                    </p>
                  </div>

                  {ticket.attachments?.length ? renderAttachments(ticket.attachments ?? []) : null}

                  <div className='flex justify-between items-center mt-4 pt-3 border-border border-t'>
                    <span className='text-muted-foreground text-xs'>
                      {formatTime(ticket.createdAt || new Date().toISOString())}
                    </span>
                    <div className='flex items-center gap-1.5 bg-emerald-500/10 dark:bg-emerald-950/40 px-2 py-1 rounded-full'>
                      <div className='bg-emerald-500 rounded-full w-2 h-2 animate-pulse'></div>
                      <span className='font-medium text-emerald-700 dark:text-emerald-300 text-xs'>
                        Original Ticket
                      </span>
                    </div>
                  </div>

                  {renderOrderContext()}
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Replies */}
          {ticket.replies?.length > 0 ? (
            ticket.replies?.map((reply) => {
              const isStaff = reply.isStaff

              return (
                <div
                  key={reply.id}
                  className={cn(
                    'slide-in-from-bottom-4 flex gap-3 max-w-[90%] lg:max-w-[70%] animate-in duration-300 fade-in',
                    isStaff ? 'ml-auto flex-row-reverse' : 'mr-auto flex-row'
                  )}
                >
                  <Avatar
                    className={cn(
                      'md:flex flex-shrink-0 shadow-md w-10 h-10',
                      isStaff ? 'ring-2 ring-primary/30' : 'ring-2 ring-emerald-500/30'
                    )}
                  >
                    <AvatarFallback
                      className={cn(
                        'font-semibold text-sm text-white',
                        isStaff
                          ? 'bg-primary dark:bg-primary/90'
                          : 'bg-emerald-500/80 dark:bg-emerald-600'
                      )}
                    >
                      {getInitials(
                        isStaff
                          ? reply?.authorName || 'Support'
                          : ticket?.user?.firstName || ticket.guestEmail || 'Guest'
                      )}
                    </AvatarFallback>
                  </Avatar>

                  <div className='flex-1 space-y-2'>
                    <div
                      className={cn(
                        'flex items-center gap-2',
                        isStaff ? 'justify-end' : 'justify-start'
                      )}
                    >
                      <span className='font-bold text-foreground text-sm'>
                        {isStaff
                          ? 'Support Team'
                          : ticket?.user?.firstName || ticket?.user?.email || ticket.guestEmail || 'Guest customer'}
                      </span>
                      <Badge
                        variant={isStaff ? 'default' : 'secondary'}
                        className={cn(
                          'shadow-sm font-medium text-xs',
                          isStaff
                            ? 'bg-primary/20 text-primary border-primary/30 dark:bg-primary/30 dark:text-primary-foreground'
                            : 'bg-emerald-500/20 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                        )}
                      >
                        {isStaff ? 'Staff' : 'Customer'}
                      </Badge>
                    </div>

                    <div
                      className={cn(
                        'relative shadow-sm hover:shadow-md p-5 border rounded-xl transition-all',
                        isStaff
                          ? 'bg-primary/5 dark:bg-primary/10 border-border border-l-4 border-l-primary'
                          : 'bg-card border-border border-r-4 border-r-emerald-500'
                      )}
                    >
                      <div
                        className={cn(
                          'top-0 absolute blur-2xl rounded-full w-32 h-32',
                          isStaff ? 'right-0 bg-primary/5' : 'left-0 bg-emerald-500/5'
                        )}
                      />

                      <div className='relative'>
                        <div className='max-w-none prose prose-sm'>
                          <p className='m-0 text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap'>
                            {reply.content}
                          </p>
                        </div>

                        {renderAttachments(reply.attachments)}

                        <div
                          className={cn(
                            'flex justify-between items-center mt-4 pt-3 border-t',
                            isStaff ? 'border-primary/10' : 'border-border'
                          )}
                        >
                          <span className='text-muted-foreground text-xs'>
                            {formatTime(reply.createdAt)}
                          </span>
                          <div
                            className={cn(
                              'flex items-center gap-1.5 px-2 py-1 rounded-full',
                              isStaff
                                ? 'bg-primary/10 dark:bg-primary/20'
                                : 'bg-emerald-500/10 dark:bg-emerald-950/40'
                            )}
                          >
                            <div
                              className={cn(
                                'rounded-full w-2 h-2',
                                isStaff ? 'bg-primary' : 'bg-emerald-500 animate-pulse'
                              )}
                            />
                            <span
                              className={cn(
                                'font-medium text-xs',
                                isStaff ? 'text-primary' : 'text-emerald-700 dark:text-emerald-300'
                              )}
                            >
                              {isStaff ? 'Official Response' : 'Customer Message'}
                            </span>
                          </div>
                        </div>

                        {isStaff && reply.authorName && (
                          <div className='mt-2 text-muted-foreground text-xs'>
                            Sent by: {reply.authorName}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <div className='flex flex-col justify-center items-center py-16'>
              <div className='relative'>
                <div className='absolute inset-0 bg-primary/10 blur-xl rounded-full' />
                <div className='relative flex justify-center items-center bg-muted dark:bg-muted/80 mb-4 border border-border rounded-full w-20 h-20'>
                  <Paperclip className='w-10 h-10 text-muted-foreground' />
                </div>
              </div>
              <p className='mb-2 font-bold text-foreground text-xl'>No conversation yet</p>
              <p className='max-w-md text-muted-foreground text-sm text-center leading-relaxed'>
                This ticket hasn&apos;t received any replies yet. Use the form below to send the
                first response to the customer.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Typing indicator (customer is typing) */}
      {typingUser && !typingUser.isStaff && (
        <div className='px-4 py-2 text-muted-foreground text-sm animate-in fade-in duration-200'>
          <span className='inline-flex items-center gap-1.5'>
            <span className='flex gap-0.5'>
              <span className='w-1.5 h-1.5 rounded-full bg-current animate-bounce' style={{ animationDelay: '0ms' }} />
              <span className='w-1.5 h-1.5 rounded-full bg-current animate-bounce' style={{ animationDelay: '150ms' }} />
              <span className='w-1.5 h-1.5 rounded-full bg-current animate-bounce' style={{ animationDelay: '300ms' }} />
            </span>
            <span>{typingUser.name} is typing...</span>
          </span>
        </div>
      )}

      {/* Enhanced Footer */}
      {ticket.status.toUpperCase() !== 'CLOSED' && (
        <div className='relative bg-muted/30 dark:bg-muted/20 shadow-sm p-5 border-border border-t'>
          <div className='top-0 left-1/2 absolute bg-primary/5 blur-3xl rounded-full w-64 h-64 -translate-x-1/2 -translate-y-1/2' />
          <div className='relative'>
            <div className='flex items-center gap-2 mb-3 text-muted-foreground text-sm'>
              <svg className='w-4 h-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6'
                />
              </svg>
              <span className='font-medium'>Reply to ticket</span>
            </div>
            <TicketReplyForm
              ticketId={ticket?.id}
              ticketNumber={ticket?.ticketNumber}
              isCustomer={isCustomer}
              onSuccess={handleReplySuccess}
              onTyping={emitTyping}
              onStopTyping={emitStopTyping}
            />
          </div>
        </div>
      )}
      <ModalComponent />
    </div>
  )
}

export default TicketChatView
