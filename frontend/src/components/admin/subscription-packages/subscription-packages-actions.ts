import { Pencil, Trash2 } from 'lucide-react'
import { ActionItem } from '../common/ActionsDropdown'

interface SubscriptionPackage {
  id: number
  name: string
  description?: any
  price: number
  discount: number
  duration: number
  isActive: boolean
  meta?: any
  createdAt: string
  updatedAt: string
}

// Define all possible action types
export type SubscriptionPackageActionType = 'edit' | 'delete'

// Single action handler interface
export interface SubscriptionPackageActionHandler {
  (actionType: SubscriptionPackageActionType, data: SubscriptionPackage): void
}

// Actions configuration with unified action handler
export const getSubscriptionPackageActions = (
  data: SubscriptionPackage,
  mutate?: () => void,
  onAction?: SubscriptionPackageActionHandler
): ActionItem<SubscriptionPackage>[] => [
  {
    type: 'action',
    label: 'Edit',
    icon: Pencil,
    onClick: async (data) => {
      if (onAction) {
        onAction('edit', data)
      }
    },
    permission: { resource: 'subscription-packages', actions: 'update' }
  },
  {
    type: 'action',
    label: 'Delete',
    icon: Trash2,
    variant: 'destructive',
    onClick: async (data) => {
      if (onAction) {
        onAction('delete', data)
      }
    },
    permission: { resource: 'subscription-packages', actions: 'delete' }
  }
]
