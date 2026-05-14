'use client'

import { MoreVertical } from 'lucide-react'

import CustomLink from '@/components/common/CustomLink'
import { usePermissions } from '@/components/providers/PermissionProvider'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

// Action item type for dropdown menu
export interface ActionItem<T = any> {
  type: 'link' | 'action' | 'separator'
  label?: string
  icon?: React.ComponentType<{ size?: number; className?: string }>
  href?: string | ((data: T) => string)
  onClick?: (data: T) => void
  variant?: 'default' | 'destructive'
  className?: string
  disabled?: boolean | ((data: T) => boolean)
  visible?: boolean | ((data: T) => boolean)
  permission?: { resource: string; actions: string | string[] }
}

interface ActionsDropdownProps<T = any> {
  data: T
  actions: ActionItem<T>[]
  triggerClassName?: string
  contentClassName?: string
  align?: 'start' | 'center' | 'end'
  side?: 'top' | 'right' | 'bottom' | 'left'
}

export function ActionsDropdown<T = any>({
  data,
  actions,
  triggerClassName = 'h-8 w-8 rounded-md border border-border bg-muted/50 p-0 text-muted-foreground hover:border-border hover:bg-accent hover:text-accent-foreground transition-colors font-manrope',
  contentClassName = 'min-w-[10rem] rounded-lg border border-border bg-card shadow-xl py-1.5 font-manrope text-sm text-foreground backdrop-blur-sm',
  align = 'end',
  side = 'bottom'
}: ActionsDropdownProps<T>) {
  const { hasPermission } = usePermissions()

  // Filter actions based on permissions
  const filteredActions = actions.filter((action) => {
    // Always show separators
    if (action.type === 'separator') return true

    // If no permission required, show the action
    if (!action.permission) return true

    // Check if user has the required permission
    const { resource, actions: permissionActions } = action.permission

    // Handle both string and array of actions
    if (Array.isArray(permissionActions)) {
      return permissionActions.some((permAction) => hasPermission(resource, permAction))
    } else {
      return hasPermission(resource, permissionActions)
    }
  })

  const renderActionItem = (item: ActionItem<T>, index: number) => {
    // Check visibility
    const isVisible =
      typeof item.visible === 'function' ? item.visible(data) : item.visible !== false
    if (!isVisible) return null

    // Handle separator
    if (item.type === 'separator') {
      return <DropdownMenuSeparator key={`separator-${index}`} className='my-1 bg-border' />
    }

    // Check if disabled
    const isDisabled =
      typeof item.disabled === 'function' ? item.disabled(data) : item.disabled || false

    const Icon = item.icon
    const destructiveClass =
      'font-manrope cursor-pointer py-2 px-3 text-destructive hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 focus:text-destructive'
    const defaultClass =
      'font-manrope cursor-pointer py-2 px-3 text-foreground hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground'
    const baseClassName = item.className || (item.variant === 'destructive' ? destructiveClass : defaultClass)
    const disabledClassName = isDisabled ? 'opacity-50 cursor-not-allowed' : ''
    const finalClassName = `${baseClassName} ${disabledClassName}`.trim()

    // Handle link type
    if (item.type === 'link' && item.href) {
      const href = typeof item.href === 'function' ? item.href(data) : item.href

      return (
        <DropdownMenuItem key={item.label} className={finalClassName} asChild disabled={isDisabled}>
          <CustomLink href={href} className='flex items-center gap-2.5 text-inherit'>
            {Icon && <Icon size={16} className='shrink-0 text-muted-foreground' />}
            {item.label}
          </CustomLink>
        </DropdownMenuItem>
      )
    }

    // Handle action type with href (Next.js Link navigation)
    if (item.type === 'action' && item.href) {
      const href = typeof item.href === 'function' ? item.href(data) : item.href

      return (
        <DropdownMenuItem key={item.label} className={finalClassName} asChild disabled={isDisabled}>
          <CustomLink href={href} className='flex items-center gap-2.5 text-inherit'>
            {Icon && <Icon size={16} className='shrink-0 text-muted-foreground' />}
            {item.label}
          </CustomLink>
        </DropdownMenuItem>
      )
    }

    // Handle action type with onClick
    if (item.type === 'action' && item.onClick) {
      const iconClass =
        item.variant === 'destructive' ? 'shrink-0 text-destructive' : 'shrink-0 text-muted-foreground'
      return (
        <DropdownMenuItem
          key={item.label}
          className={finalClassName}
          disabled={isDisabled}
          onClick={() => !isDisabled && item.onClick?.(data)}
        >
          <div className='flex items-center gap-2.5'>
            {Icon && <Icon size={16} className={iconClass} />}
            {item.label}
          </div>
        </DropdownMenuItem>
      )
    }

    return null
  }

  // Get visible actions by filtering out null items and checking visibility
  const visibleActions = filteredActions
    .map((action, index) => renderActionItem(action, index))
    .filter(Boolean)

  // Don't render dropdown if no visible actions
  // if (visibleActions.length === 0) {
  //   return null
  // }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' className={triggerClassName}>
          <MoreVertical className='w-4 h-4' />
          <span className='sr-only'>Open menu</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align={align} side={side} className={contentClassName}>
        {visibleActions.length > 0 ? (
          visibleActions
        ) : (
          <DropdownMenuItem
            disabled
            className='font-manrope justify-center py-3 text-center text-muted-foreground'
          >
            No actions available
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Pre-configured action creators for common use cases
export function createViewAction<T extends { id: number | string }>(
  basePath: string,
  icon?: React.ComponentType<{ size?: number; className?: string }>,
  permission?: { resource: string; actions: string | string[] }
): ActionItem<T> {
  return {
    type: 'link',
    label: 'View Details',
    icon,
    href: (data) => `${basePath}/${data.id}`,
    permission
  }
}

export function createEditAction<T extends { id: number | string }>(
  basePath: string,
  icon?: React.ComponentType<{ size?: number; className?: string }>,
  permission?: { resource: string; actions: string | string[] }
): ActionItem<T> {
  return {
    type: 'link',
    label: 'Edit',
    icon,
    href: (data) => `${basePath}/${data.id}/edit`,
    permission
  }
}

export function createDeleteAction<T>(
  onDelete: (data: T) => void,
  icon?: React.ComponentType<{ size?: number; className?: string }>,
  label: string = 'Delete',
  permission?: { resource: string; actions: string | string[] }
): ActionItem<T> {
  return {
    type: 'action',
    label,
    icon,
    variant: 'destructive',
    onClick: onDelete,
    className: '',
    permission
  }
}

export function createSeparator(): ActionItem {
  return {
    type: 'separator'
  }
}
