export const PREMIUM_PRODUCT_TYPES = new Set(['PREMIUM_1M', 'PREMIUM_3M', 'PREMIUM_6M', 'PREMIUM_12M'])

export const TELEGRAM_TRANSFER_PRODUCT_TYPES = new Set([
  'TELEGRAM_CHANNEL_GROUPS',
  'TELEGRAM_TRANSFER',
  'TELEGRAM_GROUP',
  'TELEGRAM_CHANNEL'
])

export const isPremiumProductType = (type?: string | null) => PREMIUM_PRODUCT_TYPES.has(String(type || ''))

export const isFileProductType = (type?: string | null) => String(type || '') === 'FILE'

export const isTelegramAccountDelivery = (platform?: string | null, type?: string | null) =>
  platform === 'TELEGRAM' && (type === 'ACCOUNT' || type === 'TELEGRAM_ACCOUNTS')

export const isTelegramTransferDelivery = (product?: {
  type?: string | null
  telegramUrl?: string | null
  platform?: string | null
} | null) => {
  const type = String(product?.type || '')
  return TELEGRAM_TRANSFER_PRODUCT_TYPES.has(type) || type.includes('CHANNEL') || type.includes('GROUP')
}

export const getDeliveryKind = (product?: {
  type?: string | null
  platform?: string | null
  telegramUrl?: string | null
} | null) => {
  if (isFileProductType(product?.type)) return 'file'
  if (isPremiumProductType(product?.type)) return 'premium'
  if (isTelegramTransferDelivery(product)) return 'telegram-transfer'
  if (isTelegramAccountDelivery(product?.platform, product?.type)) return 'telegram-account'
  return 'credentials'
}
