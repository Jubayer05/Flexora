'use client'

import CustomLink from '@/components/common/CustomLink'
import { Card } from '@/components/ui/card'
import useAsync from '@/hooks/useAsync'
import { cn } from '@/lib/utils'
import {
  ArrowUpRight,
  Ban,
  CheckCircle2,
  Clock,
  FileText,
  Package,
  Split,
  UserPlus,
  Users
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type StatisticsResponse = {
  success: boolean
  data: {
    orders: {
      pending: number
      completed: number
      partial: number
      cancelled: number
      total: number
    }
    products: { total: number }
    customers: { total: number; newToday: number }
    blogs: { total: number }
  }
  message: string
}

type StatCard = {
  title: string
  count: number
  url: string
  icon: LucideIcon
  accent: string
}

export function SectionCards() {
  const { data: response } = useAsync<StatisticsResponse>('/admin/statistics')
  const stats = response?.data

  const cardData: StatCard[] = [
    {
      title: 'Pending Orders',
      count: stats?.orders.pending ?? 0,
      url: '/admin/orders?page=1&status=PENDING',
      icon: Clock,
      accent: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20'
    },
    {
      title: 'Partial Orders',
      count: stats?.orders.partial ?? 0,
      url: '/admin/orders?page=1&status=PARTIAL',
      icon: Split,
      accent: 'text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20'
    },
    {
      title: 'Completed Orders',
      count: stats?.orders.completed ?? 0,
      url: '/admin/orders?page=1&status=COMPLETED',
      icon: CheckCircle2,
      accent: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    },
    {
      title: 'Cancelled Orders',
      count: stats?.orders.cancelled ?? 0,
      url: '/admin/orders?page=1&status=CANCELLED',
      icon: Ban,
      accent: 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20'
    },
    {
      title: 'Total Products',
      count: stats?.products.total ?? 0,
      url: '/admin/products',
      icon: Package,
      accent: 'text-primary bg-primary/10 border-primary/20'
    },
    {
      title: 'Total Customers',
      count: stats?.customers.total ?? 0,
      url: '/admin/customers/customers-list',
      icon: Users,
      accent: 'text-violet-600 dark:text-violet-400 bg-violet-500/10 border-violet-500/20'
    },
    {
      title: 'Total Blogs',
      count: stats?.blogs.total ?? 0,
      url: '/admin/blogs',
      icon: FileText,
      accent: 'text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/20'
    },
    {
      title: 'New Customers Today',
      count: stats?.customers.newToday ?? 0,
      url: '/admin/customers/customers-list',
      icon: UserPlus,
      accent: 'text-teal-600 dark:text-teal-400 bg-teal-500/10 border-teal-500/20'
    }
  ]

  return (
    <section className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'>
      {cardData.map((card) => {
        const Icon = card.icon
        return (
          <Card
            key={card.title}
            className='gap-0 overflow-hidden border-border/80 py-0 shadow-sm transition-shadow hover:shadow-md'
          >
            <div className='flex flex-col gap-4 p-5'>
              <div className='flex items-start justify-between gap-3'>
                <p className='text-sm font-medium leading-snug text-muted-foreground'>{card.title}</p>
                <div
                  className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-lg border',
                    card.accent
                  )}
                >
                  <Icon className='size-[18px]' strokeWidth={2} />
                </div>
              </div>
              <p className='text-3xl font-semibold tabular-nums tracking-tight text-foreground'>
                {card.count.toLocaleString()}
              </p>
            </div>
            <div className='border-t border-border/80 bg-muted/30 px-5 py-3'>
              <CustomLink
                href={card.url}
                className='inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-primary'
              >
                View details
                <ArrowUpRight className='size-3.5' />
              </CustomLink>
            </div>
          </Card>
        )
      })}
    </section>
  )
}
