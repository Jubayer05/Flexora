export type PageLike = {
  type?: string | null
  slug?: string | null
  url?: string | null
}

export function isAbsoluteUrl(raw?: string | null): boolean {
  try {
    if (!raw) return false
    new URL(raw)
    return true
  } catch {
    return false
  }
}

/**
 * Resolve a full sitemap loc based on site base URL and a page-like object.
 * Rules:
 * - If url is absolute, return it as-is
 * - If type === 'DYNAMIC', use `/pages/{slug}` relative to base
 * - If url is '#', resolve to '/'
 * - Otherwise, treat url as a relative path and join with base using a single slash
 */
export function resolvePageLoc(baseUrl: string, page: PageLike): string {
  const cleanBase = (baseUrl || '').replace(/\/+$/, '')
  const rawUrl = (page?.url ?? '').trim()
  const type = (page?.type ?? '').toUpperCase()

  if (isAbsoluteUrl(rawUrl)) return rawUrl

  let path = ''
  if (type === 'DYNAMIC') {
    const slug = String(page?.slug || '').replace(/^\/+/, '')
    path = `/pages/${slug}`
  } else if (rawUrl === '#') {
    path = '/'
  } else {
    const trimmed = rawUrl.replace(/^\/+/, '')
    path = `/${trimmed}`
  }

  return `${cleanBase}${path}`
}
