/**
 * Visitor Tracking Utility
 *
 * Tracks unique visitors per session per day
 * Uses sessionStorage to prevent double counting within same session
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_APP_ROOT_API || 'http://localhost:5015/api/v1'

/**
 * Get today's date in YYYY-MM-DD format
 */
const getTodayDate = (): string => {
  const today = new Date()
  return today.toISOString().split('T')[0] // YYYY-MM-DD
}

/**
 * Get sessionStorage key for today's tracking
 */
const getStorageKey = (date: string): string => {
  return `vt_${date}`
}

/**
 * Check if visitor already tracked for today
 */
const isTrackedToday = (date: string): boolean => {
  try {
    const key = getStorageKey(date)
    return sessionStorage.getItem(key) === 'true'
  } catch {
    // SessionStorage not available (SSR or disabled)
    return false
  }
}

/**
 * Mark visitor as tracked for today
 */
const markAsTracked = (date: string): void => {
  try {
    const key = getStorageKey(date)
    sessionStorage.setItem(key, 'true')
  } catch {
    // SessionStorage not available - silent fail
    console.warn('SessionStorage not available for visitor tracking')
  }
}

/**
 * Track visitor by calling backend API
 */
export const trackVisitor = async (): Promise<void> => {
  // Only run in browser
  if (typeof window === 'undefined') {
    return
  }

  const today = getTodayDate()

  // Check if already tracked today in this session
  if (isTrackedToday(today)) {
    return
  }

  try {
    // Validate API URL
    if (!API_BASE_URL) {
      console.warn('API_BASE_URL is not configured')
      return
    }

    // Call backend API to increment count
    const response = await fetch(`${API_BASE_URL}/visitor/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ date: today }),
      // Add timeout and signal
      signal: AbortSignal.timeout(5000) // 5 second timeout
    })

    if (response.ok) {
      // Mark as tracked in sessionStorage
      markAsTracked(today)
    } else {
      console.warn(`Visitor tracking failed: ${response.status} ${response.statusText}`)
    }
  } catch (error) {
    // Silent fail - don't break user experience
    // Only log in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to track visitor:', error)
      console.error('API_BASE_URL:', API_BASE_URL)
    }
  }
}
