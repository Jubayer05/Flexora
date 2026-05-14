export const TELEGRAM_TRANSFER_PRODUCT_TYPES = new Set([
  'SERVICE',
  'TELEGRAM_CHANNEL_GROUPS'
])

export function isTelegramTransferProduct(product?: {
  platform?: string | null
  type?: string | null
} | null) {
  return (
    product?.platform === 'TELEGRAM' &&
    TELEGRAM_TRANSFER_PRODUCT_TYPES.has(String(product?.type ?? ''))
  )
}

