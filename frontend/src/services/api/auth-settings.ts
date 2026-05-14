import type {
  FacebookAuthSettings,
  FacebookSettingsResponse,
  GoogleAuthSettings,
  GoogleSettingsResponse
} from '@/types/auth-settings'
import axiosInstance from './axiosInstance'

/**
 * Fetch Google authentication settings from API
 */
export async function getGoogleAuthSettings(): Promise<GoogleSettingsResponse | null> {
  try {
    const response = await axiosInstance.get<GoogleSettingsResponse>(
      '/settings/key/system_google_login',
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )

    return response.data
  } catch (error) {
    console.error('Error fetching Google auth settings:', error)
    return null
  }
}

/**
 * Fetch Facebook authentication settings from API
 */
export async function getFacebookAuthSettings(): Promise<FacebookSettingsResponse | null> {
  try {
    const response = await axiosInstance.get<FacebookSettingsResponse>(
      '/settings/key/system_facebook_login',
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )

    return response.data
  } catch (error) {
    console.error('Error fetching Facebook auth settings:', error)
    return null
  }
}

/**
 * Get Google auth settings with fallback to environment variables
 */
export function getGoogleAuthConfig(): Promise<GoogleAuthSettings | null> {
  return getGoogleAuthSettings()
    .then((settings) => {
      if (settings?.data?.value) {
        return settings.data.value
      }
      return null
    })
    .catch((error) => {
      console.error('Error fetching Google auth config:', error)
      return null
    })
}

/**
 * Get Facebook auth settings with fallback to environment variables
 */
export function getFacebookAuthConfig(): Promise<FacebookAuthSettings | null> {
  return getFacebookAuthSettings()
    .then((settings) => {
      if (settings?.data?.value) {
        return settings?.data?.value
      }
      return null
    })
    .catch((error) => {
      console.error('Error fetching Facebook auth config:', error)
      return null
    })
}

/**
 * Fetch Twitter auth settings
 */
export async function getTwitterAuthSettings(): Promise<{
  data?: { value?: { isActive?: boolean; appId?: string; appSecret?: string } }
} | null> {
  try {
    const response = await axiosInstance.get('/settings/key/system_twitter_login')
    return response.data
  } catch {
    return null
  }
}

/**
 * Fetch Telegram auth settings
 */
export async function getTelegramAuthSettings(): Promise<{
  data?: { value?: { isActive?: boolean; appId?: string; appSecret?: string } }
} | null> {
  try {
    const response = await axiosInstance.get('/settings/key/system_telegram_login')
    return response.data
  } catch {
    return null
  }
}

/**
 * Fetch all social auth settings (Google, Facebook, Twitter, Telegram)
 */
export async function getAllAuthSettings() {
  const [googleSettings, facebookSettings, twitterRes, telegramRes] = await Promise.all([
    getGoogleAuthConfig(),
    getFacebookAuthConfig(),
    getTwitterAuthSettings(),
    getTelegramAuthSettings()
  ])

  const twitter =
    (twitterRes?.data?.value as
      | { isActive?: boolean; appId?: string; appSecret?: string }
      | undefined) ?? null
  const telegram =
    (telegramRes?.data?.value as
      | { isActive?: boolean; appId?: string; appSecret?: string }
      | undefined) ?? null

  return {
    google: googleSettings,
    facebook: facebookSettings,
    twitter,
    telegram
  }
}
