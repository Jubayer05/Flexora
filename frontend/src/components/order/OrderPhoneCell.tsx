'use client'

interface OrderPhoneCellProps {
  orderId?: number
  isTelegramAccount?: boolean
  isDelivered?: boolean
}

export function OrderPhoneCell(_props: OrderPhoneCellProps) {
  return <span className='text-card-foreground/60 text-sm'>—</span>
}
