/**
 * Product Type Constants and Options
 */

export const PRODUCT_TYPE_VALUES = {
  FILE: 'FILE',
  SERIAL: 'SERIAL',
  ACCOUNT: 'ACCOUNT',
  SERVICE: 'SERVICE',
  TELEGRAM_ACCOUNTS: 'TELEGRAM_ACCOUNTS',
  TELEGRAM_CHANNEL_GROUPS: 'TELEGRAM_CHANNEL_GROUPS',
  PREMIUM_1M: 'PREMIUM_1M',
  PREMIUM_3M: 'PREMIUM_3M',
  PREMIUM_6M: 'PREMIUM_6M',
  PREMIUM_12M: 'PREMIUM_12M'
} as const

export const PRODUCT_PLATFORM_VALUES = {
  OTHER: 'OTHER',
  TELEGRAM: 'TELEGRAM'
} as const

export const PRODUCT_PLATFORM_LABELS = {
  [PRODUCT_PLATFORM_VALUES.OTHER]: 'Other Platform',
  [PRODUCT_PLATFORM_VALUES.TELEGRAM]: 'Telegram'
} as const

export const PRODUCT_TYPE_LABELS: Record<string, string> = {
  [PRODUCT_TYPE_VALUES.FILE]: 'File',
  [PRODUCT_TYPE_VALUES.SERIAL]: 'Serial',
  [PRODUCT_TYPE_VALUES.ACCOUNT]: 'Account',
  [PRODUCT_TYPE_VALUES.SERVICE]: 'Service',
  [PRODUCT_TYPE_VALUES.TELEGRAM_ACCOUNTS]: 'Accounts',
  [PRODUCT_TYPE_VALUES.TELEGRAM_CHANNEL_GROUPS]: 'Channel / Group',
  [PRODUCT_TYPE_VALUES.PREMIUM_1M]: 'Premium 1 Month',
  [PRODUCT_TYPE_VALUES.PREMIUM_3M]: 'Premium 3 Months',
  [PRODUCT_TYPE_VALUES.PREMIUM_6M]: 'Premium 6 Months',
  [PRODUCT_TYPE_VALUES.PREMIUM_12M]: 'Premium 12 Months'
}

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

export const PRODUCT_TYPE_OPTIONS = Object.entries(PRODUCT_TYPE_LABELS).map(([value, label]) => ({
  value,
  label
}))

export const PRODUCT_TYPE_OPTIONS_EDIT = PRODUCT_TYPE_OPTIONS

export type ProductTypeValue = (typeof PRODUCT_TYPE_VALUES)[keyof typeof PRODUCT_TYPE_VALUES]

export const getProductTypeLabel = (type: ProductTypeValue | string): string =>
  PRODUCT_TYPE_LABELS[String(type)] || String(type)

export const getProductTypeOptions = (isEditing?: boolean) =>
  isEditing ? PRODUCT_TYPE_OPTIONS_EDIT : PRODUCT_TYPE_OPTIONS

export const getProductTypeFilterOptions = () => PRODUCT_TYPE_OPTIONS

export const productTypes = PRODUCT_TYPE_OPTIONS
