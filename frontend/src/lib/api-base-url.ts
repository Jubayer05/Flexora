/** API base URL — relative on the client, absolute on the server (Node fetch/axios require it). */
function trim(value?: string) {
  return value?.trim() ?? ''
}

function stripTrailingSlash(url: string) {
  return url.replace(/\/+$/, '')
}

function serverBackendOrigin(): string | null {
  const backend = trim(process.env.BACKEND_URL)
  if (backend.startsWith('http')) {
    return stripTrailingSlash(backend)
  }

  const vercel = trim(process.env.VERCEL_URL)
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, '')
    return `https://${stripTrailingSlash(host)}/_/backend`
  }

  return null
}

function toAbsoluteApiRoot(relativeRoot: string): string | null {
  const path = relativeRoot.startsWith('/') ? relativeRoot : `/${relativeRoot}`
  const apiPath = stripTrailingSlash(path)
  const origin = serverBackendOrigin()
  if (!origin) return null

  if (apiPath.startsWith('/_/backend')) {
    const siteOrigin = origin.replace(/\/_\/backend$/, '')
    return `${siteOrigin}${apiPath}`
  }

  return `${origin}/api/v1`
}

export function getApiBaseUrl(): string {
  const explicit = trim(process.env.NEXT_PUBLIC_APP_ROOT_API)
  const isServer = typeof window === 'undefined'

  if (explicit) {
    if (explicit.startsWith('http')) {
      return stripTrailingSlash(explicit)
    }

    if (isServer) {
      const absolute = toAbsoluteApiRoot(explicit)
      if (absolute) return absolute
    }

    return stripTrailingSlash(explicit)
  }

  if (isServer) {
    const origin = serverBackendOrigin()
    if (origin) return `${origin}/api/v1`
  }

  const backend = trim(process.env.NEXT_PUBLIC_BACKEND_URL)
  if (backend) {
    return `${stripTrailingSlash(backend)}/api/v1`
  }

  return 'http://localhost:5015/api/v1'
}
