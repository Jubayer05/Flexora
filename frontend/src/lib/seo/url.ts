const PUBLIC_SITE_URL = 'https://flexora.com'
const PUBLIC_API_URL = 'https://api.flexora.com'
const PUBLIC_ROOT_API_URL = 'https://api.flexora.com/api/v1'

function cleanBaseUrl(value?: string | null) {
  return String(value || '').trim().replace(/\/+$/, '')
}

function isLocalOrIpUrl(value?: string | null) {
  try {
    const url = new URL(String(value || ''))
    return (
      url.hostname === 'localhost' ||
      url.hostname === '127.0.0.1' ||
      /^\d{1,3}(?:\.\d{1,3}){3}$/.test(url.hostname)
    )
  } catch {
    return true
  }
}

export function getSeoSiteUrl() {
  const candidates = [
    process.env.NEXT_PUBLIC_BASE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_FRONTEND_URL
  ]

  const valid = candidates
    .map(cleanBaseUrl)
    .find((url) => url.startsWith('https://') && !isLocalOrIpUrl(url))

  return valid || PUBLIC_SITE_URL
}

export function getSeoApiUrl() {
  const candidates = [process.env.NEXT_PUBLIC_BASE_API, process.env.NEXT_PUBLIC_APP_ROOT_API]
  const valid = candidates
    .map(cleanBaseUrl)
    .map((url) => url.replace(/\/api\/v\d+$/i, ''))
    .find((url) => url.startsWith('https://') && !isLocalOrIpUrl(url))

  return valid || PUBLIC_API_URL
}

export function getSeoRootApiUrl() {
  const candidates = [process.env.NEXT_PUBLIC_APP_ROOT_API]
  const valid = candidates
    .map(cleanBaseUrl)
    .find((url) => url.startsWith('https://') && !isLocalOrIpUrl(url))

  return valid || PUBLIC_ROOT_API_URL
}

export function toAbsoluteSeoUrl(pathOrUrl?: string | null, preferredBase?: string) {
  const value = String(pathOrUrl || '').trim()
  if (!value) return ''

  try {
    const url = new URL(value)
    if (!isLocalOrIpUrl(url.toString())) return url.toString()
  } catch {
    // Continue with relative path handling.
  }

  const base = cleanBaseUrl(preferredBase || getSeoSiteUrl())
  const path = value.startsWith('/') ? value : `/${value}`
  return `${base}${path}`
}

export function toAbsoluteSeoMediaUrl(pathOrUrl?: string | null) {
  const value = String(pathOrUrl || '').trim()
  if (!value) return ''

  if (value.startsWith('/files')) {
    return toAbsoluteSeoUrl(value, getSeoApiUrl())
  }

  return toAbsoluteSeoUrl(value, getSeoSiteUrl())
}
