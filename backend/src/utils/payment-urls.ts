const DEFAULT_FRONTEND_URL = 'https://uhqaccounts.com'

function isHttpUrl(value: string) {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function isLocalUrl(value: string) {
  return /(^|\/\/)(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|\/|$)/i.test(value)
}

function isPlaceholderUrl(value: string) {
  return /your-domain|domain\.com|example\.com/i.test(value)
}

function cleanBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, '')
}

function normalizePath(value: string) {
  const trimmed = value.trim()
  return `/${trimmed.replace(/^\/+/, '').replace(/\/+$/, '')}`
}

function joinUrl(baseUrl: string, path: string) {
  return `${cleanBaseUrl(baseUrl)}${normalizePath(path)}`
}

function shouldUseFallback(value?: string | null) {
  if (!value || !value.trim()) return true

  const trimmed = value.trim()
  if (isPlaceholderUrl(trimmed)) return true

  // Payment gateways cannot call localhost. Allow it only for intentional local/ngrok testing.
  return isLocalUrl(trimmed) && process.env.ALLOW_LOCAL_PAYMENT_URLS !== 'true'
}

function resolvePublicUrl(value: string | undefined, baseUrl: string, fallbackUrl: string) {
  if (shouldUseFallback(value)) return fallbackUrl

  const trimmed = value!.trim()

  if (isHttpUrl(trimmed)) {
    return cleanBaseUrl(trimmed)
  }

  if (trimmed.startsWith('/')) {
    return joinUrl(baseUrl, trimmed)
  }

  return fallbackUrl
}

export function getPublicFrontendUrl() {
  const configured = process.env.FRONTEND_URL

  if (!shouldUseFallback(configured) && isHttpUrl(configured!.trim())) {
    return cleanBaseUrl(configured!)
  }

  return DEFAULT_FRONTEND_URL
}

function getPublicBackendUrl() {
  const configured = process.env.BACKEND_PUBLIC_URL

  if (!shouldUseFallback(configured) && isHttpUrl(configured!.trim())) {
    return cleanBaseUrl(configured!)
  }

  return getPublicFrontendUrl()
}

export function getPaymentCallbackBaseUrl() {
  const callbackUrl = resolvePublicUrl(
    process.env.PAYMENT_CALLBACK_URL,
    getPublicBackendUrl(),
    ''
  )

  if (callbackUrl) {
    return callbackUrl
  }

  return joinUrl(getPublicBackendUrl(), '/api/v1/webhooks')
}

export function getPaymentReturnUrl(envName: string, fallbackPath: string) {
  const fallbackUrl = joinUrl(getPublicFrontendUrl(), fallbackPath)
  return resolvePublicUrl(process.env[envName], getPublicFrontendUrl(), fallbackUrl)
}

export function buildWebhookUrl(path: string, query?: Record<string, string>) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const url = new URL(`${getPaymentCallbackBaseUrl()}${normalizedPath}`)

  Object.entries(query || {}).forEach(([key, value]) => {
    url.searchParams.set(key, value)
  })

  return url.toString()
}
