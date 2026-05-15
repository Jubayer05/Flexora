'use client'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LABEL_OVERRIDES: Record<string, string> = {
  user: 'Dashboard',
  profile: 'Profile',
  'update-profile': 'Edit Profile',
  orders: 'Orders',
  'purchased-items': 'Purchased Items',
  tracking: 'Order Tracking',
  withdrawals: 'Withdrawals',
  affiliate: 'Affiliate',
  tickets: 'Support Tickets',
  'reset-password': 'Reset Password',
  subscription: 'Subscription'
}

export function UserBreadcrumbs() {
  const pathname = usePathname()

  const segments = pathname.split('/').filter(Boolean)

  if (!segments.length || segments[0] !== 'user') return null

  const childSegments = segments.slice(1)

  const items = childSegments.map((segment, index) => {
    const href = '/user/' + childSegments.slice(0, index + 1).join('/')
    const label =
      LABEL_OVERRIDES[segment] ||
      segment
        .replace(/-/g, ' ')
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')

    return { href, label, isLast: index === segments.length - 1 }
  })

  return (
    <Breadcrumb className='mb-gutter text-xs sm:text-sm'>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href='/user' className='text-on-surface-variant hover:text-on-surface'>Dashboard</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {items.map((item) => (
          <span key={item.href} className='inline-flex items-center'>
            <BreadcrumbSeparator className='text-on-surface-variant' />
            <BreadcrumbItem>
              {item.isLast ? (
                <BreadcrumbPage className='text-on-surface'>{item.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={item.href} className='text-on-surface-variant hover:text-on-surface'>{item.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </span>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}