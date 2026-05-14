'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Check,
  ChevronDown,
  ChevronRight,
  Edit,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  GripVertical,
  Menu,
  Plus,
  Settings,
  Trash2,
  X
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { FlatMenuItem } from './utils/menuHelpers'

interface MenuItemCardProps {
  item: FlatMenuItem
  childrenCount?: number
  isExpanded?: boolean
  isDragging: boolean
  isDraggedOver: boolean
  isNestTarget: boolean
  dragFeedback?: {
    type: 'nest' | 'unnest' | 'reorder'
    message: string
    color: string
  } | null
  indentOffset?: number
  onDragStart: (
    itemId: string,
    position: { x: number; y: number; offsetX: number; offsetY: number }
  ) => void
  onDragEnd: () => void
  onDragOver: (
    itemId: string,
    position: { x: number; y: number; offsetX: number; offsetY: number },
    dropPosition?: 'before' | 'after' | 'child'
  ) => void
  onEdit: (itemId: string) => void
  onDelete: (itemId: string) => void
  onToggleActive: (itemId: string) => void
  onToggleInMenu: (itemId: string) => void
  onToggleExpanded?: (itemId: string) => void
  onAddChild: (parentId: string) => void
  onEditContent: (itemId: string) => void
  onUpdate: (itemId: string, updates: Partial<FlatMenuItem>) => void
}

export default function MenuItemCard({
  item,
  childrenCount = 0,
  isExpanded = false,
  isDragging,
  isDraggedOver,
  isNestTarget,
  dragFeedback,
  indentOffset = 0,
  onDragStart,
  onDragEnd,
  onDragOver,
  onEdit,
  onDelete,
  onToggleActive,
  onToggleExpanded,
  onAddChild,
  onEditContent,
  onUpdate
}: MenuItemCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(item.title)
  const [editUrl, setEditUrl] = useState(item.url || '')
  const dragRef = useRef<HTMLDivElement>(null)

  const hasChildren = childrenCount > 0

  useEffect(() => {
    setEditTitle(item.title)
    setEditUrl(item.url || '')
  }, [item.title, item.url])

  const handleDragStart = (e: React.DragEvent) => {
    if (!dragRef.current) return

    const rect = dragRef.current.getBoundingClientRect()
    onDragStart(item.slug, {
      x: e.clientX,
      y: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top
    })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()

    if (!dragRef.current) return

    const rect = dragRef.current.getBoundingClientRect()
    const y = e.clientY - rect.top
    const height = rect.height

    let dropPosition: 'before' | 'after' | 'child' = 'after'

    // More intuitive drop position detection
    if (y < height * 0.33) {
      dropPosition = 'before'
    } else if (y > height * 0.67) {
      dropPosition = 'after'
    } else if (item.depth === 0) {
      // Middle section for root items can create children
      dropPosition = 'child'
    }

    onDragOver(
      item.slug,
      {
        x: e.clientX,
        y: e.clientY,
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top
      },
      dropPosition
    )
  }

  const handleSaveEdit = () => {
    if (editTitle.trim()) {
      onUpdate(item.slug, {
        title: editTitle.trim(),
        url: editUrl.trim() || undefined,
        slug: editTitle.toLowerCase().replace(/\s+/g, '-')
      })
    }
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setEditTitle(item.title)
    setEditUrl(item.url || '')
    setIsEditing(false)
  }

  const cardVariants = {
    initial: { opacity: 0, y: -10 },
    animate: {
      opacity: 1,
      y: 0,
      x: indentOffset
    },
    exit: {
      opacity: 0,
      x: -10
    },
    drag: {
      scale: 1.02,
      rotate: isDragging ? 2 : 0,
      zIndex: 50
    }
  }

  const nestFeedbackVariants = {
    initial: { opacity: 0, scale: 0.8 },
    animate: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.2 }
    },
    exit: {
      opacity: 0,
      scale: 0.8,
      transition: { duration: 0.15 }
    }
  }

  return (
    <motion.div
      ref={dragRef}
      variants={cardVariants}
      initial='initial'
      animate={isDragging ? 'drag' : 'animate'}
      exit='exit'
      layout
      className={cn(
        'group relative shadow rounded-lg transition-all duration-200',
        'hover:border-primary/30 hover:shadow-sm cursor-pointer',
        isDraggedOver && 'ring-2 ring-primary/30 border-primary/50',
        isNestTarget && 'ring-2 ring-blue-400/50 border-blue-400/50',
        isDragging && 'shadow-xl border-primary/50 scale-105 rotate-1'
      )}
      onDragOver={handleDragOver}
      onDrop={(e) => {
        e.preventDefault()
        // Handle drop if needed
      }}
    >
      {/* Drag Feedback Overlay */}
      <AnimatePresence>
        {dragFeedback && (
          <motion.div
            variants={nestFeedbackVariants}
            initial='initial'
            animate='animate'
            exit='exit'
            className={cn(
              '-top-8 left-4 z-10 absolute rounded font-medium text-xs',
              'bg-background border shadow-sm',
              dragFeedback.color === 'blue' && 'border-blue-400 text-blue-700 bg-blue-50',
              dragFeedback.color === 'green' && 'border-green-400 text-green-700 bg-green-50',
              dragFeedback.color === 'gray' && 'border-gray-400 text-gray-700 bg-gray-50'
            )}
          >
            {dragFeedback.message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className='flex items-center gap-3 p-2.5'>
        {/* Drag Handle */}
        <div
          className={cn(
            'opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing',
            isDragging && 'opacity-100'
          )}
          draggable
          onDragStart={handleDragStart}
          onDragEnd={onDragEnd}
          onDragOver={handleDragOver}
        >
          <GripVertical className='w-4 h-4 text-muted-foreground' />
        </div>

        {/* Expand/collapse */}
        <div className='flex justify-center items-center w-4 h-4'>
          {hasChildren && onToggleExpanded && (
            <Button
              variant='ghost'
              size='sm'
              className='p-0 w-6 h-6'
              onClick={() => onToggleExpanded(item.slug)}
              type='button'
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? (
                <ChevronDown className='w-3 h-3' />
              ) : (
                <ChevronRight className='w-3 h-3' />
              )}
            </Button>
          )}
        </div>

        {/* Content */}
        <div className='flex-1 min-w-0'>
          {isEditing ? (
            <div className='space-y-2'>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className='h-8'
                placeholder='Menu item title'
                autoFocus
              />
              <Input
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
                className='h-8'
                placeholder='URL (optional)'
              />
              <div className='flex gap-1'>
                <Button type='button' size='sm' variant='outline' onClick={handleSaveEdit}>
                  <Check className='w-3 h-3' />
                </Button>
                <Button type='button' size='sm' variant='outline' onClick={handleCancelEdit}>
                  <X className='w-3 h-3' />
                </Button>
              </div>
            </div>
          ) : (
            <div className='flex items-center gap-2 min-w-0'>
              {item.url ? (
                <ExternalLink className='w-3 h-3 text-blue-500' />
              ) : item.hasContent ? (
                <FileText className='w-3 h-3 text-green-500' />
              ) : (
                <Menu className='w-3 h-3 text-gray-400' />
              )}
              <span className={`text-sm ${!item.isActive ? 'text-gray-400 line-through' : ''}`}>
                {item.title}
              </span>

              {hasChildren && (
                <span className='shrink-0 text-muted-foreground text-xs'>
                  {childrenCount} items
                </span>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div
          className={cn(
            'flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity',
            isEditing && 'opacity-100'
          )}
        >
          {!isEditing && (
            <>
              <Button
                type='button'
                variant='ghost'
                size='sm'
                className='p-0 w-8 h-8'
                onClick={() => setIsEditing(true)}
                title='Quick Edit'
              >
                <Edit className='w-3 h-3' />
              </Button>

              <Button
                type='button'
                variant='ghost'
                size='sm'
                className='p-0 w-8 h-8'
                onClick={() => onEdit(item.slug)}
                title='Page Settings'
              >
                <Settings className='w-3 h-3' />
              </Button>

              {!item.url && (
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  className='p-0 w-8 h-8'
                  onClick={() => onEditContent(item.slug)}
                  title='Edit Content'
                >
                  <FileText className='w-3 h-3' />
                </Button>
              )}

              {/* <Switch
                checked={item.showInMenu}
                onCheckedChange={() => onToggleInMenu(item.slug)}
                className='scale-75'
              /> */}

              {item.depth === 0 && (
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  className='p-0 w-8 h-8'
                  onClick={() => onAddChild(item.slug)}
                  title='Add Child Item'
                >
                  <Plus className='w-3 h-3' />
                </Button>
              )}

              <Button
                type='button'
                variant='ghost'
                size='sm'
                className='p-0 w-8 h-8'
                onClick={() => onToggleActive(item.slug)}
                title={item.isActive ? 'Deactivate' : 'Activate'}
              >
                {item.isActive ? (
                  <Eye className='w-3 h-3 text-green-600' />
                ) : (
                  <EyeOff className='w-3 h-3' />
                )}
              </Button>

              <Button
                type='button'
                variant='ghost'
                size='sm'
                className='p-0 w-8 h-8 text-destructive hover:text-destructive'
                onClick={() => onDelete(item.slug)}
                title='Delete Item'
              >
                <Trash2 className='w-3 h-3' />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Drop Zones */}
      {isDraggedOver && (
        <>
          <div className='-top-1 right-0 left-0 absolute bg-primary/20 rounded-t h-2' />
          <div className='right-0 -bottom-1 left-0 absolute bg-primary/20 rounded-b h-2' />
        </>
      )}
    </motion.div>
  )
}
