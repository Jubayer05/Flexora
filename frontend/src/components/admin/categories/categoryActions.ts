import { Pencil, Trash2 } from 'lucide-react'
import { ActionItem } from '../common/ActionsDropdown'

// Define all possible action types
export type CategoryActionType = 'edit' | 'delete'

// Single action handler interface
export interface CategoryActionHandler {
  (actionType: CategoryActionType, data: Category): void
}

// Quick view handler state interface
export interface QuickViewState {
  open: boolean
  data: Category | null
}

// Actions configuration with unified action handler
export const getCategoryActions = (
  data: Category,
  mutate?: () => void,
  onAction?: CategoryActionHandler
): ActionItem<Category>[] => [
  {
    type: 'action',
    label: 'Edit',
    icon: Pencil,
    onClick: async (data) => {
      if (onAction) {
        onAction('edit', data)
      }
    },
    permission: { resource: 'categories', actions: 'update' }
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
    permission: { resource: 'categories', actions: 'delete' }
  }
]
