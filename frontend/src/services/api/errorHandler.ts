import { AxiosError } from 'axios'
import { toast } from 'sonner'
import Cookies from 'js-cookie'
import { clearSession } from './authUtils'

function getRequestLabel(error: AxiosError): string {
  const method = error.config?.method?.toUpperCase() ?? 'GET'
  const baseURL = error.config?.baseURL ?? ''
  const url = error.config?.url ?? ''
  const fullUrl = url.startsWith('http') ? url : `${baseURL}${url}`
  return fullUrl ? `[${method} ${fullUrl}]` : ''
}

export const handleApiError = (error: AxiosError) => {
  const status = error.response?.status
  const requestLabel = getRequestLabel(error)
  const skipAuthRedirect = (error.config as any)?.skipAuthRedirect
  const hasToken = Cookies.get('token')

  // Define the error messages based on status codes
  const errorMessages: Record<number | 'default', string> = {
    401: 'Session expired. Please log in again.',
    403: 'You do not have permission to perform this action.',
    500: 'Server error. Please try again later.',
    default:
      (error.response?.data as { message?: string })?.message || 'An unexpected error occurred.'
  }

  // Network / CORS failures have no response payload
  if (!error.response) {
    const networkMessage =
      error.code === 'ERR_NETWORK'
        ? 'Unable to reach the API server. Check that the backend is running and NEXT_PUBLIC_APP_ROOT_API is set correctly.'
        : error.message || 'Network request failed.'
    const logMessage = requestLabel ? `${requestLabel} ${networkMessage}` : networkMessage
    console.error(logMessage)
    return
  }

  // Prefer API message when present, then status-specific defaults
  const apiMessage = (error.response?.data as { message?: string })?.message
  const message =
    apiMessage ||
    errorMessages[status || 'default'] ||
    errorMessages.default
  const logMessage = requestLabel ? `${requestLabel} ${message}` : message

  // Handle different error status codes with appropriate error messages
  switch (status) {
    case 401:
      console.error(logMessage)
      // Only redirect if this is not a guest/optional-auth request AND user has token
      // Guests (no token) on optional auth endpoints will get 401 but shouldn't redirect
      if (!skipAuthRedirect && hasToken) {
        toast.error(message)
        clearSession()
      } else if (!hasToken) {
        // Guest user on 401 - show informative message without redirecting
        const errorMsg = (error.response?.data as any)?.message || 'Unable to process request. Please check your details and try again.'
        toast.error(errorMsg)
      } else {
        // For guest requests with skipAuthRedirect, show a more appropriate message
        toast.error('Unable to process request. Please try again.')
      }
      break
    case 403:
      console.error(logMessage)
      break
    case 500:
      console.error(logMessage)
      break
    default:
      console.error(logMessage)
  }
}
