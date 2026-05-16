/** API base URL for browser and server. On Vercel Services, NEXT_PUBLIC_BACKEND_URL is set to /_/backend */
export function getApiBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_ROOT_API?.trim()
  if (explicit) {
    return explicit.endsWith('/') ? explicit.slice(0, -1) : explicit
  }

  const backend = process.env.NEXT_PUBLIC_BACKEND_URL?.trim()
  if (backend) {
    const prefix = backend.replace(/\/$/, '')
    return `${prefix}/api/v1`
  }

  return 'http://localhost:5015/api/v1'
}
