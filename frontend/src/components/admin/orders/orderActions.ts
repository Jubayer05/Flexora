import {
  Copy,
  DollarSign,
  Eye,
  FileText,
  MessageSquare,
  Replace,
  Send,
  Ban,
  CircleCheckBig,
  X,
  CheckCircle,
  ExternalLink
} from 'lucide-react'
import { ActionItem, createSeparator } from '../common/ActionsDropdown'

// Define all possible action types
export type OrderActionType =
  | 'quick-view'
  | 'view-details'
  | 'copy-private-link'
  | 'clone-order'
  | 'resend-product'
  | 'replace-product'
  | 'refund'
  | 'export-invoice'
  | 'send-message'
  | 'ban'
  | 'unban'
  | 'cancel'
  | 'mark-complete'
  | 'mark-delivered'

// Single action handler interface
export interface OrderActionHandler {
  (actionType: OrderActionType, order: Order): void
}

// Quick view handler state interface
export interface QuickViewState {
  open: boolean
  order: Order | null
}

const hasCustomerTelegramUsername = (order: Order) =>
  typeof order?.user?.telegramUsername === 'string' && order.user.telegramUsername.trim().length > 0

// Actions configuration with unified action handler
export const getOrderActions = (
  order: Order,
  mutate?: () => void,
  onAction?: OrderActionHandler,
  setQuickViewState?: (state: QuickViewState) => void
): ActionItem<Order>[] => [
  {
    type: 'action',
    label: 'Quick View',
    icon: Eye,
    onClick: async (data) => {
      if (setQuickViewState) {
        setQuickViewState({ open: true, order: data })
      } else if (onAction) {
        onAction('quick-view', data)
      }
    }
  },
  {
    type: 'action',
    label: 'Copy Order Number',
    icon: Copy,
    onClick: async (data) => {
      if (onAction) {
        onAction('copy-private-link', data)
      }
    }
  },
  createSeparator(),
  {
    type: 'action',
    label: 'Resend Product',
    icon: Send,
    onClick: async (data) => {
      if (onAction) {
        onAction('resend-product', data)
      }
    }
  },
  {
    type: 'action',
    label: 'Replace Product',
    icon: Replace,
    onClick: async (data) => {
      if (onAction) {
        onAction('replace-product', data)
      }
    }
  },
  {
    type: 'action',
    label: 'Refund',
    icon: DollarSign,
    onClick: async (data) => {
      if (onAction) {
        onAction('refund', data)
      }
    }
  },
  {
    type: 'action',
    label: 'Export Invoice',
    icon: FileText,
    onClick: async (data) => {
      if (onAction) {
        onAction('export-invoice', data)
      }
    }
  },
  {
    type: 'action',
    label: 'Send Telegram Message',
    icon: MessageSquare,
    visible: (data) => hasCustomerTelegramUsername(data),
    onClick: async (data) => {
      if (onAction) {
        onAction('send-message', data)
      }
    }
  },
  createSeparator(),
  {
    type: 'action',
    label: 'View Full Details',
    icon: ExternalLink,
    onClick: async (data) => {
      if (onAction) {
        onAction('view-details', data)
      }
    }
  },
  createSeparator(),
  {
    type: 'action',
    label: order?.user?.isBanned ? 'Unban Customer' : 'Ban Customer',
    icon: order?.user?.isBanned ? CircleCheckBig : Ban,
    variant: order?.user?.isBanned ? 'default' : 'destructive',
    visible: (data) => Boolean(data?.user?.id),
    onClick: async (data) => {
      if (onAction) {
        onAction(data?.user?.isBanned ? 'unban' : 'ban', data)
      }
    }
  },
  {
    type: 'action',
    label: 'Cancel Order',
    icon: X,
    onClick: async (data) => {
      if (onAction) {
        onAction('cancel', data)
      }
    }
  },
  {
    type: 'action',
    label: 'Mark as Completed',
    icon: CheckCircle,
    onClick: async (data) => {
      if (onAction) {
        onAction('mark-complete', data)
      }
    }
  },
  {
    type: 'action',
    label: 'Mark as Delivered',
    icon: CheckCircle,
    onClick: async (data) => {
      if (onAction) {
        onAction('mark-delivered', data)
      }
    }
  }
]
