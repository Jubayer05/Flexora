/**
 * Generate page title from URL pathname
 * Converts pathname segments to title case
 * Example: /admin/product-management -> Product Management
 */
export function generateTitleFromPath(pathname: string): string {
  // Split pathname and filter out empty strings
  const pathSegments = pathname.split('/').filter(Boolean)

  if (pathSegments.length === 0) {
    return 'Dashboard'
  }

  // Get the last segment (current page)
  const lastSegment = pathSegments[pathSegments.length - 1]

  // Remove dashes and convert to title case
  const title = lastSegment
    .replace(/-/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  return title
}

/**
 * Generate full breadcrumb title with parent context
 * Example: /admin/settings/general -> Admin - Settings - General
 */
export function generateBreadcrumbTitle(pathname: string, separator: string = ' - '): string {
  const pathSegments = pathname.split('/').filter(Boolean)

  if (pathSegments.length === 0) {
    return 'Dashboard'
  }

  const titles = pathSegments.map((segment) =>
    segment
      .replace(/-/g, ' ')
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  )

  return titles.join(separator)
}
