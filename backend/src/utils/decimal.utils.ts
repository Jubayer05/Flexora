import { Prisma } from '@prisma/client'

/**
 * Transform Prisma Decimal fields and Date objects to JSON-safe values
 */
export function transformDecimals<T>(obj: T): T {
  if (!obj || typeof obj !== 'object') {
    return obj
  }

  // Handle Date objects
  if (obj instanceof Date) {
    return obj.toISOString() as unknown as T
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => transformDecimals(item)) as unknown as T
  }

  const transformed = { ...obj } as any

  // Common decimal field names in your schema
  const decimalFields = [
    'price',
    'originalPrice',
    'costPrice',
    'totalSpent',
    'discountPercent',
    'subtotal',
    'discount',
    'total',
    'unitPrice',
    'totalPrice',
    'minSpending',
    'maxSpending',
    'amount',
    'paidAmount',
    'refundedAmount',
    'discountValue',
    'maxDiscountAmount',
    'minOrderAmount',
    'discountAmount',
    'orderAmount',
    'ratings',
    'minAmount'
  ]

  // Common date field names in your schema
  const dateFields = [
    'createdAt',
    'updatedAt',
    'deletedAt',
    'publishedAt',
    'expiresAt',
    'usedAt',
    'deliveredAt',
    'lastLoginAt',
    'verifiedAt',
    'activatedAt',
    'deactivatedAt',
    'startDate',
    'endDate'
  ]

  // Transform decimal fields
  for (const field of decimalFields) {
    if (field in transformed && transformed[field] !== null && transformed[field] !== undefined) {
      const value = transformed[field]
      if (value instanceof Prisma.Decimal || (typeof value === 'object' && value.toString)) {
        transformed[field] = Number(value.toString())
      } else if (typeof value === 'string' && /^\d+\.?\d*$/.test(value)) {
        transformed[field] = Number(value)
      }
    }
  }

  // Transform Date fields to ISO strings
  for (const field of dateFields) {
    if (field in transformed && transformed[field] instanceof Date) {
      transformed[field] = transformed[field].toISOString()
    }
  }

  // Recursively transform nested objects
  for (const key in transformed) {
    if (
      transformed[key] &&
      typeof transformed[key] === 'object' &&
      !Array.isArray(transformed[key])
    ) {
      transformed[key] = transformDecimals(transformed[key])
    } else if (Array.isArray(transformed[key])) {
      transformed[key] = transformed[key].map((item: any) =>
        typeof item === 'object' ? transformDecimals(item) : item
      )
    }
  }

  return transformed as T
}
export const validateNanoSec = 10368000000 / 2

/**
 * Transform decimal strings and date strings back to proper types (for cached data)
 */
export function parseDecimalStrings<T>(obj: T): T {
  if (!obj || typeof obj !== 'object') {
    return obj
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => parseDecimalStrings(item)) as unknown as T
  }

  const parsed = { ...obj } as any

  // Common decimal field names
  const decimalFields = [
    'price',
    'originalPrice',
    'costPrice',
    'totalSpent',
    'discountPercent',
    'subtotal',
    'discount',
    'total',
    'unitPrice',
    'totalPrice',
    'minSpending',
    'maxSpending',
    'amount',
    'paidAmount',
    'refundedAmount',
    'discountValue',
    'maxDiscountAmount',
    'minOrderAmount',
    'discountAmount',
    'orderAmount',
    'ratings',
    'minAmount'
  ]

  // Common date field names
  const dateFields = [
    'createdAt',
    'updatedAt',
    'deletedAt',
    'publishedAt',
    'expiresAt',
    'usedAt',
    'deliveredAt',
    'lastLoginAt',
    'verifiedAt',
    'activatedAt',
    'deactivatedAt',
    'startDate',
    'endDate'
  ]

  // Parse string decimals to numbers
  for (const field of decimalFields) {
    if (field in parsed && typeof parsed[field] === 'string' && /^\d+\.?\d*$/.test(parsed[field])) {
      parsed[field] = Number(parsed[field])
    }
  }

  // Parse ISO date strings (keep as strings for JSON response)
  for (const field of dateFields) {
    if (
      field in parsed &&
      typeof parsed[field] === 'string' &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(parsed[field])
    ) {
      // Date is already an ISO string, keep it as is
      // Don't convert back to Date object to avoid {} issue
    }
  }

  // Recursively parse nested objects
  for (const key in parsed) {
    if (parsed[key] && typeof parsed[key] === 'object' && !Array.isArray(parsed[key])) {
      parsed[key] = parseDecimalStrings(parsed[key])
    } else if (Array.isArray(parsed[key])) {
      parsed[key] = parsed[key].map((item: any) =>
        typeof item === 'object' ? parseDecimalStrings(item) : item
      )
    }
  }

  return parsed as T
}
