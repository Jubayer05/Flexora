import { RankSystemType } from '@/lib/validations/schemas/rankSystem'
import { Pencil, Trash2 } from 'lucide-react'
import { ActionItem } from '../common/ActionsDropdown'

// Define all possible action types
export type RankActionType = 'edit' | 'delete'

// Single action handler interface
export interface RankActionHandler {
  (actionType: RankActionType, data: RankSystemType): void
}

// Quick view handler state interface
export interface QuickViewState {
  open: boolean
  data: RankSystemType | null
}

// Actions configuration with unified action handler
export const getRankActions = (onAction?: RankActionHandler): ActionItem<RankSystemType>[] => {
  const actions: ActionItem<RankSystemType>[] = [
    {
      type: 'action',
      label: 'Edit',
      icon: Pencil,
      onClick: async (data) => {
        if (onAction) {
          onAction('edit', data)
        }
      },
      permission: { resource: 'tiers', actions: 'update' }
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
      permission: { resource: 'tiers', actions: 'delete' }
    }
  ]

  return actions
}
