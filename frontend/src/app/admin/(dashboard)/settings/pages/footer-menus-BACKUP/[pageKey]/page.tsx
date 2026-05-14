'use client'

import DynamicPageForm from '@/components/admin/form/settings/PageContentForm'
import PageHeader from '@/components/common/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import useAsync from '@/hooks/useAsync'
import { useParams } from 'next/navigation'

export default function DynamicDataPage() {
  const params = useParams()
  const pageKey = params.pageKey

  // Fetch existing settings
  const { data, mutate, loading } = useAsync<{ data: any }>(
    () => (pageKey ? `/admin/settings/key/${pageKey}` : null),
    true
  )

  if (!pageKey) return null

  const pageData = (data?.data as any)?.key === pageKey ? (data?.data as any).value : null

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
          <DynamicPageForm initialValues={pageData} refetch={onClose} pageKey={pageKey as string} />
        </div>
      )}
    </>
  )
}
