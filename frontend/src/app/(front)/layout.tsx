import { MaintenanceWrapper } from '@/components/frontend/MaintenanceWrapper'
import { GlobalRouteTracker } from '@/components/frontend/GlobalRouteTracker'
import PremiumFooter from '@/components/frontend/homepage/PremiumFooter'
import Header from '@/components/frontend/layout/header'
import Provider from '@/components/frontend/layout/Provider'

// Use dynamic rendering but allow back/forward cache
// Set to 'error' if you need truly dynamic content, otherwise 'auto' allows caching
export const dynamic = 'auto'
// Disable caching for user data
export const fetchCache = 'force-no-store'

export default function FrontLayout({
  children,
  modal
}: Readonly<{
  children: React.ReactNode
  modal: React.ReactNode
}>) {
  return (
    <MaintenanceWrapper>
      <div className='flex min-h-screen flex-col bg-background'>
        <GlobalRouteTracker />
        <Header />
        <main className='min-w-0 flex-1 overflow-x-hidden bg-background'>
          <Provider>{children}</Provider>
        </main>
        <PremiumFooter />
        {modal}
      </div>
    </MaintenanceWrapper>
  )
}
