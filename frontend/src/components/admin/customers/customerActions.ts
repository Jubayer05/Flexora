import { Ban, CircleCheckBig, Eye, History, Pencil, Trash2, Wallet } from 'lucide-react'
import { ActionItem, createSeparator } from '../common/ActionsDropdown'

// Define all possible customer action types
export type CustomerActionType = 'edit' | 'delete' | 'ban' | 'unban' | 'manage-funds' | 'recharge-history' | 'view-purchases'

// Single action handler interface
export interface CustomerActionHandler {
  (actionType: CustomerActionType, customer: User): void
}

// Customer actions configuration with unified action handler
export const getCustomerActions = (
  customer: User,
  mutate?: () => void,
  onAction?: CustomerActionHandler
): ActionItem<User>[] => {
  const isSyntheticGuest = (customer as any)?.customerListSource === 'guest-order'

  return [
  {
    type: 'action',
    label: 'Edit',
    icon: Pencil,
    visible: !isSyntheticGuest,
    onClick: async (data) => {
      if (onAction) {
        onAction('edit', data)
      }
    },
    permission: { resource: 'customers', actions: 'update' }
  },
  {
    type: 'action',
    label: 'Delete',
    icon: Trash2,
    variant: 'destructive',
    visible: !isSyntheticGuest,
    onClick: async (data) => {
      if (onAction) {
        onAction('delete', data)
      }
    },
    permission: { resource: 'customers', actions: 'delete' }
  },
  {
    type: 'action',
    label: customer?.isBanned ? 'Unbanned' : 'Ban',
    icon: customer?.isBanned ? CircleCheckBig : Ban,
    variant: 'destructive',
    visible: !isSyntheticGuest,
    onClick: async (data) => {
      if (onAction) {
        onAction(data?.isBanned ? 'unban' : 'ban', data)
      }
    },
    permission: { resource: 'customers', actions: 'ban' }
  },
  createSeparator(),
  {
    type: 'action',
    label: 'View Purchases',
    icon: Eye,
    onClick: async (data) => {
      if (onAction) {
        onAction('view-purchases', data)
      }
    },
    permission: { resource: 'customers', actions: 'read' }
  },
  {
    type: 'action',
    label: 'Manage Funds',
    icon: Wallet,
    visible: !isSyntheticGuest,
    onClick: async (data) => {
      if (onAction) {
        onAction('manage-funds', data)
      }
    },
    permission: { resource: 'customers', actions: 'topup' }
  },
  {
    type: 'action',
    label: 'Recharge History',
    icon: History,
    visible: !isSyntheticGuest,
    onClick: async (data) => {
      if (onAction) {
        onAction('recharge-history', data)
      }
    },
    permission: { resource: 'customers', actions: 'read' }
  }
]
}
