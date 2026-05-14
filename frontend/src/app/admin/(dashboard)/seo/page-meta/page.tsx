'use client'

import PageMetaForm from '@/components/admin/form/settings/PageMeta'
import PageHeader from '@/components/common/PageHeader'
import RenderData from '@/components/common/RenderData'
import { Button } from '@/components/ui/button'
import useAsync from '@/hooks/useAsync'
import { SiteSettings } from '@/lib/validations/schemas/siteSettings'
import { Suspense, useState } from 'react'

function PageMeta() {
  const [edit, setEdit] = useState(false)

  const settingsKey = 'system_site_settings'
  const { data, mutate, loading } = useAsync<SettingsData<SiteSettings>>(
    () => `/admin/settings/key/${settingsKey}`,
    true
  )

  if (loading) {
    return (
      <div className='flex justify-center items-center min-h-[400px]'>
        <div className='text-center'>
          <div className='mx-auto border-primary border-b-2 rounded-full w-8 h-8 animate-spin'></div>
          <p className='mt-2 text-muted-foreground text-sm'>Loading page meta...</p>
        </div>
      </div>
    )
  }

  const onClose = () => {
    setEdit(false)
    mutate()
  }

  return (
    <div className='w-full max-w-full overflow-x-hidden'>
      {/* Header */}
      <PageHeader
        title=''
        // title=''
        extra={
          <Button variant={edit ? 'destructive' : 'default'} onClick={() => setEdit(!edit)}>
            {!edit ? 'Edit' : 'Cancel'}
          </Button>
        }
      />

      {!edit && data?.data?.value?.seo ? (
        <RenderData data={data?.data?.value?.seo as any} />
      ) : (
        <PageMetaForm
          settingsKey={settingsKey}
          initialValues={data?.data?.value}
          refetch={onClose}
        />
      )}
    </div>
  )
}

export default function PageMetaPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PageMeta />
    </Suspense>
  )
}
