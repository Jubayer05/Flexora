import { PageItem, PageTreeNode } from '@/lib/validations/schemas/pageSchema'

/**
 * Build a tree structure from flat page items
 */
export function buildPageTree(pages: PageItem[]): PageTreeNode[] {
  const pageMap = new Map<string, PageTreeNode>()
  const rootPages: PageTreeNode[] = []

  // First pass: create all nodes
  pages.forEach((page) => {
    pageMap.set(page.slug, {
      ...page,
      children: [],
      level: 0
    })
  })

  // Second pass: build hierarchy
  pages.forEach((page) => {
    const node = pageMap.get(page.slug)!

    if (page.parentSlug) {
      const parent = pageMap.get(page.parentSlug)
      if (parent) {
        node.level = parent.level + 1
        parent.children.push(node)
      } else {
        // Parent not found, treat as root
        rootPages.push(node)
      }
    } else {
      rootPages.push(node)
    }
  })

  // Sort by menuOrder
  const sortByOrder = (nodes: PageTreeNode[]): PageTreeNode[] => {
    return nodes
      .sort((a, b) => a.menuOrder - b.menuOrder)
      .map((node) => ({
        ...node,
        children: sortByOrder(node.children)
      }))
  }

  return sortByOrder(rootPages)
}

/**
 * Flatten tree structure back to flat array with updated order
 */
export function flattenPageTree(tree: PageTreeNode[]): PageItem[] {
  const result: PageItem[] = []

  const traverse = (nodes: PageTreeNode[], parentSlug?: string, currentOrder = 0) => {
    nodes.forEach((node, index) => {
      const { children, level, ...pageData } = node
      result.push({
        ...pageData,
        parentSlug,
        menuOrder: currentOrder + index,
        depth: level
      })

      if (children.length > 0) {
        traverse(children, node.slug, (currentOrder + index) * 1000)
      }
    })
  }

  traverse(tree)
  return result
}

/**
 * Generate slug from title
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

/**
 * Generate full path for nested pages
 */
export function generatePath(slug: string, parentSlug?: string, allPages: PageItem[] = []): string {
  if (!parentSlug) return `/${slug}`

  const parent = allPages.find((p) => p.slug === parentSlug)
  if (!parent) return `/${slug}`

  const parentPath = parent.path || generatePath(parent.slug, parent.parentSlug, allPages)
  return `${parentPath}/${slug}`
}

/**
 * Get all possible parent options for a page (excluding itself and its children)
 */
export function getParentOptions(
  currentSlug: string,
  allPages: PageItem[]
): Array<{ value: string; label: string; level: number }> {
  const tree = buildPageTree(allPages)
  const options: Array<{ value: string; label: string; level: number }> = [
    { value: '', label: '(No Parent)', level: 0 }
  ]

  const traverse = (nodes: PageTreeNode[], level = 0) => {
    nodes.forEach((node) => {
      // Skip current page and its descendants
      if (node.slug !== currentSlug && !isDescendant(currentSlug, node.slug, allPages)) {
        options.push({
          value: node.slug,
          label: `${'—'.repeat(level)} ${node.title}`,
          level
        })
        traverse(node.children, level + 1)
      }
    })
  }

  traverse(tree)
  return options
}

/**
 * Check if a page is a descendant of another page
 */
function isDescendant(ancestorSlug: string, candidateSlug: string, allPages: PageItem[]): boolean {
  const candidate = allPages.find((p) => p.slug === candidateSlug)
  if (!candidate || !candidate.parentSlug) return false

  if (candidate.parentSlug === ancestorSlug) return true
  return isDescendant(ancestorSlug, candidate.parentSlug, allPages)
}
