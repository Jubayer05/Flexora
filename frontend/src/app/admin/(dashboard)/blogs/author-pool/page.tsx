'use client'

import AuthorPool from '@/components/admin/blogs/AuthorPool'
import { Suspense } from 'react'

function AuthorPoolContent() {
  return (
    <div className='w-full max-w-full'>
      <h1 className='text-2xl font-bold text-foreground mb-2'>Author Pool</h1>
      <p className='text-muted-foreground text-sm mb-6'>
        Manage authors and bylines for your blog. Add authors, set default attribution, and
        assign authors to posts.
      </p>
      <AuthorPool />
    </div>
  )
}

export default function AuthorPoolPage() {
  return (
    <Suspense fallback={<div className='text-muted-foreground'>Loading...</div>}>
      <AuthorPoolContent />
    </Suspense>
  )
}
