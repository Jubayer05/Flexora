import { calculateItemPath, FlatMenuItem, updateMenuOrders } from './menuHelpers'

/**
 * Moves an item to a new position within the same hierarchy level
 */
export function moveItem(
  items: FlatMenuItem[],
  sourceId: string,
  targetIndex: number
): FlatMenuItem[] {
  const sourceItem = items.find((item) => item.slug === sourceId)
  if (!sourceItem) {
    return items
  }

  // Get all items at the same level as the source
  const siblings = items.filter((item) => item.parentSlug === sourceItem.parentSlug)
  const others = items.filter((item) => item.parentSlug !== sourceItem.parentSlug)

  // Remove source from siblings
  const filteredSiblings = siblings.filter((item) => item.slug !== sourceId)

  // Insert at target position
  const targetPosition = Math.max(0, Math.min(targetIndex, filteredSiblings.length))
  const reorderedSiblings = [
    ...filteredSiblings.slice(0, targetPosition),
    sourceItem,
    ...filteredSiblings.slice(targetPosition)
  ]

  // Update menu orders
  const updatedSiblings = reorderedSiblings.map((item, index) => ({
    ...item,
    menuOrder: index
  }))

  return [...updatedSiblings, ...others]
}

/**
 * Moves an item to a new hierarchy level (different parent)
 */
export function moveItemToLevel(
  items: FlatMenuItem[],
  sourceId: string,
  targetParentSlug: string | undefined
): FlatMenuItem[] {
  const sourceItem = items.find((item) => item.slug === sourceId)
  if (!sourceItem) {
    return items
  }

  // Update the source item's parent and depth
  const newDepth = targetParentSlug
    ? (items.find((item) => item.slug === targetParentSlug)?.depth ?? 0) + 1
    : 0

  const updatedSourceItem: FlatMenuItem = {
    ...sourceItem,
    parentSlug: targetParentSlug,
    depth: newDepth
  }

  // Remove source from original position
  const otherItems = items.filter((item) => item.slug !== sourceId)

  // Add updated source item
  const allItems = [...otherItems, updatedSourceItem]

  // Update menu orders for both old and new parent levels
  let result = updateMenuOrders(allItems, sourceItem.parentSlug)
  result = updateMenuOrders(result, targetParentSlug)

  // Update paths for the moved item and its children
  result = updateItemPaths(result, sourceId)

  return result
}

/**
 * Updates paths for an item and all its descendants
 */
function updateItemPaths(items: FlatMenuItem[], rootItemSlug: string): FlatMenuItem[] {
  const rootItem = items.find((item) => item.slug === rootItemSlug)
  if (!rootItem) {
    return items
  }

  const newPath = calculateItemPath(rootItem, items)

  return items.map((item) => {
    if (item.slug === rootItemSlug) {
      return { ...item, path: newPath }
    }

    // Update paths for descendants
    if (isDescendantOf(item.slug, rootItemSlug, items)) {
      const updatedPath = calculateItemPath(item, items)
      return { ...item, path: updatedPath }
    }

    return item
  })
}

/**
 * Checks if an item is a descendant of another item
 */
function isDescendantOf(itemSlug: string, ancestorSlug: string, items: FlatMenuItem[]): boolean {
  const item = items.find((i) => i.slug === itemSlug)
  if (!item || !item.parentSlug) {
    return false
  }

  if (item.parentSlug === ancestorSlug) {
    return true
  }

  return isDescendantOf(item.parentSlug, ancestorSlug, items)
}
