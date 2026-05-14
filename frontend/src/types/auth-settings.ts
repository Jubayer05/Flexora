export interface GoogleAuthSettings {
  appId: string
  isActive: boolean
  appSecret: string
  websiteUrl: string
  redirectUrl: string
}

export interface FacebookAuthSettings {
  appId: string
  isActive: boolean
  appSecret: string
  websiteUrl: string
  redirectUrl: string
}

export interface AuthSettingsResponse<T> {
  data: {
    id: number
    key: string
    value: T
  }
}

export type GoogleSettingsResponse = AuthSettingsResponse<GoogleAuthSettings>
export type FacebookSettingsResponse = AuthSettingsResponse<FacebookAuthSettings>
export const CacheToCheck = Date.now()
