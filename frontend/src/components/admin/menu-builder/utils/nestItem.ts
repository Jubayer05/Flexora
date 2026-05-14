import { FlatMenuItem, calculateItemPath, canNestItem, updateMenuOrders } from './menuHelpers'

/**
 * Converts an item into a child of another item (nesting)
 */
export function nestItemAsChild(
  items: FlatMenuItem[],
  sourceId: string,
  parentId: string
): FlatMenuItem[] {
  const sourceItem = items.find((item) => item.slug === sourceId)
  const parentItem = items.find((item) => item.slug === parentId)

  if (!sourceItem || !parentItem) {
    return items
  }

  // Validate nesting is allowed
  if (!canNestItem(sourceId, parentId, items)) {
    return items
  }

  // Update source item to be a child of parent
  const updatedSourceItem: FlatMenuItem = {
    ...sourceItem,
    parentSlug: parentId,
    depth: (parentItem.depth || 0) + 1
  }

  // Remove source from items and add updated version
  const otherItems = items.filter((item) => item.slug !== sourceId)
  const allItems = [...otherItems, updatedSourceItem]

  // Update menu orders for old parent level
  let result = updateMenuOrders(allItems, sourceItem.parentSlug)

  // Update menu orders for new parent level
  result = updateMenuOrders(result, parentId)

  // Update paths
  result = updateItemAndDescendantPaths(result, sourceId)

  return result
}

/**
 * Updates paths for an item and all its descendants after nesting
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
