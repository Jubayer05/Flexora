'use client'

import CustomLink from '@/components/common/CustomLink'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { PageItem } from '@/lib/validations/schemas/pageSchema'
import { ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface DropdownNavItemProps {
  item: PageItem
  className?: string
  onItemClick?: () => void
}

const HOVER_DELAY_MS = 150

export default function DropdownNavItem({ item, className, onItemClick }: DropdownNavItemProps) {
  const [isOpen, setIsOpen] = useState(false)
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const hasChildren = item.children && item.children.length > 0

  const clearCloseTimeout = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
  }

  const scheduleClose = () => {
    clearCloseTimeout()
    closeTimeoutRef.current = setTimeout(() => setIsOpen(false), HOVER_DELAY_MS)
  }

  const handleTriggerEnter = () => {
    if (hasChildren) {
      clearCloseTimeout()
      setIsOpen(true)
    }
  }

  const handleTriggerLeave = () => {
    if (hasChildren) scheduleClose()
  }

  const handleContentEnter = () => {
    clearCloseTimeout()
    setIsOpen(true)
  }

  const handleContentLeave = () => {
    scheduleClose()
  }

  const handleItemClick = () => {
    setIsOpen(false)
    onItemClick?.()
  }

  useEffect(() => {
    return () => clearCloseTimeout()
  }, [])

  if (!hasChildren) {
    return (
      <CustomLink
        href={item.url || `/pages/${item.slug}`}
        className={cn(
          'relative font-medium text-on-surface/80 hover:text-primary text-sm whitespace-nowrap transition-colors',
          'after:absolute after:left-1/2 after:bottom-1 after:h-px after:w-0 after:-translate-x-1/2 after:bg-linear-to-r after:from-primary after:via-primary/60 after:to-transparent after:transition-all after:duration-300 hover:after:w-2/3',
          className
        )}
        onClick={handleItemClick}
      >
        {item.title}
      </CustomLink>
    )
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type='button'
          onMouseEnter={handleTriggerEnter}
          onMouseLeave={handleTriggerLeave}
          className={cn(
            'relative flex items-center gap-1 font-medium text-on-surface/80 hover:text-primary text-sm transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-full bg-transparent border-none',
            'after:absolute after:left-1/2 after:bottom-1 after:h-px after:w-0 after:-translate-x-1/2 after:bg-linear-to-r after:from-primary after:via-primary/60 after:to-transparent after:transition-all after:duration-300 hover:after:w-2/3',
            className
          )}
        >
          <span>{item.title}</span>
          <ChevronDown
            className={cn('w-4 h-4 transition-transform duration-200', isOpen && 'rotate-180')}
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align='start'
        sideOffset={4}
        onMouseEnter={handleContentEnter}
        onMouseLeave={handleContentLeave}
        onCloseAutoFocus={(e) => e.preventDefault()}
        className='min-w-[220px] p-1.5 border border-outline-variant bg-surface-container text-on-surface shadow-xl'
      >
        {item.children?.map((child, index) => (
          <DropdownMenuItem key={child.id || index} asChild>
            <CustomLink
              href={child.url || `/pages/${child.slug}`}
              onClick={handleItemClick}
              className={cn(
                'flex cursor-pointer rounded-lg px-3 py-2.5 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface text-sm transition-colors focus:bg-surface-container-high focus:text-on-surface',
                index < (item.children?.length ?? 0) - 1 && 'mb-0.5'
              )}
            >
              {child.title}
            </CustomLink>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
