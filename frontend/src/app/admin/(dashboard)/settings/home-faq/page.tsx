'use client'
import { memo, useCallback } from 'react'
import HomeFaqForm from '@/components/admin/form/settings/HomeFaq'
import PageHeader from '@/components/common//PageHeader'
import { CopyToClipboard } from '@/components/common/CopyToClipboard'
import RenderData from '@/components/common/RenderData'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import useAsync from '@/hooks/useAsync'
import { HomepageFaqType } from '@/lib/validations/schemas/faqSettings'
import { Edit } from 'lucide-react'
import { useState } from 'react'

export default memo(function HomeFaqPage() {
  const [edit, setEdit] = useState(false)
  const settingsKey = 'homepage_faq'
  const { data, mutate, loading } = useAsync<SettingsData<HomepageFaqType>>(
    () => `/admin/settings/key/${settingsKey}`,
    true
  )

  const onClose = useCallback(() => {
    mutate()
    setEdit(false)
  }, [mutate])

  return (
    <>
      <PageHeader
        title='Homepage FAQs'
        extra={[
          !edit && data?.data?.value && <CopyToClipboard key='copy' text={`/page/faq`} />,
          !edit && (
            <Button key='edit' onClick={() => setEdit(true)} className='flex items-center gap-2'>
              <Edit className='w-4 h-4' />
              Edit
            </Button>
          )
        ]}
      />

      {edit ? (
        <HomeFaqForm
          settingsKey={settingsKey}
          initialValues={data?.data?.value}
          refetch={onClose}
        />
      ) : loading ? (
        <div className='space-y-4'>
          <Skeleton className='w-full h-4' />
          <Skeleton className='w-3/4 h-4' />
          <Skeleton className='w-1/2 h-4' />
          <Skeleton className='w-2/3 h-4' />
        </div>
      ) : (
        <RenderData data={data?.data?.value ?? {}} />
      )}
    </>
  )
})
