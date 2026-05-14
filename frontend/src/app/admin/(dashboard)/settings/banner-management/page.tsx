'use client'
import PageBannersForm from '@/components/admin/form/settings/PageBannersForm'
import { EmptyState } from '@/components/common/EmptyState'
import PageHeader from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import useAsync from '@/hooks/useAsync'
import { PageBannersFormData, PageData } from '@/lib/validations/schemas/pageSchema'
import { useEffect, useState } from 'react'

export default function BannerManagementPage() {
  const [pageData, setPageData] = useState<PageData | null>(null)
  const { data, mutate, loading } = useAsync<{ data: PageBannersFormData }>(
    () => `/admin/custom-pages/info?includes=meta,subtitle,excerpt,banner`,
    true
  )

  const onClose = () => {
    mutate()
  }

  useEffect(() => {
    const pages = data?.data?.pages
    if (pages && pages.length > 0) {
      // Keep selection if still present, otherwise pick the first
      const stillExists = pageData ? pages.find((p) => p.id === pageData.id) : null
      setPageData(stillExists ?? pages[0])
    } else {
      setPageData(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  return (
    <>
      <PageHeader
        title='Page Banner Management'
        subTitle='Manage page banner content including title, subtitle, excerpt, and banner image.'
      />

      {loading ? (
        <div className='flex justify-center items-center min-h-[200px]'>
          <div className='text-center'>
            <div className='mx-auto border-primary border-b-2 rounded-full w-8 h-8 animate-spin'></div>
            <p className='mt-2 text-muted-foreground text-sm'>Loading...</p>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap justify-center sm:justify-start gap-4">
            {data?.data?.pages?.map((page, idx) => (
              <Button
                key={idx}
                size={'lg'}
                variant={'outline'}
                onClick={() => setPageData(page)}
                className={pageData?.id === page.id ? 'border-primary text-primary' : ''}
              >
                {page.title}
              </Button>
            ))}
          </div>
          {data?.data?.pages && data.data.pages.length === 0 ? (
            <EmptyState />
          ) : pageData ? (
            <PageBannersForm initialValues={pageData} refetch={onClose} />
          ) : null}
        </>
      )}
    </>
  )
}
