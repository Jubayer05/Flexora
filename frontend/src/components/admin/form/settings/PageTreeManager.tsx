'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { buildPageTree, flattenPageTree, generateSlug } from '@/lib/pageTreeUtils'
import { PageItem, PageTreeNode } from '@/lib/validations/schemas/pageSchema'
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ChevronDown,
  ChevronLeft,
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
  Trash2
} from 'lucide-react'
import { useState } from 'react'

interface PageTreeManagerProps {
  pages: PageItem[]
  onPagesChange: (pages: PageItem[]) => void
  onEditContent: (slug: string) => void
  onAddPage: (parentSlug?: string) => void
}

interface DraggedItem {
  id: string
  type: 'page'
  data: PageTreeNode
  canMoveRight: boolean
  canMoveLeft: boolean
}

export default function PageTreeManager({
  pages,
  onPagesChange,
  onEditContent,
  onAddPage
}: PageTreeManagerProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [draggedItem, setDraggedItem] = useState<DraggedItem | null>(null)
  const [editingSlug, setEditingSlug] = useState<string | null>(null)
  const [editingData, setEditingData] = useState<Partial<PageItem>>({})

  // Convert nested structure to flat structure for internal operations
  const flatPages = flattenPagesStructure(pages)
  const tree = buildPageTree(flatPages)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    })
  )

  // Convert flat structure back to nested structure before calling onPagesChange
  const handlePagesChange = (newFlatPages: PageItem[]) => {
    const nestedPages = convertFlatToNested(newFlatPages)
    onPagesChange(nestedPages)
  }

  // Helper function to flatten nested structure to flat structure for internal operations
  function flattenPagesStructure(pages: PageItem[]): PageItem[] {
    const flattened: PageItem[] = []

    const flatten = (items: PageItem[], parentSlug?: string) => {
      items.forEach((item, index) => {
        const flatItem: PageItem = {
          ...item,
          parentSlug,
          menuOrder: index,
          children: [] // Reset children for flat structure
        }
        flattened.push(flatItem)

        if (item.children && item.children.length > 0) {
          flatten(item.children, item.slug)
        }
      })
    }

    flatten(pages)
    return flattened
  }

  // Helper function to convert flat structure back to nested structure
  function convertFlatToNested(flatPages: PageItem[]): PageItem[] {
    const pageMap = new Map<string, PageItem>()
    const rootPages: PageItem[] = []

    // Create a map of all pages with children arrays initialized
    flatPages.forEach((page) => {
      pageMap.set(page.slug, { ...page, children: [] })
    })

    // Build the nested structure
    flatPages.forEach((page) => {
      const pageWithChildren = pageMap.get(page.slug)!

      if (page.parentSlug) {
        const parent = pageMap.get(page.parentSlug)
        if (parent) {
          parent.children = parent.children || []
          parent.children.push(pageWithChildren)
        }
      } else {
        rootPages.push(pageWithChildren)
      }
    })

    // Sort children by menuOrder
    const sortChildren = (items: PageItem[]) => {
      items.sort((a, b) => a.menuOrder - b.menuOrder)
      items.forEach((item) => {
        if (item.children && item.children.length > 0) {
          sortChildren(item.children)
        }
      })
    }

    sortChildren(rootPages)
    return rootPages
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const page = pages.find((p) => p.slug === active.id)
    if (page) {
      const treeNode = buildPageTree([page])[0]
      // Calculate move capabilities based on tree structure
      const flattenedPages = flattenPageTree(tree)
      const currentIndex = flattenedPages.findIndex((p) => p.id === active.id)
      const prevPage = currentIndex > 0 ? flattenedPages[currentIndex - 1] : null
      const canMoveRight = prevPage ? prevPage.depth < 10 : false // Allow up to 11 levels (0-10)
      const canMoveLeft = treeNode.depth > 0

      setDraggedItem({
        id: active.id as string,
        type: 'page',
        data: treeNode,
        canMoveRight,
        canMoveLeft
      })
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over, delta } = event
    setDraggedItem(null)

    if (!active.id) return

    const activeItem = pages.find((p) => p.slug === active.id)
    if (!activeItem) return

    // Detect horizontal drag for hierarchy changes
    const horizontalThreshold = 30 // pixels
    const verticalThreshold = 10 // pixels to prevent accidental hierarchy changes

    if (Math.abs(delta.x) > horizontalThreshold && Math.abs(delta.y) < verticalThreshold) {
      // Handle hierarchy change (left/right drag)
      handleHierarchyChange(activeItem, delta.x > 0 ? 'right' : 'left')
      return
    }

    // Handle vertical reordering
    if (!over || active.id === over.id) return

    const overItem = pages.find((p) => p.slug === over.id)
    if (!overItem) return

    handleVerticalReorder(activeItem, overItem)
  }

  const handleHierarchyChange = (item: PageItem, direction: 'left' | 'right') => {
    const newPages = [...pages]
    const itemIndex = newPages.findIndex((p) => p.slug === item.slug)

    if (direction === 'right') {
      // Move right: make it a child of the previous item
      if (itemIndex > 0) {
        const previousItem = newPages[itemIndex - 1]
        // Find a suitable parent (not already a child of the current item)
        if (!isDescendant(item.slug, previousItem.slug, newPages)) {
          // Update the moved item with new parent relationship
          newPages[itemIndex] = {
            ...item,
            parentSlug: previousItem.slug,
            depth: (previousItem.depth || 0) + 1,
            menuOrder: getNextChildOrder(previousItem.slug, newPages),
            // Update path to reflect new hierarchy
            path: previousItem.path
              ? `${previousItem.path}/${item.slug}`
              : `/${previousItem.slug}/${item.slug}`
          }

          // Update all descendants of this item to reflect new depth and path
          updateDescendantHierarchy(item.slug, newPages)

          // Expand the parent node
          setExpandedNodes((prev) => new Set([...prev, previousItem.slug]))
        }
      }
    } else {
      // Move left: move up one level in hierarchy
      if (item.parentSlug) {
        const parent = newPages.find((p) => p.slug === item.parentSlug)
        const grandParentSlug = parent?.parentSlug
        const grandParent = grandParentSlug
          ? newPages.find((p) => p.slug === grandParentSlug)
          : null

        // Update the moved item with new parent relationship
        newPages[itemIndex] = {
          ...item,
          parentSlug: grandParentSlug,
          depth: grandParent ? (grandParent.depth || 0) + 1 : 0,
          menuOrder: getNextSiblingOrder(grandParentSlug, newPages),
          // Update path to reflect new hierarchy
          path: grandParent?.path
            ? `${grandParent.path}/${item.slug}`
            : grandParentSlug
            ? `/${grandParentSlug}/${item.slug}`
            : `/${item.slug}`
        }

        // Update all descendants of this item to reflect new depth and path
        updateDescendantHierarchy(item.slug, newPages)
      }
    }

    handlePagesChange(newPages)
  }

  // Helper function to update all descendants when an item's hierarchy changes
  const updateDescendantHierarchy = (parentSlug: string, allPages: PageItem[]) => {
    const parent = allPages.find((p) => p.slug === parentSlug)
    if (!parent) return

    const descendants = allPages.filter((p) => p.parentSlug === parentSlug)
    descendants.forEach((descendant) => {
      const descendantIndex = allPages.findIndex((p) => p.slug === descendant.slug)
      if (descendantIndex !== -1) {
        allPages[descendantIndex] = {
          ...descendant,
          depth: parent.depth + 1,
          path: parent.path
            ? `${parent.path}/${descendant.slug}`
            : `/${parent.slug}/${descendant.slug}`
        }
        // Recursively update deeper descendants
        updateDescendantHierarchy(descendant.slug, allPages)
      }
    })
  }

  const handleVerticalReorder = (activeItem: PageItem, overItem: PageItem) => {
    const newPages = [...pages]
    const activeIndex = newPages.findIndex((p) => p.slug === activeItem.slug)
    const overIndex = newPages.findIndex((p) => p.slug === overItem.slug)

    // Only reorder if items are at the same hierarchy level
    if (activeItem.parentSlug === overItem.parentSlug) {
      // Remove active item and insert at new position
      const [movedItem] = newPages.splice(activeIndex, 1)
      newPages.splice(overIndex, 0, movedItem)

      // Update menu orders for items at the same level
      updateMenuOrdersForLevel(newPages, movedItem.parentSlug)

      // Update path if needed (maintain hierarchy consistency)
      const updatedItem = newPages.find((p) => p.slug === movedItem.slug)
      if (updatedItem) {
        updateDescendantHierarchy(updatedItem.slug, newPages)
      }
    }

    handlePagesChange(newPages)
  }

  // Helper function to check if an item is a descendant of another
  const isDescendant = (
    ancestorSlug: string,
    candidateSlug: string,
    allPages: PageItem[]
  ): boolean => {
    const candidate = allPages.find((p) => p.slug === candidateSlug)
    if (!candidate || !candidate.parentSlug) return false

    if (candidate.parentSlug === ancestorSlug) return true
    return isDescendant(ancestorSlug, candidate.parentSlug, allPages)
  }

  // Helper function to get next child order
  const getNextChildOrder = (parentSlug: string, allPages: PageItem[]): number => {
    const siblings = allPages.filter((p) => p.parentSlug === parentSlug)
    const maxOrder = Math.max(...siblings.map((s) => s.menuOrder || 0), -1)
    return maxOrder + 1
  }

  // Helper function to get next sibling order
  const getNextSiblingOrder = (parentSlug: string | undefined, allPages: PageItem[]): number => {
    const siblings = allPages.filter((p) => p.parentSlug === parentSlug)
    const maxOrder = Math.max(...siblings.map((s) => s.menuOrder || 0), -1)
    return maxOrder + 1
  }

  // Helper function to update menu orders for items at the same level
  const updateMenuOrdersForLevel = (allPages: PageItem[], parentSlug: string | undefined) => {
    const siblings = allPages.filter((p) => p.parentSlug === parentSlug)
    siblings.forEach((sibling, index) => {
      const siblingIndex = allPages.findIndex((p) => p.slug === sibling.slug)
      if (siblingIndex !== -1) {
        allPages[siblingIndex].menuOrder = index
      }
    })
  }

  const toggleExpanded = (slug: string) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(slug)) {
      newExpanded.delete(slug)
    } else {
      newExpanded.add(slug)
    }
    setExpandedNodes(newExpanded)
  }

  // Recursive function to find a page by slug in nested structure
  const findPageBySlug = (pages: PageItem[], slug: string): PageItem | undefined => {
    for (const page of pages) {
      // Check current page
      if (page.slug === slug) {
        return page
      }

      // Recursively check children if they exist
      if (page.children && page.children.length > 0) {
        const found = findPageBySlug(page.children, slug)
        if (found) {
          return found
        }
      }
    }
    return undefined
  }

  const handleEditInline = (slug: string) => {
    // Search recursively through all pages and children
    const page = findPageBySlug(pages, slug)
    if (page) {
      setEditingSlug(slug)
      setEditingData({ ...page })
    }
  }

  const handleSaveInline = () => {
    if (!editingSlug || !editingData.title) return

    const newPages = flatPages.map((page) => {
      if (page.slug === editingSlug) {
        const newSlug = editingData.slug || generateSlug(editingData.title!)
        const parent = page.parentSlug ? flatPages.find((p) => p.slug === page.parentSlug) : null
        const newPath = parent?.path
          ? `${parent.path}/${newSlug}`
          : parent
          ? `/${parent.slug}/${newSlug}`
          : `/${newSlug}`

        return {
          ...page,
          ...editingData,
          slug: newSlug,
          path: newPath
        }
      }
      return page
    })

    // Update any children that reference the old slug as parentSlug
    if (editingData.slug && editingData.slug !== editingSlug) {
      const updatedPages = newPages.map((page) => {
        if (page.parentSlug === editingSlug) {
          return {
            ...page,
            parentSlug: editingData.slug
          }
        }
        return page
      })

      // Update descendants hierarchy after slug change
      const updatedItem = updatedPages.find((p) => p.slug === editingData.slug)
      if (updatedItem) {
        updateDescendantHierarchy(updatedItem.slug, updatedPages)
      }

      handlePagesChange(updatedPages)
    } else {
      handlePagesChange(newPages)
    }

    setEditingSlug(null)
    setEditingData({})
  }

  const handleCancelEdit = () => {
    setEditingSlug(null)
    setEditingData({})
  }

  const handleToggleActive = (slug: string) => {
    const newPages = flatPages.map((page) =>
      page.slug === slug ? { ...page, isActive: !page.isActive } : page
    )
    handlePagesChange(newPages)
  }

  const handleToggleInMenu = (slug: string) => {
    const newPages = flatPages.map((page) =>
      page.slug === slug ? { ...page, showInMenu: !page.showInMenu } : page
    )
    handlePagesChange(newPages)
  }

  const handleDelete = (slug: string) => {
    const itemToDelete = flatPages.find((p) => p.slug === slug)
    if (!itemToDelete) return

    let newPages = [...flatPages]

    // Find all children of the item being deleted
    const children = newPages.filter((p) => p.parentSlug === slug)

    // Move children up one level in hierarchy or remove them based on preference
    // Option 1: Move children to the parent of the deleted item (promote them)
    children.forEach((child) => {
      const childIndex = newPages.findIndex((p) => p.slug === child.slug)
      if (childIndex !== -1) {
        newPages[childIndex] = {
          ...child,
          parentSlug: itemToDelete.parentSlug, // Move to deleted item's parent
          depth: itemToDelete.parentSlug
            ? (newPages.find((p) => p.slug === itemToDelete.parentSlug)?.depth || 0) + 1
            : 0,
          menuOrder: getNextSiblingOrder(itemToDelete.parentSlug, newPages),
          // Update path to reflect new hierarchy
          path: itemToDelete.parentSlug
            ? newPages.find((p) => p.slug === itemToDelete.parentSlug)?.path
              ? `${newPages.find((p) => p.slug === itemToDelete.parentSlug)?.path}/${child.slug}`
              : `/${itemToDelete.parentSlug}/${child.slug}`
            : `/${child.slug}`
        }

        // Update descendants of this child
        updateDescendantHierarchy(child.slug, newPages)
      }
    })

    // Remove the deleted item
    newPages = newPages.filter((page) => page.slug !== slug)

    // Update menu orders for the level where the item was deleted
    updateMenuOrdersForLevel(newPages, itemToDelete.parentSlug)

    handlePagesChange(newPages)
  }

  const renderTreeNode = (node: PageTreeNode): React.ReactNode => {
    const hasChildren = node.children.length > 0
    const isExpanded = expandedNodes.has(node.slug)
    const isEditing = editingSlug === node.slug
    const indentLevel = node.level * 24

    return (
      <div key={node.slug}>
        <SortableTreeItem
          id={node.slug}
          node={node}
          indentLevel={indentLevel}
          hasChildren={hasChildren}
          isExpanded={isExpanded}
          isEditing={isEditing}
          editingData={editingData}
          onToggleExpanded={() => toggleExpanded(node.slug)}
          onEdit={() => handleEditInline(node.slug)}
          onSave={handleSaveInline}
          onCancel={handleCancelEdit}
          onEditContent={() => onEditContent(node.slug)}
          onToggleActive={() => handleToggleActive(node.slug)}
          onToggleInMenu={() => handleToggleInMenu(node.slug)}
          onDelete={() => handleDelete(node.slug)}
          onAddChild={() => onAddPage(node.slug)}
          onEditingDataChange={setEditingData}
        />

        {hasChildren && isExpanded && (
          <div>{node.children.map((child) => renderTreeNode(child))}</div>
        )}
      </div>
    )
  }

  const allSlugs = pages.map((p) => p.slug)

  return (
    <div className='space-y-4'>
      <div className='flex justify-between items-center'>
        <h3 className='font-semibold text-lg'>Page Structure</h3>
        <Button type='button' onClick={() => onAddPage()} size='sm'>
          <Plus className='mr-2 w-4 h-4' />
          Add Root Page
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={allSlugs} strategy={verticalListSortingStrategy}>
          <div className='border rounded-lg'>
            {tree.length === 0 ? (
              <div className='p-8 text-muted-foreground text-center'>
                <FileText className='opacity-50 mx-auto mb-4 w-12 h-12' />
                <p>No pages created yet.</p>
                <Button
                  type='button'
                  onClick={() => onAddPage()}
                  variant='outline'
                  className='mt-4'
                >
                  <Plus className='mr-2 w-4 h-4' />
                  Create Your First Page
                </Button>
              </div>
            ) : (
              <div className='divide-y'>{tree.map((node) => renderTreeNode(node))}</div>
            )}
          </div>
        </SortableContext>

        <DragOverlay>
          {draggedItem && (
            <div className='bg-background shadow-lg p-3 border border-border rounded-lg'>
              <div className='flex items-center gap-2 mb-2'>
                <GripVertical className='w-4 h-4 text-muted-foreground' />
                <span className='font-medium'>{draggedItem.data.title}</span>
              </div>
              <div className='flex gap-2 text-muted-foreground text-sm'>
                {draggedItem.canMoveLeft && (
                  <div className='flex items-center gap-1'>
                    <ChevronLeft className='w-3 h-3' />
                    <span>Move Left (Up Level)</span>
                  </div>
                )}
                {draggedItem.canMoveRight && (
                  <div className='flex items-center gap-1'>
                    <ChevronRight className='w-3 h-3' />
                    <span>Move Right (Sub Menu)</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

interface SortableTreeItemProps {
  id: string
  node: PageTreeNode
  indentLevel: number
  hasChildren: boolean
  isExpanded: boolean
  isEditing: boolean
  editingData: Partial<PageItem>
  onToggleExpanded: () => void
  onEdit: () => void
  onSave: () => void
  onCancel: () => void
  onEditContent: () => void
  onToggleActive: () => void
  onToggleInMenu: () => void
  onDelete: () => void
  onAddChild: () => void
  onEditingDataChange: (data: Partial<PageItem>) => void
}

function SortableTreeItem({
  id,
  node,
  indentLevel,
  hasChildren,
  isExpanded,
  isEditing,
  editingData,
  onToggleExpanded,
  onEdit,
  onSave,
  onCancel,
  onEditContent,
  onToggleActive,
  onToggleInMenu,
  onDelete,
  onAddChild,
  onEditingDataChange
}: SortableTreeItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  return (
    <div ref={setNodeRef} style={style} className='group hover:bg-foreground rounded-lg'>
      <div className='flex items-center gap-2 p-3' style={{ paddingLeft: indentLevel + 12 }}>
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className='opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing'
        >
          <GripVertical className='w-4 h-4 text-gray-400' />
        </div>

        {/* Expand/collapse */}
        <div className='flex justify-center items-center w-4 h-4'>
          {hasChildren && (
            <button
              type='button'
              onClick={onToggleExpanded}
              className='hover:bg-gray-200 p-0.5 rounded'
            >
              {isExpanded ? (
                <ChevronDown className='w-3 h-3' />
              ) : (
                <ChevronRight className='w-3 h-3' />
              )}
            </button>
          )}
        </div>

        {/* Page icon */}
        <div className='flex justify-center items-center w-4 h-4'>
          {node.url ? (
            <ExternalLink className='w-3 h-3 text-blue-500' />
          ) : node.hasContent ? (
            <FileText className='w-3 h-3 text-green-500' />
          ) : (
            <Menu className='w-3 h-3 text-gray-400' />
          )}
        </div>

        {/* Title / Edit form */}
        <div className='flex-1 min-w-0'>
          {isEditing ? (
            <div className='flex gap-2'>
              <Input
                value={editingData.title || ''}
                onChange={(e) => onEditingDataChange({ ...editingData, title: e.target.value })}
                placeholder='Page title'
                className='h-8'
              />
              <Button type='button' onClick={onSave} size='sm' variant='outline'>
                Save
              </Button>
              <Button type='button' onClick={onCancel} size='sm' variant='ghost'>
                Cancel
              </Button>
            </div>
          ) : (
            <div className='flex items-center gap-2'>
              <span className={`text-sm ${!node.isActive ? 'text-gray-400 line-through' : ''}`}>
                {node.title}
              </span>
              {node.url && (
                <span className='bg-blue-50 px-1 rounded text-blue-500 text-xs'>External</span>
              )}
              {!node.showInMenu && (
                <span className='bg-gray-100 px-1 rounded text-gray-500 text-xs'>Hidden</span>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        {!isEditing && (
          <div className='flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
            <Button
              type='button'
              onClick={onToggleActive}
              size='sm'
              variant='ghost'
              title={node.isActive ? 'Deactivate' : 'Activate'}
            >
              {node.isActive ? (
                <Eye className='w-3 h-3 text-green-600' />
              ) : (
                <EyeOff className='w-3 h-3 text-gray-400' />
              )}
            </Button>

            <Button
              type='button'
              onClick={onToggleInMenu}
              size='sm'
              variant='ghost'
              title={node.showInMenu ? 'Hide from menu' : 'Show in menu'}
            >
              <Menu className={`w-3 h-3 ${node.showInMenu ? 'text-blue-600' : 'text-gray-400'}`} />
            </Button>

            {node.hasContent && (
              <Button
                type='button'
                onClick={onEditContent}
                size='sm'
                variant='ghost'
                title='Edit content'
              >
                <FileText className='w-3 h-3 text-blue-600' />
              </Button>
            )}

            <Button type='button' onClick={onEdit} size='sm' variant='ghost' title='Edit page'>
              <Settings className='w-3 h-3' />
            </Button>

            <Button type='button' onClick={onEdit} size='sm' variant='ghost' title='Edit page'>
              <Edit className='w-3 h-3' />
            </Button>

            {/* Only show Add Child button for root level items (depth 0) */}
            {node.depth === 0 && (
              <Button
                type='button'
                onClick={onAddChild}
                size='sm'
                variant='ghost'
                title='Add child page'
              >
                <Plus className='w-3 h-3' />
              </Button>
            )}

            <Button type='button' onClick={onDelete} size='sm' variant='ghost' title='Delete page'>
              <Trash2 className='w-3 h-3 text-red-500' />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
