'use client'

import CustomImage from '@/components/common/CustomImage'
import MotionLoader from '@/components/common/MotionLoader'
import { Typography } from '@/components/common/typography'
import useAsync from '@/hooks/useAsync'
import parse from 'html-react-parser'
import { CalendarIcon, FolderOpenIcon, TagIcon, UserIcon } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

export default function BlogDetails() {
  const params = useParams()
  const slug = params?.blogSlug as string
  const { data, loading } = useAsync(() => (slug ? `/blogs/slug/${slug}` : null))

  const blogData: Blog = data?.data || {}

  // Author: prefer meta.authorName (manual), otherwise use included author from API
  const authorName =
    (typeof blogData?.meta === 'object' && blogData?.meta && 'authorName' in blogData.meta
      ? (blogData.meta as { authorName?: string }).authorName
      : null) || blogData?.author?.name

  if (loading) {
    return (
      <div className='flex justify-center items-center min-h-screen bg-background'>
        <MotionLoader size='lg' variant='dots' />
      </div>
    )
  }

  return (
    <div className='flex flex-col items-start gap-8 w-full text-foreground font-manrope'>
      <div className='relative w-full h-auto min-h-96'>
        <CustomImage
          src={blogData?.thumbnail}
          alt={blogData?.title}
          fill
          className='rounded-xl object-cover'
          sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
        />
      </div>

      <Typography variant='h2' weight='semibold'>
        {blogData?.title}
      </Typography>

      {/* Meta row: author, date, category, tags */}
      <div className='flex flex-wrap items-center gap-x-6 gap-y-2 text-muted-foreground text-sm'>
        {authorName && (
          <div className='flex items-center gap-2'>
            <UserIcon strokeWidth={1.5} size={18} className='text-muted-foreground shrink-0' />
            <span>{authorName}</span>
          </div>
        )}

        <div className='flex items-center gap-2'>
          <CalendarIcon strokeWidth={1.5} size={18} className='text-muted-foreground shrink-0' />
          <span>
            {blogData?.createdAt &&
              new Date(blogData.createdAt || Date.now()).toDateString()}
          </span>
        </div>

        {blogData?.category && (
          <Link
            href={`/blogs?categoryId=${blogData.category.id}`}
            className='flex items-center gap-2 text-primary hover:underline'
          >
            <FolderOpenIcon strokeWidth={1.5} size={18} className='shrink-0' />
            <span>{blogData.category.name}</span>
          </Link>
        )}
      </div>

      {/* Tags */}
      {blogData?.tags && blogData.tags.length > 0 && (
        <div className='flex flex-wrap items-center gap-2'>
          <TagIcon strokeWidth={1.5} size={18} className='text-muted-foreground shrink-0' />
          {blogData.tags.map((tag: string, idx: number) => (
            <Link
              key={idx}
              href={`/blogs?tags=${encodeURIComponent(tag)}`}
              className='inline-flex items-center px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium hover:bg-primary/10 hover:text-primary transition-colors'
            >
              {tag}
            </Link>
          ))}
        </div>
      )}

      <div className='space-y-2 mt-6 rich-text text-foreground'>
        {parse(blogData?.content ?? 'No data!')}
      </div>
    </div>
  )
}
