import { PageItem } from '@/lib/validations/schemas/pageSchema'
import { renderStars } from '@/utils/renderStarts'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Check if a value is an image URL
export const isImage = (
  value: string | number | boolean | object | string[] | null
): value is string =>
  typeof value === 'string' && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(value) && value !== ''

// Check if a value is an array of image URLs
export const isImageArray = (
  value: string | number | boolean | object | string[] | null
): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string' && isImage(item))

// Check if a value is an array of data
export const isArray = (value: string | number | boolean | object | string[] | null) =>
  Array.isArray(value)

// Capitalizes the first letter of a string
export const capitalize = (str: string): string => str.charAt(0).toUpperCase() + str.slice(1)

// Utility function to format camelCase or PascalCase keys
export const formatKey = (key: string) => {
  return key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
}

// Utility function to format values
export const formatValue = (key: string, value: unknown): React.ReactNode => {
  if (key === 'rating' && typeof value === 'number') return renderStars(value)
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  //   if (isValidDate(value)) return dayjs(value as string).format('MMMM D, YYYY h:mm A')
  if (Array.isArray(value) && value.every((v) => typeof v === 'string')) {
    return value.join(', ')
  }
  if (typeof value === 'number' || typeof value === 'string') return value
  return JSON.stringify(value)
}

// Convert menuKey from kebab-case to snake_case for API compatibility
export const convertMenuKey = (rawMenuKey: string | string[] | undefined): string | undefined => {
  if (!rawMenuKey) return undefined

  const key =
    typeof rawMenuKey === 'string'
      ? rawMenuKey
      : Array.isArray(rawMenuKey)
      ? rawMenuKey[0]
      : undefined

  return key?.replace(/-/g, '_')
}

// export const isValidDate = (value: unknown): boolean => {
//   if (typeof value !== 'string') return false
//   if (/^\d+$/.test(value)) return false // Prevent numeric-only strings (phone numbers)
//   return dayjs(value, ['YYYY-MM-DD', 'YYYY-MM-DDTHH:mm:ss.SSSZ'], true).isValid()
// }

// Filter menu items based on isActive and showInMenu status (recursively filters children too)
export const filterActiveMenuItems = (items: PageItem[]): PageItem[] => {
  if (!items || !Array.isArray(items)) return []

  return items
    .filter((item) => item.isActive)
    .map((item) => ({
      ...item,
      children: item.children ? filterActiveMenuItems(item.children) : undefined
    }))
}
