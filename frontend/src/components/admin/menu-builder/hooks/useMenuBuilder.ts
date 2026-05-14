import { PageItem } from '@/lib/validations/schemas/pageSchema'
import { useCallback, useMemo, useState } from 'react'
import {
  buildNestedMenu,
  canNestItem,
  FlatMenuItem,
  flattenMenu,
  generateMenuItemId,
  hasChildren
} from '../utils/menuHelpers'
import { moveItem } from '../utils/moveItem'
import { nestItemAsChild } from '../utils/nestItem'
import { promoteChildren, unnestItem } from '../utils/unnestItem'
import { DragPosition, useDragPosition } from './useDragPosition'

export interface MenuBuilderState {
  items: PageItem[]
  flatItems: FlatMenuItem[]
  isModified: boolean
}

export interface DragContext {
  draggedItemId: string | null
  dragOverItemId: string | null
  dropPosition: 'before' | 'after' | 'child' | null
}

/**
 * Main hook for menu builder functionality
 */
export function useMenuBuilder(initialItems: PageItem[], onChange?: (items: PageItem[]) => void) {
  const [state, setState] = useState<MenuBuilderState>(() => ({
    items: initialItems,
    flatItems: flattenMenu(initialItems),
    isModified: false
  }))

  const [dragContext, setDragContext] = useState<DragContext>({
    draggedItemId: null,
    dragOverItemId: null,
    dropPosition: null
  })

  const dragPosition = useDragPosition(state.flatItems)

  /**
   * Updates the menu state and triggers onChange
   */
  const updateMenuState = useCallback(
    (newFlatItems: FlatMenuItem[]) => {
      const newNestedItems = buildNestedMenu(newFlatItems)

      setState((prev) => ({
        ...prev,
        items: newNestedItems,
        flatItems: newFlatItems,
        isModified: true
      }))

      onChange?.(newNestedItems)
    },
    [onChange]
  )

  /**
   * Handles drag start
   */
  const handleDragStart = useCallback(
    (itemId: string, position: DragPosition) => {
      setDragContext((prev) => ({
        ...prev,
        draggedItemId: itemId
      }))

      dragPosition.startDrag(itemId, position)
    },
    [dragPosition]
  )

  /**
   * Handles drag over
   */
  const handleDragOver = useCallback(
    (
      itemId: string | null,
      position: DragPosition,
      dropPosition?: 'before' | 'after' | 'child'
    ) => {
      setDragContext((prev) => ({
        ...prev,
        dragOverItemId: itemId,
        dropPosition: dropPosition || null
      }))

      dragPosition.updateDragPosition(position, itemId || undefined)
    },
    [dragPosition]
  )

  /**
   * Handles drag end with automatic operation detection
   */
  const handleDragEnd = useCallback(() => {
    const { draggedItemId, dragOverItemId, dropPosition } = dragContext
    const { nestingInfo } = dragPosition

    if (!draggedItemId) {
      dragPosition.endDrag()
      setDragContext({
        draggedItemId: null,
        dragOverItemId: null,
        dropPosition: null
      })
      return
    }

    let newFlatItems = [...state.flatItems]

    // Handle nesting operations
    if (nestingInfo.canNest) {
      if (nestingInfo.nestingDirection === 'right' && nestingInfo.targetParentId) {
        // Nest as child
        newFlatItems = nestItemAsChild(newFlatItems, draggedItemId, nestingInfo.targetParentId)
      } else if (nestingInfo.nestingDirection === 'left') {
        // Unnest to parent level
        newFlatItems = unnestItem(newFlatItems, draggedItemId)
      }
    }
    // Handle reordering
    else if (dragOverItemId && dropPosition) {
      const targetIndex = newFlatItems.findIndex((item) => item.slug === dragOverItemId)
      if (targetIndex >= 0) {
        const adjustedIndex = dropPosition === 'after' ? targetIndex + 1 : targetIndex
        newFlatItems = moveItem(newFlatItems, draggedItemId, adjustedIndex)
      }
    }

    updateMenuState(newFlatItems)

    // Clean up
    dragPosition.endDrag()
    setDragContext({
      draggedItemId: null,
      dragOverItemId: null,
      dropPosition: null
    })
  }, [dragContext, dragPosition, state.flatItems, updateMenuState])

  /**
   * Manually moves an item to a specific position
   */
  const moveItemManually = useCallback(
    (sourceId: string, targetIndex: number) => {
      const newFlatItems = moveItem(state.flatItems, sourceId, targetIndex)
      updateMenuState(newFlatItems)
    },
    [state.flatItems, updateMenuState]
  )

  /**
   * Manually nests an item as a child of another
   */
  const nestItemManually = useCallback(
    (sourceId: string, parentId: string) => {
      if (!canNestItem(sourceId, parentId, state.flatItems)) {
        return false
      }

      const newFlatItems = nestItemAsChild(state.flatItems, sourceId, parentId)
      updateMenuState(newFlatItems)
      return true
    },
    [state.flatItems, updateMenuState]
  )

  /**
   * Manually unnests an item to parent level
   */
  const unnestItemManually = useCallback(
    (sourceId: string) => {
      const newFlatItems = unnestItem(state.flatItems, sourceId)
      updateMenuState(newFlatItems)
    },
    [state.flatItems, updateMenuState]
  )

  /**
   * Adds a new menu item
   */
  const addMenuItem = useCallback(
    (title: string, parentId?: string, additionalData?: Partial<PageItem>) => {
      const parentItem = parentId ? state.flatItems.find((item) => item.slug === parentId) : null
      const depth = parentItem ? parentItem.depth + 1 : 0

      // Prevent deep nesting (max 1 level)
      if (depth > 1) {
        return false
      }

      const newItem: FlatMenuItem = {
        id: generateMenuItemId(),
        title,
        slug: title.toLowerCase().replace(/\s+/g, '-'),
        parentSlug: parentId,
        isActive: true,
        showInMenu: true,
        menuOrder: 0, // Will be updated by updateMenuOrders
        depth,
        path: parentItem
          ? `${parentItem.path}/${title.toLowerCase().replace(/\s+/g, '-')}`
          : `/${title.toLowerCase().replace(/\s+/g, '-')}`,
        hasContent: false,
        target: '_self',
        originalIndex: state.flatItems.length,
        ...additionalData
      }

      const newFlatItems = [...state.flatItems, newItem]
      updateMenuState(newFlatItems)
      return true
    },
    [state.flatItems, updateMenuState]
  )

  /**
   * Removes a menu item and handles children
   */
  //   TODO: DELETE page content also
  const removeMenuItem = useCallback(
    (itemId: string, promoteChildrenToParent = true) => {
      let newFlatItems = [...state.flatItems]

      if (promoteChildrenToParent && hasChildren(itemId, newFlatItems)) {
        // Promote children before removing parent
        newFlatItems = promoteChildren(newFlatItems, itemId)
      }

      // Remove the item
      newFlatItems = newFlatItems.filter((item) => item.slug !== itemId)

      updateMenuState(newFlatItems)
    },
    [state.flatItems, updateMenuState]
  )

  /**
   * Updates an existing menu item
   */
  const updateMenuItem = useCallback(
    (itemId: string, updates: Partial<FlatMenuItem>) => {
      const newFlatItems = state.flatItems.map((item) =>
        item.slug === itemId ? { ...item, ...updates } : item
      )
      updateMenuState(newFlatItems)
    },
    [state.flatItems, updateMenuState]
  )

  /**
   * Resets the menu to initial state
   */
  const resetMenu = useCallback(() => {
    setState({
      items: initialItems,
      flatItems: flattenMenu(initialItems),
      isModified: false
    })
  }, [initialItems])

  /**
   * Gets visual feedback for current drag operation
   */
  const getDragFeedback = useCallback(() => {
    if (!dragContext.draggedItemId) return null

    const feedback = dragPosition.getNestingFeedback()
    if (feedback) return feedback

    if (dragContext.dropPosition) {
      return {
        type: 'reorder' as const,
        message: `Move ${dragContext.dropPosition} item`,
        color: 'gray'
      }
    }

    return null
  }, [dragContext, dragPosition])

  /**
   * Determines if an item can be moved to a specific position
   */
  const canMoveItem = useCallback(
    (sourceId: string, targetId: string, position: 'before' | 'after' | 'child') => {
      if (position === 'child') {
        return canNestItem(sourceId, targetId, state.flatItems)
      }

      // For before/after, check if they would be at the same level
      const sourceItem = state.flatItems.find((item) => item.slug === sourceId)
      const targetItem = state.flatItems.find((item) => item.slug === targetId)

      return !!(sourceItem && targetItem && sourceItem.parentSlug === targetItem.parentSlug)
    },
    [state.flatItems]
  )

  // Visual helpers
  const visibleItems = useMemo(() => {
    return state.flatItems.filter((item) => item.depth === 0)
  }, [state.flatItems])

  const getItemChildren = useCallback(
    (itemId: string) => {
      return state.flatItems.filter((item) => item.parentSlug === itemId)
    },
    [state.flatItems]
  )

  const getItemDepth = useCallback(
    (itemId: string) => {
      const item = state.flatItems.find((item) => item.slug === itemId)
      return item?.depth ?? 0
    },
    [state.flatItems]
  )

  return {
    // State
    items: state.items,
    flatItems: state.flatItems,
    isModified: state.isModified,

    // Drag state
    dragContext,
    dragPosition: dragPosition,

    // Drag handlers
    handleDragStart,
    handleDragOver,
    handleDragEnd,

    // Manual operations
    moveItem: moveItemManually,
    nestItem: nestItemManually,
    unnestItem: unnestItemManually,
    addMenuItem,
    removeMenuItem,
    updateMenuItem,
    resetMenu,

    // Utilities
    getDragFeedback,
    canMoveItem,
    visibleItems,
    getItemChildren,
    getItemDepth
  }
}
