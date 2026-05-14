'use client'

import ImageAutoEditor from '@/components/admin/blogs/ImageAutoEditor'
import { Suspense } from 'react'

function ImageAutoEditorContent() {
  return (
    <div className='w-full max-w-full'>
      <ImageAutoEditor />
    </div>
  )
}

export default function ImageAutoEditorPage() {
  return (
    <Suspense fallback={<div className='text-muted-foreground'>Loading...</div>}>
      <ImageAutoEditorContent />
    </Suspense>
  )
}
