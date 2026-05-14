import { Pencil, Trash2 } from 'lucide-react'
import { ActionItem } from '../common/ActionsDropdown'

// Define all possible action types
export type CouponActionType = 'edit' | 'delete'

// Single action handler interface
export interface CouponActionHandler {
  (actionType: CouponActionType, data: Coupon): void
}

// Quick view handler state interface
export interface QuickViewState {
  open: boolean
  data: Coupon | null
}

// Actions configuration with unified action handler
export const getCouponActions = (
  data: Coupon,
  mutate?: () => void,
  onAction?: CouponActionHandler
): ActionItem<Coupon>[] => [
  {
    type: 'action',
    label: 'Edit',
    icon: Pencil,
    onClick: async (data) => {
      if (onAction) {
        onAction('edit', data)
      }
    },
    permission: { resource: 'coupons', actions: 'update' }
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
    permission: { resource: 'coupons', actions: 'delete' }
  }
]
