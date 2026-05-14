'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { PageItem } from '@/lib/validations/schemas/pageSchema'
import { AnimatePresence, motion } from 'framer-motion'
import { FileText, Plus, Sparkles } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useMenuBuilder } from './hooks/useMenuBuilder'
import MenuItemCard from './MenuItemCard'
import { FlatMenuItem } from './utils/menuHelpers'

interface MenuBuilderProps {
  items: PageItem[]
  onChange: (items: PageItem[]) => void
  onEditContent: (itemId: string) => void
  onEdit?: (item: PageItem) => void
  className?: string
}

interface DragPlaceholderProps {
  isVisible: boolean
  depth: number
  type?: 'reorder' | 'nest'
}

function DragPlaceholder({ isVisible, depth, type = 'reorder' }: DragPlaceholderProps) {
  const indentLevel = depth * 24

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, height: 0, scale: 0.8 }}
          animate={{ opacity: 1, height: 'auto', scale: 1 }}
          exit={{ opacity: 0, height: 0, scale: 0.8 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={cn(
            'relative mx-2 my-1 border-2 border-dashed rounded-lg overflow-hidden transition-all duration-200',
            type === 'nest' ? 'border-blue-400 bg-blue-50' : 'border-primary/60 bg-primary/5',
            'h-12 flex items-center justify-center'
          )}
          style={{ marginLeft: indentLevel + 12 }}
        >
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'linear'
            }}
            className='absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent'
          />

          <div
            className={cn(
              'z-10 relative flex items-center gap-2 px-3 py-1 rounded-full font-medium text-sm',
              type === 'nest' ? 'text-blue-600 bg-blue-100' : 'text-primary bg-primary/10'
            )}
          >
            {type === 'nest' ? (
              <>
                <span className='text-xs'>↳</span>
                Drop here to create submenu
              </>
            ) : (
              <>
                <span className='text-xs'>↕</span>
                Drop here to reorder
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function MenuBuilder({
  items,
  onChange,
  onEditContent,
  onEdit,
  className
}: MenuBuilderProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [newItemTitle, setNewItemTitle] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)

  const menuBuilder = useMenuBuilder(items, onChange)

  const toggleExpanded = useCallback((itemId: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }, [])

  const handleAddRootItem = useCallback(() => {
    if (newItemTitle.trim()) {
      menuBuilder.addMenuItem(newItemTitle.trim())
      setNewItemTitle('')
      setShowAddForm(false)
    }
  }, [newItemTitle, menuBuilder])

  const handleAddChildItem = useCallback(
    (parentId: string) => {
      const title = window.prompt('Enter menu item title:')
      if (title?.trim()) {
        menuBuilder.addMenuItem(title.trim(), parentId)
      }
    },
    [menuBuilder]
  )

  const renderMenuItem = (item: FlatMenuItem, index: number) => {
    const children = menuBuilder.getItemChildren(item.slug)
    const isExpanded = expandedItems.has(item.slug)
    const isDragging = menuBuilder.dragContext.draggedItemId === item.slug
    const isDraggedOver = menuBuilder.dragContext.dragOverItemId === item.slug
    const isNestTarget = menuBuilder.dragPosition.nestingInfo.targetParentId === item.slug
    const dragFeedback =
      menuBuilder.dragContext.draggedItemId === item.slug ? menuBuilder.getDragFeedback() : null

    return (
      <div key={item.slug}>
        {/* Placeholder above item */}
        <DragPlaceholder
          isVisible={
            menuBuilder.dragPosition.placeholderIndex === index &&
            menuBuilder.dragContext.draggedItemId !== null
          }
          depth={item.depth}
          type={dragFeedback?.type === 'nest' ? 'nest' : 'reorder'}
        />

        <MenuItemCard
          item={item}
          childrenCount={children.length}
          isExpanded={isExpanded}
          isDragging={isDragging}
          isDraggedOver={isDraggedOver}
          isNestTarget={isNestTarget}
          dragFeedback={dragFeedback}
          indentOffset={menuBuilder.dragPosition.getIndentOffset()}
          onDragStart={menuBuilder.handleDragStart}
          onDragEnd={menuBuilder.handleDragEnd}
          onDragOver={menuBuilder.handleDragOver}
          onEdit={() => {
            if (onEdit) {
              // Convert FlatMenuItem back to PageItem format for the modal
              const pageItem: PageItem = {
                ...item,
                children: children // Include children for proper structure
              }
              onEdit(pageItem)
            }
          }}
          onDelete={menuBuilder.removeMenuItem}
          onToggleActive={(itemId) => {
            const item = menuBuilder.flatItems.find((i) => i.slug === itemId)
            if (item) {
              menuBuilder.updateMenuItem(itemId, { isActive: !item.isActive })
            }
          }}
          onToggleInMenu={(itemId) => {
            const item = menuBuilder.flatItems.find((i) => i.slug === itemId)
            if (item) {
              menuBuilder.updateMenuItem(itemId, { showInMenu: !item.showInMenu })
            }
          }}
          onToggleExpanded={toggleExpanded}
          onAddChild={handleAddChildItem}
          onEditContent={onEditContent}
          onUpdate={menuBuilder.updateMenuItem}
        />

        {/* Render children */}
        {isExpanded && children.length > 0 && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className='space-y-2 ml-6 pl-4 border-border/30 border-l'
            >
              {children.map((child, childIndex) => renderMenuItem(child, index + childIndex + 1))}
            </motion.div>
          </AnimatePresence>
        )}

        {/* Placeholder below item */}
        {index === menuBuilder.visibleItems.length - 1 && (
          <DragPlaceholder
            isVisible={
              menuBuilder.dragPosition.placeholderIndex === index + 1 &&
              menuBuilder.dragContext.draggedItemId !== null
            }
            depth={0}
            type='reorder'
          />
        )}
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className='flex justify-between items-center'>
        <div className='flex items-center gap-2'>
          <Sparkles className='w-5 h-5 text-primary' />
          <h3 className='font-semibold text-lg'>Menu Builder</h3>
          {menuBuilder.isModified && (
            <div className='bg-primary rounded-full w-2 h-2 animate-pulse' />
          )}
        </div>

        <Button
          onClick={() => setShowAddForm(true)}
          size='sm'
          className='gap-2'
          disabled={showAddForm}
          type='button'
        >
          <Plus className='w-4 h-4' />
          Add Item
        </Button>
      </div>

      {/* Add Item Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Card className='border-primary/30 border-dashed'>
              <CardContent className='pt-4'>
                <div className='flex gap-2'>
                  <Input
                    value={newItemTitle}
                    onChange={(e) => setNewItemTitle(e.target.value)}
                    placeholder='Enter menu item title...'
                    className='flex-1'
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddRootItem()
                      } else if (e.key === 'Escape') {
                        setShowAddForm(false)
                        setNewItemTitle('')
                      }
                    }}
                  />
                  <Button onClick={handleAddRootItem} disabled={!newItemTitle.trim()} type='button'>
                    Add
                  </Button>
                  <Button
                    variant='outline'
                    onClick={() => {
                      setShowAddForm(false)
                      setNewItemTitle('')
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Menu Items */}
      <Card className='bg-transparent p-0'>
        <CardContent className='p-0'>
          {menuBuilder.visibleItems.length === 0 ? (
            <motion.div
              className={cn(
                'flex flex-col justify-center items-center py-12 text-muted-foreground transition-all duration-300',
                menuBuilder.dragContext.draggedItemId
                  ? 'border-2 border-dashed border-primary bg-primary/5'
                  : ''
              )}
              animate={{
                scale: menuBuilder.dragContext.draggedItemId ? 1.01 : 1,
                borderColor: menuBuilder.dragContext.draggedItemId
                  ? 'var(--primary)'
                  : 'transparent'
              }}
              transition={{ duration: 0.2 }}
            >
              {menuBuilder.dragContext.draggedItemId ? (
                <>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className='bg-primary/10 mb-4 p-4 rounded-full'
                  >
                    <Plus className='w-8 h-8 text-primary' />
                  </motion.div>
                  <p className='mb-2 font-medium text-primary text-lg'>
                    Drop here to add as root item
                  </p>
                  <p className='max-w-sm text-primary/70 text-sm text-center'>
                    Release to place this item at the top level of your menu.
                  </p>
                </>
              ) : (
                <>
                  <FileText className='opacity-50 mb-4 w-12 h-12' />
                  <p className='mb-2 font-medium text-lg'>No menu items yet</p>
                  <p className='max-w-sm text-sm text-center'>
                    Add your first menu item to get started building your navigation structure.
                  </p>
                  <Button
                    type='button'
                    onClick={() => setShowAddForm(true)}
                    variant='outline'
                    className='gap-2 mt-4'
                  >
                    <Plus className='w-4 h-4' />
                    Create Your First Item
                  </Button>
                </>
              )}
            </motion.div>
          ) : (
            <div className='divide-y divide-border'>
              <AnimatePresence mode='popLayout'>
                {menuBuilder.visibleItems.map((item, index) => (
                  <motion.div
                    key={item.slug}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {renderMenuItem(item, index)}
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Final drop zone */}
              {menuBuilder.dragContext.draggedItemId && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className='p-4 border-primary/30 border-t border-dashed'
                >
                  <div className='flex justify-center items-center bg-primary/5 py-4 border-2 border-primary/40 border-dashed rounded-lg text-primary'>
                    <span className='font-medium text-sm'>Drop here to add at the end</span>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className='bg-gradient-to-r from-foreground to-background'>
        <CardHeader className='pb-3'>
          <CardTitle className='font-medium text-primary text-sm'>🎯 Drag & Drop Guide</CardTitle>
        </CardHeader>
        <CardContent className='pt-0'>
          <ul className='space-y-1 text-primary text-xs'>
            <li>
              • <strong>Vertical drag:</strong> Reorder items in the same level
            </li>
            <li>
              • <strong>Horizontal drag:</strong> Drag right to create submenus, left to move up
            </li>
            <li>
              • <strong>Drop zones:</strong> Look for &quot;Drop here&quot; indicators while
              dragging
            </li>
            <li>
              • <strong>Visual feedback:</strong> Blue highlights show submenu creation areas
            </li>
            <li>
              • <strong>One level only:</strong> Maximum depth is parent → child (2 levels)
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
