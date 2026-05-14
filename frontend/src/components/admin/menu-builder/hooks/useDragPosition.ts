import { useCallback, useRef, useState } from 'react'
import { FlatMenuItem } from '../utils/menuHelpers'

export interface DragPosition {
  x: number
  y: number
  offsetX: number
  offsetY: number
}

export interface NestingInfo {
  canNest: boolean
  targetParentId?: string
  targetDepth: number
  nestingDirection: 'left' | 'right' | 'none'
}

export interface DragPositionState {
  isDragging: boolean
  dragPosition: DragPosition | null
  nestingInfo: NestingInfo
  hoveredItemId: string | null
  placeholderIndex: number | null
}

const NESTING_THRESHOLD = 20 // pixels to trigger nesting (reduced for smoother detection)
const UNNESTING_THRESHOLD = -15 // pixels to trigger unnesting (reduced for smoother detection)

/**
 * Hook for tracking drag position and determining nesting behavior
 */
export function useDragPosition(items: FlatMenuItem[]) {
  const [state, setState] = useState<DragPositionState>({
    isDragging: false,
    dragPosition: null,
    nestingInfo: {
      canNest: false,
      targetDepth: 0,
      nestingDirection: 'none'
    },
    hoveredItemId: null,
    placeholderIndex: null
  })

  const dragStartPositionRef = useRef<{ x: number; y: number } | null>(null)
  const draggedItemRef = useRef<FlatMenuItem | null>(null)

  /**
   * Starts tracking drag position
   */
  const startDrag = useCallback(
    (itemId: string, initialPosition: DragPosition) => {
      const draggedItem = items.find((item) => item.slug === itemId)
      if (!draggedItem) return

      dragStartPositionRef.current = { x: initialPosition.x, y: initialPosition.y }
      draggedItemRef.current = draggedItem

      setState((prev) => ({
        ...prev,
        isDragging: true,
        dragPosition: initialPosition
      }))
    },
    [items]
  )

  /**
   * Updates drag position and calculates nesting info
   */
  const updateDragPosition = useCallback(
    (position: DragPosition, hoveredItemId?: string) => {
      if (!state.isDragging || !dragStartPositionRef.current || !draggedItemRef.current) {
        return
      }

      const horizontalOffset = position.x - dragStartPositionRef.current.x
      const draggedItem = draggedItemRef.current

      let nestingInfo: NestingInfo = {
        canNest: false,
        targetDepth: draggedItem.depth,
        nestingDirection: 'none'
      }

      // Determine nesting behavior based on horizontal offset
      if (hoveredItemId && hoveredItemId !== draggedItem.slug) {
        const hoveredItem = items.find((item) => item.slug === hoveredItemId)

        if (hoveredItem) {
          // Check for right nesting (becoming a child) - simplified logic
          if (horizontalOffset > NESTING_THRESHOLD) {
            // Can nest if hovered item is at root level (depth 0) and can accept children
            if (hoveredItem.depth === 0) {
              nestingInfo = {
                canNest: true,
                targetParentId: hoveredItem.slug,
                targetDepth: 1,
                nestingDirection: 'right'
              }
            }
          }
          // Check for left unnesting (becoming a parent)
          else if (horizontalOffset < UNNESTING_THRESHOLD && draggedItem.parentSlug) {
            nestingInfo = {
              canNest: true,
              targetDepth: 0,
              nestingDirection: 'left'
            }
          }
        }
      }

      setState((prev) => ({
        ...prev,
        dragPosition: position,
        nestingInfo,
        hoveredItemId: hoveredItemId || null
      }))
    },
    [state.isDragging, items]
  )

  /**
   * Calculates placeholder position based on drag position
   */
  const updatePlaceholderIndex = useCallback((index: number | null) => {
    setState((prev) => ({
      ...prev,
      placeholderIndex: index
    }))
  }, [])

  /**
   * Ends drag tracking
   */
  const endDrag = useCallback(() => {
    dragStartPositionRef.current = null
    draggedItemRef.current = null

    setState({
      isDragging: false,
      dragPosition: null,
      nestingInfo: {
        canNest: false,
        targetDepth: 0,
        nestingDirection: 'none'
      },
      hoveredItemId: null,
      placeholderIndex: null
    })
  }, [])

  /**
   * Gets visual feedback for nesting
   */
  const getNestingFeedback = useCallback(() => {
    if (!state.nestingInfo.canNest) {
      return null
    }

    switch (state.nestingInfo.nestingDirection) {
      case 'right':
        return {
          type: 'nest' as const,
          message: 'Make submenu',
          color: 'blue'
        }
      case 'left':
        return {
          type: 'unnest' as const,
          message: 'Make parent',
          color: 'green'
        }
      default:
        return null
    }
  }, [state.nestingInfo])

  /**
   * Calculates indent offset for visual feedback
   */
  const getIndentOffset = useCallback(() => {
    if (!state.isDragging || !state.dragPosition || !dragStartPositionRef.current) {
      return 0
    }

    const offset = state.dragPosition.x - dragStartPositionRef.current.x

    // Clamp the offset to reasonable bounds
    return Math.max(-60, Math.min(60, offset))
  }, [state.isDragging, state.dragPosition])

  return {
    ...state,
    startDrag,
    updateDragPosition,
    updatePlaceholderIndex,
    endDrag,
    getNestingFeedback,
    getIndentOffset,
    draggedItem: draggedItemRef.current
  }
}
