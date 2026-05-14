import { fetchOnServer, getMainNav } from '@/action/data'
import SiteLogo from '@/components/common/SiteLogo'
import { filterActiveMenuItems } from '@/lib/utils'
import { PageItem } from '@/lib/validations/schemas/pageSchema'
import { cookies } from 'next/headers'
import DropdownNavItem from './DropdownNavItem'
import HeaderActions from './HeaderActions'

export default async function MainHeader() {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value

  // Handle data fetching with graceful fallbacks for build time
  let mainNav: any = null
  let promotionalIcons: any = undefined

  try {
    mainNav = await getMainNav()
  } catch (error) {
    console.warn('Failed to load main nav:', error)
  }

  try {
    const data = await fetchOnServer('/settings/key/system_promotional_icons', 3600)
    promotionalIcons = data?.data?.value?.icons
  } catch (error) {
    console.warn('Failed to load promotional icons:', error)
  }

  // Filter active menu items
  const activeMenuItems = mainNav?.pages ? filterActiveMenuItems(mainNav.pages) : []

  return (
    <div className='flex flex-row justify-between lg:items-center gap-x-2 sm:gap-x-4 py-3 lg:py-4 font-manrope min-w-0'>
      {/* Logo - shrink on mobile */}
      <div className='min-w-0 shrink flex items-center'>
        <SiteLogo />
      </div>

      {/* Main Navigation */}
      {activeMenuItems?.length > 0 && (
        <nav className='hidden xl:flex flex-wrap items-center gap-x-2 gap-y-2 lg:gap-x-3 ml-6 rounded-full border border-border/60 bg-background/40 px-2 py-1 backdrop-blur-md shadow-sm'>
          {activeMenuItems
            .filter((item) => ['Home', 'About Us', 'Contact', 'FAQ'].includes(item.title))
            .map((item: PageItem, index: number) => (
              <DropdownNavItem
                key={item.id || index}
                item={item}
                className='px-3 py-2 rounded-full hover:bg-accent/70'
              />
            ))}

          {/* More Dropdown */}
          <DropdownNavItem
            item={{
              id: 'more',
              title: 'More',
              slug: 'more',
              isActive: false,
              showInMenu: true,
              menuOrder: 999,
              depth: 0,
              hasContent: false,
              target: '_self',
              children: activeMenuItems.filter(
                (item) => !['Home', 'About Us', 'Contact', 'FAQ'].includes(item.title)
              )
            }}
            className='px-3 py-2 rounded-full hover:bg-accent/70'
          />
        </nav>
      )}

      <div className='shrink-0 min-w-0'>
        <HeaderActions
          token={token}
          promotionalIcons={promotionalIcons}
          activeMenuItems={activeMenuItems}
        />
      </div>
    </div>
  )
}
