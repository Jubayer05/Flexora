import { ChartAreaInteractive } from '@/components/admin/dashboard/chart-area-interactive'
import { DashboardCardsClient } from '@/components/admin/dashboard/DashboardCardsClient'
import { SectionCards } from '@/components/admin/dashboard/section-cards'

export default function Page() {
  return (
    <div className='flex flex-col flex-1'>
      <div className='@container/main flex flex-col flex-1 gap-2'>
        <div className='flex flex-col gap-4 md:gap-6 py-4 md:py-6'>
          <div className='rounded-xl border border-border bg-card p-4 md:p-5'>
            <h1 className='text-xl font-semibold text-foreground md:text-2xl'>
              Welcome back
            </h1>
            <p className='mt-1 text-sm text-muted-foreground md:text-base'>
              Review new orders, check delivery status, watch low stock, and handle customer
              requests from one place.
            </p>
          </div>
          <SectionCards />
          <ChartAreaInteractive />
          <DashboardCardsClient />
        </div>
      </div>
    </div>
  )
}
