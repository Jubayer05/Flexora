export const TELEGRAM_TRANSFER_PRODUCT_TYPES = new Set([
  'SERVICE',
  'TELEGRAM_CHANNEL_GROUPS'
])

export const TELEGRAM_ACCOUNT_PRODUCT_TYPES = new Set(['TELEGRAM_ACCOUNTS', 'ACCOUNT'])

export const isTelegramTransferProduct = (product?: {
  platform?: string | null
  type?: string | null
} | null) =>
  product?.platform === 'TELEGRAM' &&
  TELEGRAM_TRANSFER_PRODUCT_TYPES.has(String(product?.type ?? ''))

