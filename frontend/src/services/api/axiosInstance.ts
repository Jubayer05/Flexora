import axios from 'axios'
import Cookies from 'js-cookie'
import { getApiBaseUrl } from '@/lib/api-base-url'
import { handleApiError } from './errorHandler'

// Ensure base URL ends with / so paths like "admin/blogs/upload-image" resolve to .../api/v1/admin/... not .../api/v1admin/...
const rawBaseURL = getApiBaseUrl()
const baseURL = rawBaseURL ? (rawBaseURL.endsWith('/') ? rawBaseURL : `${rawBaseURL}/`) : ''

const axiosInstance = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json'
  }
})

let refreshPromise: Promise<string | null> | null = null

const setCookie = (name: string, value: string) => {
  Cookies.set(name, value, {
    sameSite: 'lax',
    secure: typeof window !== 'undefined' ? window.location.protocol === 'https:' : false,
    expires: 7,
    path: '/'
  })
}

const refreshCustomerToken = async (): Promise<string | null> => {
  const refreshToken = Cookies.get('refreshToken')
  if (!refreshToken) return null

  try {
    const response = await axios.post(`${baseURL}customer/auth/refresh-token`, { refreshToken }, {
      headers: { 'Content-Type': 'application/json' }
    })

    const nextToken = response.data?.data?.token
    const nextRefreshToken = response.data?.data?.refreshToken

    if (!nextToken || !nextRefreshToken) {
      return null
    }

    setCookie('token', nextToken)
    setCookie('refreshToken', nextRefreshToken)
    return nextToken
  } catch {
    Cookies.remove('token')
    Cookies.remove('refreshToken')
    Cookies.remove('user')
    return null
  }
}

const refreshAdminToken = async (): Promise<string | null> => {
  const refreshToken = Cookies.get('adminRefreshToken')
  if (!refreshToken) return null

  try {
    const response = await axios.post(`${baseURL}admin/auth/refresh-token`, { refreshToken }, {
      headers: { 'Content-Type': 'application/json' }
    })

    const nextToken = response.data?.data?.token
    const nextRefreshToken = response.data?.data?.refreshToken

    if (!nextToken || !nextRefreshToken) {
      return null
    }

    setCookie('adminToken', nextToken)
    setCookie('adminRefreshToken', nextRefreshToken)
    return nextToken
  } catch {
    Cookies.remove('adminToken')
    Cookies.remove('adminRefreshToken')
    Cookies.remove('permissions')
    Cookies.remove('userRole')
    return null
  }
}

// Request Interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    const url = (config.url || '').toString()
    const isAdmin = url.startsWith('/admin') || url.startsWith('admin')
    const cookieName = isAdmin ? 'adminToken' : 'token'
    const token = Cookies.get(cookieName)
    // Ensure relative paths join with a single slash (avoids .../v1admin/... when base lacked trailing slash)
    if (url && !url.startsWith('http') && config.baseURL) {
      const base = config.baseURL.endsWith('/') ? config.baseURL : `${config.baseURL}/`
      const path = url.startsWith('/') ? url.slice(1) : url
      config.baseURL = base
      config.url = path
    }

    // Let the browser set Content-Type with boundary for FormData (e.g. ticket/gallery uploads)
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      delete config.headers['Content-Type']
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    if (!token && typeof window !== 'undefined') {
      const guestAccessToken =
        window.sessionStorage.getItem('guestAccessToken') || Cookies.get('guestAccessToken')
      if (guestAccessToken) {
        config.headers['x-guest-access-token'] = guestAccessToken
      }
    }

    return config
  },
  (error) => Promise.reject(error)
)

// Response Interceptor (Optional: Auto Retry Failed Requests)
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Check if this request should skip auth error handling (e.g., guest endpoints)
    const skipAuthRedirect = (error.config as any)?.skipAuthRedirect
    const userToken = Cookies.get('token')
    const status = error.response?.status
    const originalRequest = error.config || {}
    const requestUrl = (originalRequest.url || '').toString()
    const isAdminRequest = requestUrl.startsWith('/admin') || requestUrl.startsWith('admin')
    const activeToken = isAdminRequest ? Cookies.get('adminToken') : userToken

    if (
      status === 401 &&
      activeToken &&
      !originalRequest._retry &&
      (isAdminRequest ? Cookies.get('adminRefreshToken') : Cookies.get('refreshToken'))
    ) {
      originalRequest._retry = true
      refreshPromise ??= (isAdminRequest ? refreshAdminToken() : refreshCustomerToken()).finally(() => {
        refreshPromise = null
      })

      const refreshedToken = await refreshPromise
      if (refreshedToken) {
        originalRequest.headers = originalRequest.headers || {}
        originalRequest.headers.Authorization = `Bearer ${refreshedToken}`
        return axiosInstance(originalRequest)
      }
    }
    
    // For guests (no token) on 401, don't redirect - it's expected for optional endpoints
    if (!activeToken && status === 401) {
      console.error('[Auth Error] Guest request failed with 401', error)
      return Promise.reject(error)
    }

    const silentError = (error.config as { silentError?: boolean })?.silentError

    // For authenticated users or skipAuthRedirect flag, handle accordingly
    if (silentError) {
      // Background polling (e.g. header notifications) — skip global error logging
    } else if (!skipAuthRedirect) {
      handleApiError(error)
    } else if (status === 401) {
      // For requests with skipAuthRedirect flag on 401, just log it
      console.error('[Auth Error] Guest request failed', error)
    } else {
      handleApiError(error)
    }
    return Promise.reject(error)
  }
)

export default axiosInstance
