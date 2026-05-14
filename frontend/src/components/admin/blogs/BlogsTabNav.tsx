'use client'

import { cn } from '@/lib/utils'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const BLOG_TABS = [
  { label: 'All Blogs', href: '/admin/blogs' },
  { label: 'Add Blog Manually', href: '/admin/blogs/create' },
  { label: 'Auto Blog Upload', href: '/admin/blogs/auto-upload' },
  { label: 'Category Management', href: '/admin/blogs/categories' },
  { label: 'Author Pool', href: '/admin/blogs/author-pool' },
  { label: 'Image Auto Editor', href: '/admin/blogs/image-editor' }
] as const

export function BlogsTabNav() {
  const pathname = usePathname()

  return (
    <nav
      className='mb-6 flex flex-wrap items-center gap-2 border-b border-border pb-4'
      aria-label='Blog management tabs'
    >
      {BLOG_TABS.map((tab) => {
        const isActive =
          tab.href === '/admin/blogs'
            ? pathname === '/admin/blogs'
            : pathname === tab.href || pathname.startsWith(tab.href + '/')

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              'border-input text-foreground',
              'bg-muted/30 hover:bg-muted/50 dark:bg-muted/20 dark:hover:bg-muted/40',
              isActive &&
                'border-primary bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90 dark:border-primary'
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
