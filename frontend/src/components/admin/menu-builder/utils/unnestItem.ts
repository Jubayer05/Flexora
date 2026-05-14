import { calculateItemPath, FlatMenuItem, updateMenuOrders } from './menuHelpers'

/**
 * Converts a child item back to top-level (unnesting)
 */
export function unnestItem(items: FlatMenuItem[], sourceId: string): FlatMenuItem[] {
  const sourceItem = items.find((item) => item.slug === sourceId)

  if (!sourceItem || !sourceItem.parentSlug) {
    return items // Already at top level or doesn't exist
  }

  // Update source item to be top-level
  const updatedSourceItem: FlatMenuItem = {
    ...sourceItem,
    parentSlug: undefined,
    depth: 0
  }

  // Remove source from items and add updated version
  const otherItems = items.filter((item) => item.slug !== sourceId)
  const allItems = [...otherItems, updatedSourceItem]

  // Update menu orders for old parent level
  let result = updateMenuOrders(allItems, sourceItem.parentSlug)

  // Update menu orders for root level
  result = updateMenuOrders(result, undefined)

  // Update paths for the item and its descendants
  result = updateItemAndDescendantPaths(result, sourceId)

  return result
}

/**
 * Promotes all children of an item to the same level as the item
 */
export function promoteChildren(items: FlatMenuItem[], parentId: string): FlatMenuItem[] {
  const parentItem = items.find((item) => item.slug === parentId)
  if (!parentItem) {
    return items
  }

  const children = items.filter((item) => item.parentSlug === parentId)

  if (children.length === 0) {
    return items
  }

  // Update all children to have the same parent as the original parent
  const updatedChildren = children.map((child) => ({
    ...child,
    parentSlug: parentItem.parentSlug,
    depth: parentItem.depth
  }))

  // Replace children in the items array
  const otherItems = items.filter((item) => item.parentSlug !== parentId)
  const allItems = [...otherItems, ...updatedChildren]

  // Update menu orders for the affected level
  let result = updateMenuOrders(allItems, parentItem.parentSlug)

  // Update paths for promoted children
  updatedChildren.forEach((child) => {
    result = updateItemAndDescendantPaths(result, child.slug)
  })

  return result
}

/**
 * Updates paths for an item and all its descendants after unnesting
 */
function updateItemAndDescendantPaths(items: FlatMenuItem[], rootItemSlug: string): FlatMenuItem[] {
  const itemsToUpdate = [rootItemSlug]

  // Find all descendants
  const findDescendants = (parentSlug: string) => {
    const children = items.filter((item) => item.parentSlug === parentSlug)
    children.forEach((child) => {
      itemsToUpdate.push(child.slug)
      findDescendants(child.slug)
    })
  }

  findDescendants(rootItemSlug)

  return items.map((item) => {
    if (itemsToUpdate.includes(item.slug)) {
      return {
        ...item,
        path: calculateItemPath(item, items)
      }
    }
    return item
  })
}
