'use client'

import BlogDetail from '@/components/admin/blogs/BlogDetail'
import CustomLink from '@/components/common/CustomLink'
import PageHeader from '@/components/common/PageHeader'
import { buttonVariants } from '@/components/ui/button'
import useAsync from '@/hooks/useAsync'
import { cn } from '@/lib/utils'
import { Pencil } from 'lucide-react'
import { useParams } from 'next/navigation'

export default function BlogDetailsPage() {
  const params = useParams()
  const { data } = useAsync<{ data: Blog }>(`/admin/blogs/${params.id}`)

  if (!data?.data) {
    return <div>Loading...</div>
  }

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Post Details'
        subTitle='View and manage blog post details'
        extra={
          <CustomLink
            href={`/admin/blogs/${data.data.id}/edit`}
            className={cn('hover:text-background', buttonVariants())}
          >
            <Pencil /> Edit Post
          </CustomLink>
        }
      />

      <BlogDetail data={data.data} />
    </div>
  )
}
