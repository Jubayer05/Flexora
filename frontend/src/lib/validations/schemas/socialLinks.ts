import { z } from 'zod'

// Social media platforms enum
export enum SocialPlatform {
  FACEBOOK = 'facebook',
  TWITTER = 'twitter',
  INSTAGRAM = 'instagram',
  LINKEDIN = 'linkedin',
  YOUTUBE = 'youtube',
  TIKTOK = 'tiktok',
  DISCORD = 'discord',
  TELEGRAM = 'telegram',
  GITHUB = 'github',
  DRIBBBLE = 'dribbble'
}

// URL validation function
const isValidUrl = (url: string): boolean => {
  if (!url || url.trim() === '') return true // Allow empty URLs
  try {
    const urlObj = new URL(url)
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
  } catch {
    return false
  }
}

// Platform-specific URL validation
const validatePlatformUrl =
  (platform: SocialPlatform) =>
  (url: string): boolean => {
    if (!url || url.trim() === '') return true // Allow empty URLs

    if (!isValidUrl(url)) return false

    const platformDomains: Record<SocialPlatform, string[]> = {
      [SocialPlatform.FACEBOOK]: ['facebook.com', 'fb.com', 'm.facebook.com'],
      [SocialPlatform.TWITTER]: ['twitter.com', 'x.com', 'mobile.twitter.com'],
      [SocialPlatform.INSTAGRAM]: ['instagram.com', 'instagr.am'],
      [SocialPlatform.LINKEDIN]: ['linkedin.com'],
      [SocialPlatform.YOUTUBE]: ['youtube.com', 'youtu.be'],
      [SocialPlatform.TIKTOK]: ['tiktok.com'],
      [SocialPlatform.DISCORD]: ['discord.gg', 'discord.com'],
      [SocialPlatform.TELEGRAM]: ['t.me', 'telegram.me'],
      [SocialPlatform.GITHUB]: ['github.com'],
      [SocialPlatform.DRIBBBLE]: ['dribbble.com']
    }

    try {
      const urlObj = new URL(url)
      const hostname = urlObj.hostname.toLowerCase()
      const domains = platformDomains[platform] || []

      return domains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))
    } catch {
      return false
    }
  }

// Social link item schema
export const SocialLinkSchema = z.object({
  url: z.string(),
  isActive: z.boolean(),
  displayText: z.string(),
  order: z.number().optional()
})

// Enhanced social link schema with platform validation
export const createPlatformLinkSchema = (platform: SocialPlatform) =>
  z.object({
    url: z.string().refine((url) => validatePlatformUrl(platform)(url || ''), {
      message: `Please enter a valid ${platform.charAt(0).toUpperCase() + platform.slice(1)} URL`
    }),
    isActive: z.boolean(),
    displayText: z.string(),
    order: z.number().optional()
  })

// Main social links schema
export const SocialLinksSchema = z.object({
  facebook: createPlatformLinkSchema(SocialPlatform.FACEBOOK),
  twitter: createPlatformLinkSchema(SocialPlatform.TWITTER),
  instagram: createPlatformLinkSchema(SocialPlatform.INSTAGRAM),
  linkedin: createPlatformLinkSchema(SocialPlatform.LINKEDIN),
  youtube: createPlatformLinkSchema(SocialPlatform.YOUTUBE),
  tiktok: createPlatformLinkSchema(SocialPlatform.TIKTOK),
  discord: createPlatformLinkSchema(SocialPlatform.DISCORD),
  telegram: createPlatformLinkSchema(SocialPlatform.TELEGRAM),
  github: createPlatformLinkSchema(SocialPlatform.GITHUB),
  dribbble: createPlatformLinkSchema(SocialPlatform.DRIBBBLE)
})

// TypeScript types
export type SocialLinkType = {
  url: string
  isActive: boolean
  displayText: string
  order?: number
}

export type SocialLinksType = {
  facebook: SocialLinkType
  twitter: SocialLinkType
  instagram: SocialLinkType
  linkedin: SocialLinkType
  youtube: SocialLinkType
  tiktok: SocialLinkType
  discord: SocialLinkType
  telegram: SocialLinkType
  github: SocialLinkType
  dribbble: SocialLinkType
}

// Social platform configuration
export interface SocialPlatformConfig {
  name: string
  label: string
  placeholder: string
  icon?: string
  color?: string
  baseUrl?: string
}

export const SOCIAL_PLATFORM_CONFIGS: Record<SocialPlatform, SocialPlatformConfig> = {
  [SocialPlatform.FACEBOOK]: {
    name: 'facebook',
    label: 'Facebook',
    placeholder: 'https://facebook.com/yourpage',
    color: '#1877F2',
    baseUrl: 'https://facebook.com'
  },
  [SocialPlatform.TWITTER]: {
    name: 'twitter',
    label: 'Twitter / X',
    placeholder: 'https://twitter.com/username',
    color: '#1DA1F2',
    baseUrl: 'https://twitter.com'
  },
  [SocialPlatform.INSTAGRAM]: {
    name: 'instagram',
    label: 'Instagram',
    placeholder: 'https://instagram.com/username',
    color: '#E4405F',
    baseUrl: 'https://instagram.com'
  },
  [SocialPlatform.LINKEDIN]: {
    name: 'linkedin',
    label: 'LinkedIn',
    placeholder: 'https://linkedin.com/company/yourcompany',
    color: '#0A66C2',
    baseUrl: 'https://linkedin.com'
  },
  [SocialPlatform.YOUTUBE]: {
    name: 'youtube',
    label: 'YouTube',
    placeholder: 'https://youtube.com/channel/yourchannel',
    color: '#FF0000',
    baseUrl: 'https://youtube.com'
  },
  [SocialPlatform.TIKTOK]: {
    name: 'tiktok',
    label: 'TikTok',
    placeholder: 'https://tiktok.com/@username',
    color: '#000000',
    baseUrl: 'https://tiktok.com'
  },
  [SocialPlatform.DISCORD]: {
    name: 'discord',
    label: 'Discord',
    placeholder: 'https://discord.gg/serverinvite',
    color: '#5865F2',
    baseUrl: 'https://discord.gg'
  },
  [SocialPlatform.TELEGRAM]: {
    name: 'telegram',
    label: 'Telegram',
    placeholder: 'https://t.me/username',
    color: '#0088CC',
    baseUrl: 'https://t.me'
  },
  [SocialPlatform.GITHUB]: {
    name: 'github',
    label: 'GitHub',
    placeholder: 'https://github.com/username',
    color: '#181717',
    baseUrl: 'https://github.com'
  },
  [SocialPlatform.DRIBBBLE]: {
    name: 'dribbble',
    label: 'Dribbble',
    placeholder: 'https://dribbble.com/username',
    color: '#EA4C89',
    baseUrl: 'https://dribbble.com'
  }
}
