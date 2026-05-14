'use client'

import CategoryManagement from '@/components/admin/blogs/CategoryManagement'
import { Suspense } from 'react'

function CategoryManagementContent() {
  return (
    <div className='w-full max-w-full'>
      <h1 className='text-2xl font-bold text-foreground mb-2'>Category Management</h1>
      <p className='text-muted-foreground text-sm mb-6'>
        Manage blog categories and sub-categories. Create categories first, then add
        sub-categories and optionally assign authors.
      </p>
      <CategoryManagement />
    </div>
  )
}

export default function BlogCategoriesPage() {
  return (
    <Suspense fallback={<div className='text-muted-foreground'>Loading...</div>}>
      <CategoryManagementContent />
    </Suspense>
  )
}
