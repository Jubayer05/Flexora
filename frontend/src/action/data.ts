'use server'
import { HomepageSettings } from '@/lib/validations/schemas/homepageSettings'

// Use the public API URL for server-side calls
const serverBaseURL = process.env.NEXT_PUBLIC_APP_ROOT_API || 'http://localhost:5000/api/v1'

// Add build-time detection
const isBuildTime = () => {
  // Next.js sets this during static generation
  return (
    process.env.NODE_ENV === 'production' &&
    !process.env.NEXT_RUNTIME &&
    typeof window === 'undefined'
  )
}

// Create AbortController with timeout
const createTimeoutSignal = (timeoutMs: number = 4000) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  return { signal: controller.signal, cleanup: () => clearTimeout(timeoutId) }
}

// Add retry function
const fetchWithRetry = async (
  url: string,
  options: RequestInit,
  maxRetries = 1,
  delay = 1000
): Promise<Response> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options)
      return response
    } catch (error: any) {
      if (i === maxRetries - 1) throw error
      await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)))
      console.log(`Retrying fetch (attempt ${i + 2}/${maxRetries})...`)
    }
  }
  throw new Error('Max retries exceeded')
}

export const fetchOnServer = async <T = any>(
  path: string,
  rev?: number,
  token?: 'token' | 'adminToken',
  cacheOption?: RequestInit['cache']
): Promise<{ data: T | null; error: string | null }> => {
  // Use serverBaseURL for server-side calls
  const apiURL = serverBaseURL

  if (!apiURL) {
    console.error('API URL is not configured')
    return { data: null, error: 'API URL not configured' }
  }

  const fullURL = apiURL + path

  // Use revalidate if rev is provided, otherwise use cacheOption or default to no-store
  const options: RequestInit = {
    ...(rev !== undefined ? { next: { revalidate: rev } } : { cache: cacheOption || 'no-store' })
  }

  if (token) {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const bearerToken = cookieStore.get(token)?.value
    options.headers = {
      ...options.headers,
      Authorization: `Bearer ${bearerToken}`
    }
  }

  // Do NOT attach AbortController to ISR fetches - it forces Next.js to treat them as dynamic (revalidate: 0)
  let cleanupTimeout: (() => void) | null = null
  if (rev === undefined) {
    const { signal, cleanup } = createTimeoutSignal(4000)
    options.signal = signal
    cleanupTimeout = cleanup
  }

  try {
    const response = await fetchWithRetry(fullURL, options, 1, 500)

    if (response.ok) {
      const data = await response.json()
      if (cleanupTimeout) cleanupTimeout()
      return data
    } else {
      if (cleanupTimeout) cleanupTimeout()
      const errorText = await response.text().catch(() => 'Unable to read error response')
      console.warn(`API request failed: ${path} - HTTP ${response.status}`, errorText)
      return { data: null, error: `HTTP ${response.status}` }
    }
  } catch (error: any) {
    if (cleanupTimeout) cleanupTimeout()
    // Handle abort (timeout) vs network error
    if (error.name === 'AbortError') {
      console.warn(`API request timeout: ${fullURL}`)
      return { data: null, error: 'Request timeout' }
    }

    // Suppress "Dynamic server usage" noise during build - Next.js throws this when prerender conflicts with fetch
    const isDynamicUsageError =
      typeof error?.message === 'string' && error.message.includes('Dynamic server usage:')
    if (!isDynamicUsageError) {
      console.error('fetchOnServer error:', path, error?.message)
    }

    return { data: null, error: error?.message || 'Network error' }
  }
}

export const getSiteConfig = async (): Promise<any | null> => {
  if (isBuildTime()) {
    return { siteName: 'UHQ Account', siteDescription: 'Account Management System' }
  }
  try {
    const data = await fetchOnServer('/settings/key/system_site_settings', 3600)
    if (data.error || !data?.data?.value) {
      return {
        siteName: 'UHQ Account',
        siteDescription: 'Account Management System'
      }
    }
    return (
      data?.data?.value || {
        siteName: 'UHQ Account',
        siteDescription: 'Account Management System'
      }
    )
  } catch (error: any) {
    console.error('getSiteConfig error:', error)
    return {
      siteName: 'UHQ Account',
      siteDescription: 'Account Management System'
    }
  }
}

export const getAnalyticsId = async (): Promise<any | null> => {
  if (isBuildTime()) return null
  try {
    const data = await fetchOnServer('/settings/key/system_analytics_scripts', 3600)
    return data.error ? null : data?.data?.value
  } catch (error: any) {
    console.error('getAnalyticsId error:', error)
    return null
  }
}

export const getHomepageData = async (): Promise<HomepageSettings | null> => {
  try {
    const data = await fetchOnServer('/settings/key/homepage_settings', 10) // revalidate every 10s
    return data.error ? null : data?.data?.value
  } catch (error: any) {
    console.error('getHomepageData error:', error)
    return null
  }
}

export const getFooterNav = async (): Promise<any | null> => {
  if (isBuildTime()) return null
  try {
    const data = await fetchOnServer('/settings/key/footer_menus', 3600)
    if (data.error) {
      return null
    }
    return data?.data?.value
  } catch (error: any) {
    console.error('getFooterNav error:', error)
    return null
  }
}

export const getMainNav = async (): Promise<any | null> => {
  if (isBuildTime()) return null
  try {
    const data = await fetchOnServer('/pages?location=HEADER&includes=isActive,sortOrder,url')
    if (data.error) {
      console.warn('getMainNav failed:', data.error)
      return null
    }
    return data?.data
  } catch (error: any) {
    console.error('getMainNav error:', error)
    return null
  }
}


// action/data.ts
// action/data.ts

/**
 * Fetch Facebook Pixel ID from server settings
 */
export const getFacebookPixelId = async (): Promise<string | null> => {
  if (isBuildTime()) return null
  try {
    const data = await fetchOnServer('/settings/key/system_analytics_scripts', 3600)
    if (data.error || !data?.data?.value) {
      return null
    }

    // Return only the facebookPixel field
    return data.data.value.facebookPixel || null
  } catch (error: any) {
    console.error('getFacebookPixelId error:', error)
    return null
  }
}
