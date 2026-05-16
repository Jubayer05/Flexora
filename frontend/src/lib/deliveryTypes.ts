export const PREMIUM_PRODUCT_TYPES = new Set(['PREMIUM_1M', 'PREMIUM_3M', 'PREMIUM_6M', 'PREMIUM_12M'])

export const isPremiumProductType = (type?: string | null) => PREMIUM_PRODUCT_TYPES.has(String(type || ''))

export const isFileProductType = (type?: string | null) => String(type || '') === 'FILE'

export const isTelegramAccountDelivery = (_platform?: string | null, _type?: string | null) => false

export const isTelegramTransferDelivery = (_product?: {
  type?: string | null
  telegramUrl?: string | null
  platform?: string | null
} | null) => false

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
