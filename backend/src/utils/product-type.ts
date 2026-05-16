// Telegram product helpers removed - platform now for real products only
export const TELEGRAM_TRANSFER_PRODUCT_TYPES = new Set()
export const TELEGRAM_ACCOUNT_PRODUCT_TYPES = new Set()
export const isTelegramTransferProduct = (_product?: unknown) => false