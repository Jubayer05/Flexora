/**
 * Product Cloaking Utility for Volet (Stripe)
 * Maps real product information to safe, Stripe-compliant descriptions
 * 
 * Reference: https://anotepad.com/notes/6msy37i4
 */

export interface CloakedProductInfo {
  name: string // Cloaked product name visible to Stripe
  description: string // Cloaked description
  statementDescriptor: string // Statement descriptor for card statements
  internalId?: string // Internal product ID for mapping
}

/**
 * Product cloaking mapping
 * Maps real products to Stripe-safe descriptions
 */
const PRODUCT_CLOAKING_MAP: Record<string, CloakedProductInfo> = {
  // IPTV Products
  'IPTV_1M': {
    name: 'Content Access Plan',
    description: 'Secure access to digital utility features',
    statementDescriptor: 'VIPSTORE DIGITAL',
    internalId: '301'
  },
  'IPTV_3M': {
    name: 'Premium Digital Bundle',
    description: 'Secure access to digital utility features',
    statementDescriptor: 'VIPSTORE DIGITAL',
    internalId: '302'
  },
  // Telegram Accounts
  'TELEGRAM_ACCOUNTS': {
    name: 'Content Access Plan',
    description: 'Secure access to digital utility features',
    statementDescriptor: 'VIPSTORE DIGITAL',
    internalId: '303'
  },
  // Premium Subscriptions
  'PREMIUM_1M': {
    name: 'Content Access Plan',
    description: 'Secure access to digital utility features',
    statementDescriptor: 'VIPSTORE DIGITAL',
    internalId: '304'
  },
  'PREMIUM_3M': {
    name: 'Premium Digital Bundle',
    description: 'Secure access to digital utility features',
    statementDescriptor: 'VIPSTORE DIGITAL',
    internalId: '305'
  },
  'PREMIUM_6M': {
    name: 'Premium Digital Bundle',
    description: 'Secure access to digital utility features',
    statementDescriptor: 'VIPSTORE DIGITAL',
    internalId: '306'
  },
  'PREMIUM_12M': {
    name: 'Premium Digital Bundle',
    description: 'Secure access to digital utility features',
    statementDescriptor: 'VIPSTORE DIGITAL',
    internalId: '307'
  },
  // Default fallback
  'DEFAULT': {
    name: 'Content Access Plan',
    description: 'Secure access to digital utility features',
    statementDescriptor: 'VIPSTORE DIGITAL',
    internalId: '300'
  }
}

/**
 * Get cloaked product information for Stripe
 * @param productType - The product type (e.g., 'TELEGRAM_ACCOUNTS', 'PREMIUM_1M')
 * @param productName - Optional real product name (for logging only)
 * @returns Cloaked product information safe for Stripe
 */
export function getCloakedProductInfo(
  productType?: string | null,
  productName?: string | null
): CloakedProductInfo {
  // Normalize product type
  const normalizedType = productType?.toUpperCase() || 'DEFAULT'
  
  // Check if we have a specific mapping, always fallback to DEFAULT
  // DEFAULT is guaranteed to exist in the map
  const cloaked = PRODUCT_CLOAKING_MAP[normalizedType] ?? PRODUCT_CLOAKING_MAP['DEFAULT']!
  
  // Log cloaking for audit (in development only)
  if (process.env.NODE_ENV === 'development' && productName) {
    console.log('[Product Cloaking]', {
      original: productName,
      type: normalizedType,
      cloaked: cloaked.name
    })
  }
  
  // Return the cloaked info (guaranteed to exist due to DEFAULT fallback)
  return cloaked
}

/**
 * Check if a product type should be cloaked
 * @param productType - The product type to check
 * @returns true if product should be cloaked
 */
export function shouldCloakProduct(productType?: string | null): boolean {
  if (!productType) return true // Default to cloaking if unknown
  
  const normalizedType = productType.toUpperCase()
  return normalizedType in PRODUCT_CLOAKING_MAP || normalizedType.includes('IPTV') || 
         normalizedType.includes('TELEGRAM') || normalizedType.includes('PREMIUM')
}

