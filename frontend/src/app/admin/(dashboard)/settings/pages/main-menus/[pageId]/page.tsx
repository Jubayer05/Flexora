'use client'

import PageHeader from '@/components/common/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import useAsync from '@/hooks/useAsync'
import { useParams } from 'next/navigation'

export default function MainNavDetailsPage() {
  const params = useParams()
  const pageId = params.pageId

  // Fetch existing settings
  const { loading } = useAsync<{ data: any }>(
    () => (pageId ? `/admin/settings/key/${pageId}` : null),
    true
  )

  if (!pageId) return null

  return (
    <>
      <PageHeader
        title='Page Content'
        subTitle='Manage static page content like About, Terms, Privacy Policy'
      />

      {loading ? (
        Array.from({ length: 2 }).map((_, idx) => <Skeleton className='my-8' key={idx} />)
      ) : (
        <div className='pt-6'>{/* TODO: render page details */}</div>
      )}
    </>
  )
}
