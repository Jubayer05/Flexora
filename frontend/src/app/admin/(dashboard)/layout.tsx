import { AppSidebar } from '@/components/admin/layout/app-sidebar'
import BreadCrumbs from '@/components/admin/layout/BreadCrumbs'
import DashboardMetadata from '@/components/admin/layout/DashboardMetadata'
import SiteLogoWrapper from '@/components/common/SiteLogoWrapper'
import { PermissionProvider } from '@/components/providers/PermissionProvider'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'

export const revalidate = 60

type TProps = {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: TProps) {
  return (
    <PermissionProvider>
      <DashboardMetadata />
      <div className='bg-background text-on-surface font-body-md min-h-screen'>
        <div className='flex min-h-screen flex-col'>
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
            <SidebarInset className='relative overflow-x-hidden py-0'>
              <div className='sticky top-0 z-10 bg-surface-container-low border-b border-outline-variant/40'>
                <BreadCrumbs />
              </div>
              <div className='mx-auto w-full min-w-0 max-w-[1600px] px-4 py-6 sm:px-6 md:px-8 lg:px-10 xl:px-12 pb-10'>
                {children}
              </div>
            </SidebarInset>
          </SidebarProvider>
        </div>
      </div>
    </PermissionProvider>
  )
}
