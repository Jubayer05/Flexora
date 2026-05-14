import { Eye, Link, Pencil, RotateCcw, Trash2 } from 'lucide-react'
import { ActionItem, createSeparator } from '../common/ActionsDropdown'

// Define all possible action types
export type ProductActionType =
  | 'quick-view'
  | 'clone-product'
  | 'copy-private-link'
  | 'edit'
  | 'delete'

// Single action handler interface
export interface ProductActionHandler {
  (actionType: ProductActionType, product: Product): void
}

// Quick view handler state interface
export interface QuickViewState {
  open: boolean
  product: Product | null
}

// Actions configuration with unified action handler
export const getProductActions = (
  product: Product,
  mutate?: () => void,
  onAction?: ProductActionHandler,
  setQuickViewState?: (state: QuickViewState) => void
): ActionItem<Product>[] => [
  {
    type: 'action',
    label: 'Quick View',
    icon: Eye,
    onClick: async (data) => {
      if (setQuickViewState) {
        setQuickViewState({ open: true, product: data })
      } else if (onAction) {
        onAction('quick-view', data)
      }
    }
  },
  {
    type: 'action',
    label: 'Clone Product',
    icon: RotateCcw,
    onClick: async (data) => {
      if (onAction) {
        onAction('clone-product', data)
      }
    }
  },
  {
    type: 'action',
    label: 'Copy Private Link',
    icon: Link,
    onClick: async (data) => {
      if (onAction) {
        onAction('copy-private-link', data)
      }
    },
    disabled: !product?.isPrivate
  },
  createSeparator(),
  {
    type: 'action',
    label: 'Edit',
    icon: Pencil,
    href: `/admin/products/${product?.id}/edit`
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
