import { EmailTemplate } from '@/lib/validations/schemas/emailTemplate'
import { Pencil, Trash2 } from 'lucide-react'
import { ActionItem } from '../common/ActionsDropdown'

// Define all possible action types for email templates
export type EmailTemplateActionType = 'edit' | 'delete'

// Single action handler interface for email templates
export interface EmailTemplateActionHandler {
  (actionType: EmailTemplateActionType, data: EmailTemplate): void
}

// Actions configuration with unified action handler
export const getTemplateActions = (
  data: EmailTemplate,
  mutate?: () => void,
  onAction?: EmailTemplateActionHandler
): ActionItem<EmailTemplate>[] => [
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
