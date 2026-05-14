'use client'

import { BlogCard } from '@/components/card/blog-card'
import { BlogCardSkeleton } from '@/components/card/blog-card/skeleton'
import { Section } from '@/components/common/section'
import { Typography } from '@/components/common/typography'
import BlogListingJsonLdClient from '@/components/frontend/blog/BlogListingJsonLdClient'
import useAsync from '@/hooks/useAsync'
import { useFilter } from '@/hooks/useFilter'

export default function BlogPage() {
  const { search, page, limit, filters } = useFilter(10)
  const { data, loading } = useAsync(
    () =>
      '/blogs' +
      (page ? `?page=${page}` : '') +
      (limit ? `&limit=${limit}` : '') +
      (search ? `&search=${search}` : '') +
      (filters.categoryId ? `&categoryId=${filters.categoryId}` : '')
  )

  const blogs = data?.data?.blogs || []

  return (
    <div className='font-manrope'>
      {/* JSON-LD Structured Data for Blog Listing */}
      <BlogListingJsonLdClient blogs={blogs} />

      {/* Main Blogs */}
      <Section variant='xl' className='Section'>
        <header className='space-y-2 mb-4'>
          <Typography variant='h2' as='h1' weight='bold'>
            Blog
          </Typography>
          <p className='text-muted-foreground'>Insights, updates, and guides from our team.</p>
        </header>
        <div className='space-y-6'>
          {/* Blog Grid */}
          <div className='gap-3 xl:gap-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3'>
            {loading ? (
              // Loading skeletons
              Array.from({ length: 6 }).map((_, index) => (
                <BlogCardSkeleton key={index} variant='default' />
              ))
            ) : data?.data?.blogs?.length > 0 ? (
              data?.data?.blogs.map((data: Blog, idx: number) => <BlogCard key={idx} post={data} />)
            ) : (
              <p className='text-muted-foreground py-8 text-center'>No blogs found</p>
            )}
          </div>
        </div>
      </Section>
    </div>
  )
}
