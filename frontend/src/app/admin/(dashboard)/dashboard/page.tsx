import { ChartAreaInteractive } from '@/components/admin/dashboard/chart-area-interactive'
import { DashboardCardsClient } from '@/components/admin/dashboard/DashboardCardsClient'
import { SectionCards } from '@/components/admin/dashboard/section-cards'
import PageHeader from '@/components/common/PageHeader'

export default function Page() {
  return (
    <div className='flex flex-1 flex-col gap-6 sm:gap-8'>
      <PageHeader
        title='Dashboard'
        subTitle='Overview of orders, inventory, visitors, and support tickets.'
      />
      <SectionCards />
      <ChartAreaInteractive />
      <DashboardCardsClient />
    </div>
  )
}
