import { PageItem } from '@/lib/validations/schemas/pageSchema'

export interface FlatMenuItem extends Omit<PageItem, 'children'> {
  originalIndex: number
}

/**
 * Converts nested menu structure to flat list for easier manipulation
 */
export function flattenMenu(items: PageItem[]): FlatMenuItem[] {
  const flattened: FlatMenuItem[] = []
  let originalIndex = 0

  const flatten = (menuItems: PageItem[], parentSlug?: string, depth = 0) => {
    menuItems.forEach((item, index) => {
      flattened.push({
        ...item,
        parentSlug,
        depth,
        menuOrder: index,
        originalIndex: originalIndex++
      })

      if (item.children && item.children.length > 0) {
        flatten(item.children, item.slug, depth + 1)
      }
    })
  }

  flatten(items)
  return flattened
}

/**
 * Rebuilds nested structure from flat list
 */
export function buildNestedMenu(flatItems: FlatMenuItem[]): PageItem[] {
  const itemMap = new Map<string, PageItem>()
  const rootItems: PageItem[] = []

  // Sort by original index to maintain order
  const sortedItems = [...flatItems].sort((a, b) => a.originalIndex - b.originalIndex)

  // Initialize all items with empty children arrays
  sortedItems.forEach((item) => {
    itemMap.set(item.slug, {
      ...item,
      children: []
    })
  })

  // Build the tree structure
  sortedItems.forEach((item) => {
    const pageItem = itemMap.get(item.slug)!

    if (item.parentSlug) {
      const parent = itemMap.get(item.parentSlug)
      if (parent) {
        parent.children = parent.children || []
        parent.children.push(pageItem)
      }
    } else {
      rootItems.push(pageItem)
    }
  })

  // Sort children by menu order
  const sortChildren = (items: PageItem[]) => {
    items.sort((a, b) => a.menuOrder - b.menuOrder)
    items.forEach((item) => {
      if (item.children && item.children.length > 0) {
        sortChildren(item.children)
      }
    })
  }

  sortChildren(rootItems)
  return rootItems
}

/**
 * Generates a unique ID for new menu items
 */
export function generateMenuItemId(): string {
  return `menu-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Calculates the path for a menu item based on its hierarchy
 */
export function calculateItemPath(item: FlatMenuItem, allItems: FlatMenuItem[]): string {
  if (!item.parentSlug) {
    return `/${item.slug}`
  }

  const parent = allItems.find((i) => i.slug === item.parentSlug)
  if (!parent) {
    return `/${item.slug}`
  }

  const parentPath = calculateItemPath(parent, allItems)
  return `${parentPath}/${item.slug}`
}

/**
 * Updates menu orders for items at the same hierarchy level
 */
export function updateMenuOrders(items: FlatMenuItem[], parentSlug?: string): FlatMenuItem[] {
  const siblings = items.filter((item) => item.parentSlug === parentSlug)
  const others = items.filter((item) => item.parentSlug !== parentSlug)

  const updatedSiblings = siblings.map((item, index) => ({
    ...item,
    menuOrder: index
  }))

  return [...updatedSiblings, ...others]
}

/**
 * Validates that an item can be nested under a potential parent
 */
export function canNestItem(
  itemSlug: string,
  potentialParentSlug: string,
  allItems: FlatMenuItem[]
): boolean {
  // Can't nest under itself
  if (itemSlug === potentialParentSlug) {
    return false
  }

  // Can't nest under one of its own children (prevent circular reference)
  const item = allItems.find((i) => i.slug === itemSlug)
  const potentialParent = allItems.find((i) => i.slug === potentialParentSlug)

  if (!item || !potentialParent) {
    return false
  }

  // Only allow one level of nesting (parent can't already be a child)
  if (potentialParent.parentSlug) {
    return false
  }

  // Check if potential parent is a descendant of the item
  const isDescendant = (ancestorSlug: string, candidateSlug: string): boolean => {
    const candidate = allItems.find((i) => i.slug === candidateSlug)
    if (!candidate || !candidate.parentSlug) {
      return false
    }
    if (candidate.parentSlug === ancestorSlug) {
      return true
    }
    return isDescendant(ancestorSlug, candidate.parentSlug)
  }

  return !isDescendant(itemSlug, potentialParentSlug)
}

/**
 * Gets the visual indentation level for display
 */
export function getIndentLevel(depth: number): number {
  return depth * 24 // 24px per level
}

/**
 * Determines if an item has children
 */
export function hasChildren(itemSlug: string, allItems: FlatMenuItem[]): boolean {
  return allItems.some((item) => item.parentSlug === itemSlug)
}

/**
 * Gets all children of an item
 */
export function getChildren(itemSlug: string, allItems: FlatMenuItem[]): FlatMenuItem[] {
  return allItems.filter((item) => item.parentSlug === itemSlug)
}

/**
 * Gets the parent of an item
 */
export function getParent(itemSlug: string, allItems: FlatMenuItem[]): FlatMenuItem | undefined {
  const item = allItems.find((i) => i.slug === itemSlug)
  if (!item || !item.parentSlug) {
    return undefined
  }
  return allItems.find((i) => i.slug === item.parentSlug)
}
