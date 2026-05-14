import { Pencil, Trash2 } from 'lucide-react'
import { ActionItem } from '../common/ActionsDropdown'

// Define all possible action types for roles
export type RoleActionType = 'edit' | 'assign' | 'status' | 'delete'

// Single action handler interface for roles
export interface RoleActionHandler {
  (actionType: RoleActionType, data: Role): void
}

// Actions configuration with unified action handler
export const getRoleActions = (
  data: Role,
  mutate?: () => void,
  onAction?: RoleActionHandler
): ActionItem<Role>[] => [
  {
    type: 'action',
    label: 'Edit',
    icon: Pencil,
    onClick: async (data) => {
      if (onAction) {
        onAction('edit', data)
      }
    },
    permission: { resource: 'roles', actions: 'update' }
  },
  // {
  //   type: 'action',
  //   label: 'Assign Permission',
  //   icon: Plus,
  //   onClick: async (data) => {
  //     if (onAction) {
  //       onAction('assign', data)
  //     }
  //   },
  //   permission: { resource: 'roles', actions: 'update' }
  // },
  // {
  //   type: 'action',
  //   label: 'Change Status',
  //   icon: Plus,
  //   onClick: async (data) => {
  //     if (onAction) {
  //       onAction('status', data)
  //     }
  //   },
  //   permission: { resource: 'roles', actions: 'update' }
  // },
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
    permission: { resource: 'roles', actions: 'delete' }
  }
]
