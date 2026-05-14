import { AppSidebar } from '@/components/admin/layout/app-sidebar'
import BreadCrumbs from '@/components/admin/layout/BreadCrumbs'
import DashboardMetadata from '@/components/admin/layout/DashboardMetadata'
import SiteLogoWrapper from '@/components/common/SiteLogoWrapper'
import { PermissionProvider } from '@/components/providers/PermissionProvider'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'

// Use revalidate instead of force-dynamic for better caching
export const revalidate = 60 // Revalidate every 60 seconds

type TProps = {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: TProps) {
  return (
    <PermissionProvider>
      <DashboardMetadata />
      <div className='font-manrope! bg-background'>
        <div className='flex min-h-screen flex-col'>
          {/* <SiteHeader /> */}
          <div className='relative flex-1'>
            <SidebarProvider
              className='**:data-[slot=sidebar-container]:top-0!'
              style={
                {
                  '--sidebar-width': 'calc(var(--spacing) * 72)'
                } as React.CSSProperties
              }
            >
              <AppSidebar
                variant='sidebar'
                logo={<SiteLogoWrapper className='min-w-0 flex-1' height={32} />}
              />
              <SidebarInset className='relative overflow-x-hidden py-2.5'>
                <div className='sticky top-0 z-10 bg-background'>
                  <BreadCrumbs />
                </div>
                <div className='mt-4 p-3 sm:p-4 lg:p-6 min-w-0'>{children}</div>
              </SidebarInset>
            </SidebarProvider>
          </div>
        </div>
      </div>
    </PermissionProvider>
  )
}
