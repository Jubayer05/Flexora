'use client'

import CustomLink from '@/components/common/CustomLink'
import { Typography } from '@/components/common/typography'
import useAsync from '@/hooks/useAsync'
import Image from 'next/image'

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
    products: {
      total: number
    }
    customers: {
      total: number
      newToday: number
    }
    blogs: {
      total: number
    }
  }
  message: string
}

export function SectionCards() {
  // Fetch statistics from API
  const { data: response } = useAsync<StatisticsResponse>('/admin/statistics')

  const stats = response?.data

  const cardData = [
    {
      title: 'Orders Pending',
      count: stats?.orders.pending ?? 0,
      icon: '/images/dashboard-icons/time-management.png',
      iconSize: { width: 30, height: 30 },
      url: '/admin/orders?page=1&status=PENDING'
    },
    {
      title: 'Partial Orders',
      count: stats?.orders.partial ?? 0,
      icon: '/images/dashboard-icons/ethics.png',
      iconSize: { width: 28, height: 28 },
      url: '/admin/orders?page=1&status=PARTIAL'
    },
    {
      title: 'Orders Completed',
      count: stats?.orders.completed ?? 0,
      icon: '/images/dashboard-icons/completed-task.png',
      iconSize: { width: 28, height: 28 },
      url: '/admin/orders?page=1&status=COMPLETED'
    },
    {
      title: 'Orders Cancelled',
      count: stats?.orders.cancelled ?? 0,
      icon: '/images/dashboard-icons/time-management.png',
      iconSize: { width: 28, height: 28 },
      url: '/admin/orders?page=1&status=CANCELLED'
    },
    {
      title: 'Total Products',
      count: stats?.products.total ?? 0,
      icon: '/images/dashboard-icons/products.png',
      iconSize: { width: 31, height: 31 },
      url: '/admin/products'
    },
    {
      title: 'Total Customers',
      count: stats?.customers.total ?? 0,
      icon: '/images/dashboard-icons/customer-review.png',
      iconSize: { width: 30, height: 30 },
      url: '/admin/customers/customers-list'
    },
    {
      title: 'Total Blogs',
      count: stats?.blogs.total ?? 0,
      icon: '/images/dashboard-icons/shared-post.png',
      iconSize: { width: 30, height: 30 },
      url: '/admin/blogs'
    },
    {
      title: 'New Customers (Today)',
      count: stats?.customers.newToday ?? 0,
      icon: '/images/dashboard-icons/end.png',
      iconSize: { width: 30, height: 30 },
      url: '/admin/customers/customers-list'
    }
  ]

  return (
    <div className='gap-4 lg:gap-5 grid grid-cols-2 lg:grid-cols-4 text-center'>
      {cardData.map((card, index) => (
        <div
          key={index}
          className='flex flex-col items-center gap-3 bg-card shadow-primary/30 hover:shadow-md p-3 lg:p-5 border hover:border-primary/65 rounded-xl'
        >
          {/* Title */}
          <Typography className='font-manrope' weight={'semibold'}>
            {card.title}
          </Typography>

          {/* Icon Container */}
          <div className='flex justify-center items-center bg-card p-3 border border-primary rounded-full size-14'>
            <Image
              src={card.icon}
              alt={card.title}
              width={30}
              height={30}
              className='object-cover'
            />
          </div>

          {/* Count */}
          <div className='w-full h-[26.39px] font-manrope font-semibold text-[30px] text-center leading-[39px] tracking-[-1%]'>
            {card.count}
          </div>

          {/* View All Link */}
          <CustomLink
            href={card.url}
            className='w-full font-inter font-normal text-primary text-sm'
          >
            View All
          </CustomLink>
        </div>
      ))}
    </div>
  )
}
