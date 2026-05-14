'use client'

import { cn } from '@/lib/utils'
import { cva } from 'class-variance-authority'

// =================================
// CVA STATUS BADGE VARIANTS
// =================================

const statusBadgeVariants = cva('inline-flex items-center font-medium text-xs', {
  variants: {
    variant: {
      pill: 'px-2.5 py-0.5 rounded-full border',
      badge: 'px-2 py-1 rounded border',
      minimal: 'px-1 py-0.5 rounded'
    },
    status: {
      // Coupon Status
      active: 'bg-green-100 text-green-800 border-green-300',
      inactive: 'bg-gray-100 text-gray-800 border-gray-300',
      expired: 'bg-red-100 text-red-800 border-red-300',
      depleted: 'bg-amber-100 text-amber-800 border-amber-300',

      // Order Status
      pending: 'bg-amber-100 text-amber-800 border-amber-300',
      confirmed: 'bg-blue-100 text-blue-800 border-blue-300',
      partial: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      completed: 'bg-green-100 text-green-800 border-green-300',
      cancelled: 'bg-gray-100 text-gray-800 border-gray-300',
      refunded: 'bg-red-100 text-red-800 border-red-300',

      // Payment Status
      failed: 'bg-red-100 text-red-800 border-red-300',

      // Delivery Status
      processing: 'bg-blue-100 text-blue-800 border-blue-300',
      delivered: 'bg-green-100 text-green-800 border-green-300',

      // Telegram Transfer Status
      verification_required: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      customer_joined: 'bg-blue-100 text-blue-800 border-blue-300',
      transfer_in_progress: 'bg-indigo-100 text-indigo-800 border-indigo-300',

      // Ticket Status
      open: 'bg-amber-100 text-amber-800 border-amber-300',
      in_progress: 'bg-blue-100 text-blue-800 border-blue-300',
      resolved: 'bg-green-100 text-green-800 border-green-300',
      closed: 'bg-gray-100 text-gray-800 border-gray-300',

      // Ticket Priority
      low: 'bg-green-100 text-green-800 border-green-300',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      high: 'bg-orange-100 text-orange-800 border-orange-300',
      urgent: 'bg-red-100 text-red-800 border-red-300',

      // User Role
      admin: 'bg-purple-100 text-purple-800 border-purple-300',
      moderator: 'bg-blue-100 text-blue-800 border-blue-300',
      customer: 'bg-green-100 text-green-800 border-green-300',
      guest: 'bg-gray-100 text-gray-800 border-gray-300',

      // User Rank
      new: 'bg-slate-100 text-slate-800 border-slate-300',
      normal: 'bg-gray-100 text-gray-800 border-gray-300',
      frequent: 'bg-blue-100 text-blue-800 border-blue-300',
      elite: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      vip: 'bg-purple-100 text-purple-800 border-purple-300',
      master: 'bg-yellow-100 text-yellow-800 border-yellow-300',

      // Default
      default: 'bg-gray-100 text-gray-800 border-gray-300'
    }
  },
  defaultVariants: {
    variant: 'pill',
    status: 'default'
  }
})

// =================================
// AUTO-DETECT STATUS TYPE FUNCTION
// =================================

type StatusType =
  | 'coupon'
  | 'order'
  | 'payment'
  | 'delivery'
  | 'telegram'
  | 'ticket'
  | 'ticketPriority'
  | 'userRole'
  | 'userRank'

// Helper function to normalize status for CVA
function normalizeStatusForCva(status: string): string {
  const normalized = String(status).toLowerCase().replace(/_/g, '_')

  // Map to CVA variant keys
  const statusMap: Record<string, string> = {
    active: 'active',
    inactive: 'inactive',
    expired: 'expired',
    depleted: 'depleted',
    pending: 'pending',
    confirmed: 'confirmed',
    partial: 'partial',
    completed: 'completed',
    cancelled: 'cancelled',
    refunded: 'refunded',
    failed: 'failed',
    processing: 'processing',
    delivered: 'delivered',
    verification_required: 'verification_required',
    customer_joined: 'customer_joined',
    transfer_in_progress: 'transfer_in_progress',
    open: 'open',
    in_progress: 'in_progress',
    resolved: 'resolved',
    closed: 'closed',
    low: 'low',
    medium: 'medium',
    high: 'high',
    urgent: 'urgent',
    admin: 'admin',
    moderator: 'moderator',
    customer: 'customer',
    guest: 'guest',
    new: 'new',
    normal: 'normal',
    frequent: 'frequent',
    elite: 'elite',
    vip: 'vip',
    master: 'master'
  }

  return statusMap[normalized] || 'default'
}

// =================================
// STATUS BADGE COMPONENT
// =================================

interface StatusBadgeProps {
  status: string
  type?: StatusType // Optional - will auto-detect if not provided
  variant?: 'badge' | 'pill' | 'minimal'
  className?: string
}

export const StatusBadge = ({
  status,
  variant = 'pill',
  className,
  ...props
}: StatusBadgeProps) => {
  if (!status) {
    return <span className='text-muted-foreground'>-</span>
  }

  const statusLabel = String(status).replace(/_/g, ' ')
  const normalizedStatus = normalizeStatusForCva(status)

  return (
    <span
      className={cn(
        statusBadgeVariants({
          variant,
          status: normalizedStatus as any
        }),
        className
      )}
      {...props}
    >
      {statusLabel}
    </span>
  )
}

// =================================
// LEGACY COMPONENT ALIASES (for backward compatibility)
// =================================

export const StatusRenderer = StatusBadge
export const CouponStatusRenderer = ({ status, ...props }: Omit<StatusBadgeProps, 'type'>) => (
  <StatusBadge status={status} type='coupon' {...props} />
)

export const OrderStatusRenderer = ({ status, ...props }: Omit<StatusBadgeProps, 'type'>) => (
  <StatusBadge status={status} type='order' {...props} />
)

export const PaymentStatusRenderer = ({ status, ...props }: Omit<StatusBadgeProps, 'type'>) => (
  <StatusBadge status={status} type='payment' {...props} />
)

export const DeliveryStatusRenderer = ({ status, ...props }: Omit<StatusBadgeProps, 'type'>) => (
  <StatusBadge status={status} type='delivery' {...props} />
)

export const TelegramTransferStatusRenderer = ({
  status,
  ...props
}: Omit<StatusBadgeProps, 'type'>) => <StatusBadge status={status} type='telegram' {...props} />

export const TicketStatusRenderer = ({ status, ...props }: Omit<StatusBadgeProps, 'type'>) => (
  <StatusBadge status={status} type='ticket' {...props} />
)

export const TicketPriorityRenderer = ({ status, ...props }: Omit<StatusBadgeProps, 'type'>) => (
  <StatusBadge status={status} type='ticketPriority' {...props} />
)

export const UserRoleRenderer = ({ status, ...props }: Omit<StatusBadgeProps, 'type'>) => (
  <StatusBadge status={status} type='userRole' {...props} />
)

export const UserRankRenderer = ({ status, ...props }: Omit<StatusBadgeProps, 'type'>) => (
  <StatusBadge status={status} type='userRank' {...props} />
)

// =================================
// UTILITY FUNCTIONS
// =================================

/**
 * Get all available statuses for a given type
 */
export function getAvailableStatuses(type: StatusType): string[] {
  switch (type) {
    case 'coupon':
      return ['ACTIVE', 'INACTIVE', 'EXPIRED', 'DEPLETED']
    case 'order':
      return ['PENDING', 'CONFIRMED', 'PARTIAL', 'COMPLETED', 'CANCELLED', 'REFUNDED']
    case 'payment':
      return ['PENDING', 'COMPLETED', 'FAILED', 'PARTIAL', 'REFUNDED']
    case 'delivery':
      return ['PENDING', 'PROCESSING', 'DELIVERED', 'FAILED', 'PARTIAL']
    case 'telegram':
      return [
        'PENDING',
        'VERIFICATION_REQUIRED',
        'CUSTOMER_JOINED',
        'TRANSFER_IN_PROGRESS',
        'COMPLETED',
        'FAILED'
      ]
    case 'ticket':
      return ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']
    case 'ticketPriority':
      return ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
    case 'userRole':
      return ['ADMIN', 'MODERATOR', 'CUSTOMER', 'GUEST']
    case 'userRank':
      return ['NEW', 'NORMAL', 'FREQUENT', 'ELITE', 'VIP', 'MASTER']
    default:
      return []
  }
}

/**
 * Check if a status is valid for a given type
 */
export function isValidStatus(status: string, type: StatusType): boolean {
  return getAvailableStatuses(type).includes(status)
}

export default StatusBadge
