import { z } from 'zod'

// URL validation function
const isValidUrl = (url: string): boolean => {
  if (!url || url.trim() === '') return false // URLs are required for promotional icons
  try {
    const urlObj = new URL(url)
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
  } catch {
    return false
  }
}

// Single promotional icon schema
export const PromotionalIconSchema = z.object({
  icon: z.string().min(1, 'Icon is required'),
  name: z.string().min(1, 'Name is required').max(50, 'Name must be less than 50 characters'),
  url: z.string().min(1, 'URL is required').refine(isValidUrl, {
    message: 'Please enter a valid URL (http:// or https://)'
  }),
  isActive: z.boolean()
})

// Array of promotional icons schema
export const PromotionalIconsSchema = z.object({
  icons: z.array(PromotionalIconSchema).max(10, 'Maximum 10 promotional icons allowed')
})

// Single promotional icon creation/update schema
export const CreatePromotionalIconSchema = PromotionalIconSchema

// Update schema without refinements, then add refinements
const UpdatePromotionalIconBaseSchema = z.object({
  id: z.string().optional(),
  icon: z.string().min(1, 'Icon is required').optional(),
  name: z.string().min(1, 'Name is required').max(50, 'Name must be less than 50 characters').optional(),
  url: z.string().min(1, 'URL is required').optional(),
  isActive: z.boolean().optional()
})

export const UpdatePromotionalIconSchema = UpdatePromotionalIconBaseSchema.refine((data) => {
  // Only validate URL if it's provided
  if (data.url !== undefined && data.url !== '') {
    return isValidUrl(data.url)
  }
  return true
}, {
  message: 'Please enter a valid URL (http:// or https://)',
  path: ['url']
})

// TypeScript types
export type PromotionalIconType = z.infer<typeof PromotionalIconSchema>
export type PromotionalIconsType = z.infer<typeof PromotionalIconsSchema>
export type CreatePromotionalIconType = z.infer<typeof CreatePromotionalIconSchema>
export type UpdatePromotionalIconType = z.infer<typeof UpdatePromotionalIconSchema>

// Promotional icon configuration interface
export interface PromotionalIconConfig {
  maxIcons: number
  allowedIconTypes: string[]
  iconSize: {
    width: number
    height: number
  }
  supportedFormats: string[]
}

// Default configuration
export const PROMOTIONAL_ICON_CONFIG: PromotionalIconConfig = {
  maxIcons: 10,
  allowedIconTypes: ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'],
  iconSize: {
    width: 64,
    height: 64
  },
  supportedFormats: ['PNG', 'JPEG', 'SVG', 'WebP']
}
