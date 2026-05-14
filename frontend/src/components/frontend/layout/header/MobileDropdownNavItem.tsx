'use client'

import CustomLink from '@/components/common/CustomLink'
import { cn } from '@/lib/utils'
import { PageItem } from '@/lib/validations/schemas/pageSchema'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'

interface MobileDropdownNavItemProps {
  item: PageItem
  onItemClick?: () => void
  depth?: number
}

export default function MobileDropdownNavItem({
  item,
  onItemClick,
  depth = 0
}: MobileDropdownNavItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const hasChildren = item.children && item.children.length > 0

  const handleToggle = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded)
    }
  }

  const handleLinkClick = () => {
    onItemClick?.()
  }

  return (
    <div className='w-full'>
      {/* Parent Item */}
      <div
        className={cn(
          'flex justify-between items-center w-full',
          depth > 0 && 'ml-4 border-l border-border'
        )}
      >
        {hasChildren ? (
          <button
            onClick={handleToggle}
            className={cn(
              'flex justify-between items-center hover:bg-accent/70 px-3 py-2 rounded-lg w-full font-medium text-foreground hover:text-primary text-left transition-colors',
              depth > 0 && 'text-sm rounded-none'
            )}
          >
            <span>{item.title}</span>
            {isExpanded ? (
              <ChevronDown className='w-4 h-4 transition-transform duration-200' />
            ) : (
              <ChevronRight className='w-4 h-4 transition-transform duration-200' />
            )}
          </button>
        ) : (
          <CustomLink
            href={item.url || `/pages/${item.slug}`}
            onClick={handleLinkClick}
            className={cn(
              'block hover:bg-accent/70 px-3 py-2 rounded-lg w-full font-medium text-foreground hover:text-primary transition-colors',
              depth > 0 && 'text-sm rounded-none'
            )}
          >
            {item.title}
          </CustomLink>
        )}
      </div>

      {/* Children */}
      {hasChildren && (
        <div
          className={cn(
            'w-full overflow-hidden transition-all duration-300 ease-out',
            isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          )}
        >
          <div className='space-y-1 mt-1 pr-4'>
            {item.children?.map((child, index) => (
              <MobileDropdownNavItem
                key={child.id || index}
                item={child}
                onItemClick={onItemClick}
                depth={depth + 1}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
