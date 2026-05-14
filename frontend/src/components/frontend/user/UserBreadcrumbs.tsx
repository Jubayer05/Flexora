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

  // Only show breadcrumbs for /user routes
  if (!segments.length || segments[0] !== 'user') return null

  // Skip the leading 'user' segment so we don't render "Dashboard" twice
  const childSegments = segments.slice(1)

  const items = childSegments.map((segment, index) => {
    // href is always /user/... built from the child segments
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
    <Breadcrumb className='mb-3 text-xs sm:text-sm'>
      <BreadcrumbList>
        {/* Home / User root */}
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href='/user'>Dashboard</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {items.map((item) => (
          <span key={item.href} className='inline-flex items-center'>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {item.isLast ? (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={item.href}>{item.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </span>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
