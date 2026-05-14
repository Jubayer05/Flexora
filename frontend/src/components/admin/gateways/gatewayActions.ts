import { PaymentMethodType } from '@/lib/validations/schemas/gateway'
import { Pencil, Trash2 } from 'lucide-react'
import { ActionItem } from '../common/ActionsDropdown'

// Define all possible action types
export type PaymentGatewayActionType = 'edit' | 'delete'

// Single action handler interface
export interface PaymentGatewayActionHandler {
  (actionType: PaymentGatewayActionType, data: PaymentMethodType): void
}

// Quick view handler state interface
export interface QuickViewState {
  open: boolean
  data: PaymentMethodType | null
}

// Actions configuration with unified action handler
export const getGatewayActions = (
  data: PaymentMethodType,
  mutate?: () => void,
  onAction?: PaymentGatewayActionHandler
): ActionItem<PaymentMethodType>[] => [
  {
    type: 'action',
    label: 'Edit',
    icon: Pencil,
    onClick: async (data) => {
      if (onAction) {
        onAction('edit', data)
      }
    }
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
    }
  }
]
