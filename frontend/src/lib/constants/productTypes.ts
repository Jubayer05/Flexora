/**
 * Product Type Constants and Options
 *
 * Common constants for product types used across the application
 */

// Product Type Values (consistent with database enum)
export const PRODUCT_TYPE_VALUES = {
  FILE: 'FILE',
  SERVICE: 'SERVICE',
  TELEGRAM_CHANNEL_GROUPS: 'TELEGRAM_CHANNEL_GROUPS',
  SERIAL: 'SERIAL',
  PREMIUM: 'PREMIUM',
  TELEGRAM: 'TELEGRAM'
} as const

export const PRODUCT_PLATFORM_VALUES = {
  OTHER: 'OTHER',
  TELEGRAM: 'TELEGRAM'
} as const

// Product Platform Labels for UI display
export const PRODUCT_PLATFORM_LABELS = {
  [PRODUCT_PLATFORM_VALUES.TELEGRAM]: 'Telegram',
  [PRODUCT_PLATFORM_VALUES.OTHER]: 'Other Platform'
} as const

// Product Type Labels for UI display
export const PRODUCT_TYPE_LABELS = {
  [PRODUCT_TYPE_VALUES.FILE]: 'File',
  [PRODUCT_TYPE_VALUES.SERVICE]: 'Service',
  [PRODUCT_TYPE_VALUES.TELEGRAM_CHANNEL_GROUPS]: 'Telegram Auto Delivery Channels and Groups',
  [PRODUCT_TYPE_VALUES.SERIAL]: 'Credentials',
  [PRODUCT_TYPE_VALUES.PREMIUM]: 'Premium Telegram service',
  [PRODUCT_TYPE_VALUES.TELEGRAM]: 'Telegram Accounts Auto Delivery'
} as const

// Platform Type Options for Select components
export const PRODUCT_PLATFORM_OPTIONS = [
  {
    value: PRODUCT_PLATFORM_VALUES.OTHER,
    label: PRODUCT_PLATFORM_LABELS[PRODUCT_PLATFORM_VALUES.OTHER]
  },
  {
    value: PRODUCT_PLATFORM_VALUES.TELEGRAM,
    label: PRODUCT_PLATFORM_LABELS[PRODUCT_PLATFORM_VALUES.TELEGRAM]
  }
]

// Product Type Options for Select components
export const PRODUCT_TYPE_OPTIONS = [
  {
    value: PRODUCT_TYPE_VALUES.FILE,
    label: PRODUCT_TYPE_LABELS.FILE
  },
  {
    value: PRODUCT_TYPE_VALUES.SERVICE,
    label: PRODUCT_TYPE_LABELS.SERVICE
  },
  {
    value: PRODUCT_TYPE_VALUES.TELEGRAM_CHANNEL_GROUPS,
    label: PRODUCT_TYPE_LABELS.TELEGRAM_CHANNEL_GROUPS
  },
  {
    value: PRODUCT_TYPE_VALUES.SERIAL,
    label: PRODUCT_TYPE_LABELS.SERIAL
  },
  {
    value: PRODUCT_TYPE_VALUES.PREMIUM,
    label: PRODUCT_TYPE_LABELS.PREMIUM
  },
  {
    value: PRODUCT_TYPE_VALUES.TELEGRAM,
    label: PRODUCT_TYPE_LABELS.TELEGRAM
  }
]

// Product Type Options for editing (excludes SERIAL as mentioned in Product.tsx)
export const PRODUCT_TYPE_OPTIONS_EDIT = [
  {
    value: PRODUCT_TYPE_VALUES.FILE,
    label: PRODUCT_TYPE_LABELS.FILE
  },
  {
    value: PRODUCT_TYPE_VALUES.SERVICE,
    label: PRODUCT_TYPE_LABELS.SERVICE
  },
  {
    value: PRODUCT_TYPE_VALUES.TELEGRAM_CHANNEL_GROUPS,
    label: PRODUCT_TYPE_LABELS.TELEGRAM_CHANNEL_GROUPS
  },
  {
    value: PRODUCT_TYPE_VALUES.PREMIUM,
    label: PRODUCT_TYPE_LABELS.PREMIUM
  },
  {
    value: PRODUCT_TYPE_VALUES.TELEGRAM,
    label: PRODUCT_TYPE_LABELS.TELEGRAM
  }
]

// Type for product type values
export type ProductTypeValue = (typeof PRODUCT_TYPE_VALUES)[keyof typeof PRODUCT_TYPE_VALUES]

// Helper function to get product type label
export const getProductTypeLabel = (type: ProductTypeValue): string => {
  return PRODUCT_TYPE_LABELS[type] || type
}

// Helper function to get product type options based on context
export const getProductTypeOptions = (isEditing?: boolean) => {
  return isEditing ? PRODUCT_TYPE_OPTIONS_EDIT : PRODUCT_TYPE_OPTIONS
}

// Helper function to get product type filter options (for frontend filtering)
export const getProductTypeFilterOptions = () => {
  return PRODUCT_TYPE_OPTIONS
}

export const productTypes = [
  { value: 'FILE', label: 'File' },
  { value: 'SERVICE', label: 'Service' },
  { value: 'TELEGRAM_CHANNEL_GROUPS', label: 'Telegram Auto Delivery Channels and Groups' },
  { value: 'SERIAL', label: 'Credentials' },
  { value: 'TELEGRAM_ACCOUNTS', label: 'Telegram Accounts Auto Delivery' },
  { value: 'PREMIUM_1M', label: 'Premium Telegram 1 Month' },
  { value: 'PREMIUM_3M', label: 'Premium Telegram 3 Months' },
  { value: 'PREMIUM_6M', label: 'Premium Telegram 6 Months' },
  { value: 'PREMIUM_12M', label: 'Premium Telegram 12 Months' }
]
