'use client'

import AutoBlogsList from '@/components/admin/blogs/AutoBlogsList'
import AutoBlogUpload from '@/components/admin/blogs/AutoBlogUpload'
import { BlogSectionWelcome } from '@/components/admin/blogs/BlogSectionWelcome'
import { useState, Suspense } from 'react'

function AutoBlogUploadContent() {
  const [listRefreshTrigger, setListRefreshTrigger] = useState(0)

  return (
    <div className='space-y-8'>
      <BlogSectionWelcome
        title='Auto Blog Upload'
        description='Create multiple blog posts at once. Choose category and sub-category, add posts with title, content, tags, and images. Schedule publish times and use author rotation or a fixed author.'
      />
      <AutoBlogUpload onSuccess={() => setListRefreshTrigger((t) => t + 1)} />
      <div className='rounded-xl border border-border bg-card p-6'>
        <AutoBlogsList refreshTrigger={listRefreshTrigger} />
      </div>
    </div>
  )
}

export default function AutoBlogUploadPage() {
  return (
    <Suspense fallback={<div className='text-muted-foreground'>Loading...</div>}>
      <AutoBlogUploadContent />
    </Suspense>
  )
}
