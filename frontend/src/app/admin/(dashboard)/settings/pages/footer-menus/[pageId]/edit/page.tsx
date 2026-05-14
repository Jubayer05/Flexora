'use client'

import MainNavForm from '@/components/admin/form/settings/MainNavForm'
import PageHeader from '@/components/common/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import useAsync from '@/hooks/useAsync'
import { useParams } from 'next/navigation'

export default function MainNavDetailsPage() {
  const params = useParams()
  const pageId = params.pageId

  // Fetch existing settings
  const { data, mutate, loading } = useAsync<{ data: any }>(
    () => (pageId ? `/admin/custom-pages/${pageId}` : null),
    true
  )

  if (!pageId) return null

  const onClose = () => {
    mutate()
  }

  return (
    <>
      <PageHeader
        title='Page Content'
        subTitle='Manage static page content like About, Terms, Privacy Policy'
      />

      {loading ? (
        Array.from({ length: 2 }).map((_, idx) => <Skeleton className='my-8' key={idx} />)
      ) : (
        <div className='pt-6'>
          <MainNavForm
            location='FOOTER'
            pageId={String(pageId)}
            initialValues={data?.data}
            refetch={onClose}
          />
        </div>
      )}
    </>
  )
}
