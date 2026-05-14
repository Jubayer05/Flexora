'use client'

import { usePermissions } from '@/components/providers/PermissionProvider'
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger
} from '@/components/ui/accordion'
import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarSeparator,
    useSidebar
} from '@/components/ui/sidebar'
import { CircleDashed, LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

type NavItemLink = {
  type?: 'link'
  title: string
  href: string
  icon: LucideIcon
  children?: Omit<NavItemLink, 'icon' | 'children' | 'type'>[]
  permission?: { resource: string; action?: string }
}

type NavItemDivider = { type: 'divider'; title?: string }
type NavItemLabel = { type: 'label'; title: string }

type NavItem = NavItemLink | NavItemDivider | NavItemLabel

const isLinkItem = (item: NavItem): item is NavItemLink =>
  (item as any).type !== 'divider' && (item as any).type !== 'label'

const isSeparator = (item: NavItem): item is NavItemDivider => (item as any).type === 'divider'

export function NavMain({ items }: { items: NavItem[] }) {
  const pathname = usePathname()
  const { setOpenMobile: setOpen } = useSidebar()
  const { hasPermission, loading } = usePermissions()

  // Filter menu items based on permissions (links only), keep separators/labels, then sanitize separators
  const filteredItems: NavItem[] = loading
    ? []
    : items
        .map<NavItem | null>((item) => {
          if (!isLinkItem(item)) return item

          const hasParentAccess = item.permission
            ? hasPermission(item.permission.resource, item.permission.action)
            : true

          const filteredChildren = item.children?.filter((child) => {
            return child.permission
              ? hasPermission(child.permission.resource, child.permission.action)
              : true
          })

          // If no parent access and no accessible children, drop the item
          if (!hasParentAccess && (!filteredChildren || filteredChildren.length === 0)) {
            return null
          }

          return { ...item, children: filteredChildren } as NavItemLink
        })
        .filter((i): i is NavItem => i !== null)

  // Sanitize separators: remove leading/trailing and collapse consecutive
  const sanitizedItems: NavItem[] = []
  for (const it of filteredItems) {
    if (isSeparator(it)) {
      // skip leading or consecutive separators
      const prev = sanitizedItems[sanitizedItems.length - 1]
      if (!prev || isSeparator(prev)) continue
      sanitizedItems.push(it)
    } else {
      sanitizedItems.push(it)
    }
  }
  if (sanitizedItems.length && isSeparator(sanitizedItems[sanitizedItems.length - 1])) {
    sanitizedItems.pop()
  }

  // Group items by label to mirror shadcn/ui Sidebar groups
  type NavGroup = { label?: string; items: NavItem[] }
  const groups: NavGroup[] = []
  let current: NavGroup = { items: [] }
  for (const it of sanitizedItems) {
    if ((it as any).type === 'label') {
      if (current.items.length) groups.push(current)
      current = { label: (it as NavItemLabel).title, items: [] }
    } else {
      current.items.push(it)
    }
  }
  if (current.items.length || current.label) groups.push(current)

  // Helper: compute open values for a group's accordion
  const computeGroupOpenValues = (items: NavItem[], groupIndex: number) => {
    const openValues: string[] = []
    items.forEach((item, index) => {
      if (isLinkItem(item) && item.children && item.children.length > 0) {
        const hasActiveChild = item.children.some((child) => pathname === child.href)
        if (hasActiveChild) openValues.push(`g${groupIndex}-i${index}`)
      }
    })
    return openValues
  }

  // Check if a child item is active
  const isChildActive = (childHref: string) => pathname === childHref

  // Check if parent has any active children
  const hasActiveChild = (item: NavItem) => {
    return (
      isLinkItem(item) && item.children && item.children.some((child) => pathname === child.href)
    )
  }

  if (loading) {
    return (
      <div className='space-y-2'>
        {[...Array(8)].map((_, i) => (
          <div key={i} className='animate-pulse'>
            <div className='h-10 w-full rounded-lg bg-sidebar-accent' />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className='space-y-2'>
      {groups
        .filter((g) => g.items.some((it) => isLinkItem(it)))
        .map((group, gIdx) => {
          const groupOpenValues = computeGroupOpenValues(group.items, gIdx)
          return (
            <SidebarGroup key={`group-${gIdx}`}>
              {group.label ? <SidebarGroupLabel>{group.label}</SidebarGroupLabel> : null}
              <SidebarGroupContent>
                <Accordion type='multiple' className='w-full' defaultValue={groupOpenValues}>
                  {group.items.map((item, index) => {
                    if (!isLinkItem(item)) {
                      if (isSeparator(item)) {
                        return <SidebarSeparator key={`g${gIdx}-sep-${index}`} className='my-2' />
                      }
                      // Labels start new groups, should not appear here after grouping
                      return null
                    }

                    const hasChildren = item.children && item.children.length > 0

                    if (hasChildren) {
                      const parentHasActiveChild = hasActiveChild(item)
                      return (
                        <AccordionItem
                          key={`g${gIdx}-acc-${item.title}`}
                          value={`g${gIdx}-i${index}`}
                          className='border-none'
                        >
                          <div
                            className={`rounded-lg p-1 transition-colors ${
                              parentHasActiveChild ? 'bg-sidebar-accent' : 'hover:bg-sidebar-accent'
                            }`}
                          >
                            <AccordionTrigger className='flex items-center p-0 w-full hover:no-underline [&[data-state=open]>div>svg:last-child]:rotate-180'>
                              <div className='flex justify-between items-center gap-3 px-2 py-1.5 w-full'>
                                <div className='flex items-center gap-3'>
                                  {item.icon && (
                                    <item.icon className='size-[18px] text-muted-foreground' />
                                  )}
                                  <span
                                    className={`text-sm ${
                                      parentHasActiveChild
                                        ? 'font-medium text-primary'
                                        : 'text-muted-foreground'
                                    }`}
                                  >
                                    {item.title}
                                  </span>
                                </div>
                              </div>
                            </AccordionTrigger>
                          </div>
                          <AccordionContent className='pb-0'>
                            <div className='mt-1 space-y-1'>
                              {item?.children?.map((subItem) => {
                                const isActive = isChildActive(subItem.href)
                                return (
                                  <Link
                                    onClick={() => setOpen(false)}
                                    key={subItem.title}
                                    href={subItem.href}
                                    className={`flex items-center gap-2 rounded-lg px-2 py-1.5 pl-9 text-sm font-normal tracking-[0.5%] transition-colors ${
                                      isActive
                                        ? 'font-semibold text-primary'
                                        : 'text-muted-foreground hover:bg-sidebar-accent hover:text-card-foreground'
                                    }`}
                                  >
                                    <CircleDashed className='size-2' strokeWidth={3} />{' '}
                                    {subItem.title}
                                  </Link>
                                )
                              })}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      )
                    }

                    return (
                      <div
                        key={`g${gIdx}-link-${index}`}
                        className={`rounded-lg transition-colors ${
                          pathname === item.href ? 'bg-sidebar-accent' : 'hover:bg-sidebar-accent'
                        }`}
                      >
                        <Link
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className='flex w-full items-center gap-3 p-2.5'
                        >
                          {item.icon && <item.icon className='size-[18px] text-muted-foreground' />}
                          <span
                            className={`text-sm font-normal tracking-[0.5%] ${
                              pathname === item.href
                                ? 'font-medium text-primary'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {item.title}
                          </span>
                        </Link>
                      </div>
                    )
                  })}
                </Accordion>
              </SidebarGroupContent>
            </SidebarGroup>
          )
        })}
    </div>
  )
}
