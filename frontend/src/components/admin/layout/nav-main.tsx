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
import { usePathname, useSearchParams } from 'next/navigation'

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
  const searchParams = useSearchParams()
  const { setOpenMobile: setOpen } = useSidebar()
  const { hasPermission, loading } = usePermissions()

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

          if (!hasParentAccess && (!filteredChildren || filteredChildren.length === 0)) {
            return null
          }

          return { ...item, children: filteredChildren } as NavItemLink
        })
        .filter((i): i is NavItem => i !== null)

  const sanitizedItems: NavItem[] = []
  for (const it of filteredItems) {
    if (isSeparator(it)) {
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

  const computeGroupOpenValues = (items: NavItem[], groupIndex: number) => {
    const openValues: string[] = []
    items.forEach((item, index) => {
      if (isLinkItem(item) && item.children && item.children.length > 0) {
        const hasActive = item.children.some((child) => isChildActive(child.href))
        if (hasActive) openValues.push(`g${groupIndex}-i${index}`)
      }
    })
    return openValues
  }

  const isChildActive = (childHref: string) => {
    const [childPathname, childQuery] = childHref.split('?')
    if (pathname !== childPathname) return false

    if (!childQuery && searchParams.toString()) {
      const nonPageParams = new URLSearchParams(searchParams.toString())
      nonPageParams.delete('page')
      if (nonPageParams.toString()) return false
    }

    if (!childQuery) return true
    const childParams = new URLSearchParams(childQuery)
    const currentParams = new URLSearchParams(searchParams.toString())
    for (const [key, value] of childParams) {
      if (currentParams.get(key) !== value) return false
    }
    return true
  }

  const hasActiveChild = (item: NavItem) => {
    return (
      isLinkItem(item) &&
      item.children &&
      item.children.some((child) => isChildActive(child.href))
    )
  }

  if (loading) {
    return (
      <div className='space-y-2 px-2'>
        <div className='h-3 w-12 rounded bg-surface-container-highest animate-pulse mb-3' />
        {[...Array(6)].map((_, i) => (
          <div key={i} className='h-10 w-full rounded-lg bg-surface-container-highest animate-pulse' />
        ))}
      </div>
    )
  }

  return (
    <div className='space-y-1'>
      {groups
        .filter((g) => g.items.some((it) => isLinkItem(it)))
        .map((group, gIdx) => {
          const groupOpenValues = computeGroupOpenValues(group.items, gIdx)
          return (
            <SidebarGroup key={`group-${gIdx}`} className='py-0'>
              {group.label ? <SidebarGroupLabel className='text-on-surface-variant font-body-sm text-body-xs uppercase tracking-widest px-2 mb-1'>{group.label}</SidebarGroupLabel> : null}
              <SidebarGroupContent>
                <Accordion type='multiple' className='w-full' defaultValue={groupOpenValues}>
                  {group.items.map((item, index) => {
                    if (!isLinkItem(item)) {
                      if (isSeparator(item)) {
                        return <SidebarSeparator key={`g${gIdx}-sep-${index}`} className='my-3 border-outline-variant' />
                      }
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
                            className={`rounded-lg px-2 py-2 transition-all duration-200 cursor-pointer ${
                              parentHasActiveChild ? 'bg-primary-container text-primary font-semibold' : 'hover:bg-surface-container'
                            }`}
                          >
                            <AccordionTrigger className='flex items-center p-0 w-full hover:no-underline [&[data-state=open]>div>svg:last-child]:rotate-180'>
                              <div className='flex justify-between items-center gap-3 w-full'>
                                <div className='flex items-center gap-3'>
                                  {item.icon && (
                                    <item.icon className='size-[18px]' />
                                  )}
                                  <span
                                    className={`text-sm font-medium ${
                                      parentHasActiveChild
                                        ? 'text-primary'
                                        : 'text-on-surface-variant'
                                    }`}
                                  >
                                    {item.title}
                                  </span>
                                </div>
                              </div>
                            </AccordionTrigger>
                          </div>
                          <AccordionContent className='pb-0'>
                            <div className='mt-1.5 ml-3 pl-3 border-l border-outline-variant space-y-0.5'>
                              {item?.children?.map((subItem) => {
                                const isActive = isChildActive(subItem.href)
                                return (
                                  <Link
                                    onClick={() => setOpen(false)}
                                    key={subItem.title}
                                    href={subItem.href}
                                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium tracking-[0.5%] transition-colors cursor-pointer ${
                                      isActive
                                        ? 'bg-primary-container text-primary font-semibold'
                                        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                                    }`}
                                  >
                                    <CircleDashed className='size-2' strokeWidth={3} />
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
                        className={`rounded-lg px-2 py-2 transition-all duration-200 cursor-pointer ${
                          pathname === item.href || (!hasChildren && pathname.startsWith(item.href)) ? 'bg-primary-container text-primary font-semibold' : 'hover:bg-surface-container'
                        }`}
                      >
                        <Link
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className='flex w-full items-center gap-3 px-0 py-0'
                        >
                          {item.icon && <item.icon className='size-[18px]' />}
                          <span
                            className={`text-sm font-medium ${
                              pathname === item.href || (!hasChildren && pathname.startsWith(item.href))
                                ? 'text-primary'
                                : 'text-on-surface-variant'
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