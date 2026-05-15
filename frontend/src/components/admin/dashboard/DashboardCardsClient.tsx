'use client'

import dynamic from 'next/dynamic'

const LowStockProducts = dynamic(
  () =>
    import('@/components/admin/dashboard/low-stock-products').then((m) => ({
      default: m.LowStockProducts
    })),
  { ssr: false }
)

const UnreadTicket = dynamic(
  () =>
    import('@/components/admin/dashboard/unread-tickets').then((m) => ({
      default: m.UnreadTicket
    })),
  { ssr: false }
)

export function DashboardCardsClient() {
  return (
    <section className='grid grid-cols-1 items-stretch gap-6 xl:grid-cols-2'>
      <LowStockProducts />
      <UnreadTicket />
    </section>
  )
}
