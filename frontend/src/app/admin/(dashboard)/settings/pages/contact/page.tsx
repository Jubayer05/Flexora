'use client'
import ContactSettings from '@/components/admin/form/settings/ContactSettings'
import PageHeader from '@/components/common//PageHeader'
import RenderData from '@/components/common/RenderData'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import useAsync from '@/hooks/useAsync'
import { SiteSettings } from '@/lib/validations/schemas/contactPageSettings'

import { Edit } from 'lucide-react'
import { useState } from 'react'

export default function ContactPage() {
  const [edit, setEdit] = useState(false)
  const settingsKey = 'system_contact_page_settings'

  const { data, mutate, loading } = useAsync<SettingsData<SiteSettings>>(
    () => `/admin/settings/key/${settingsKey}`,
    true
  )

  const onClose = () => {
    mutate()
    setEdit(false)
  }

  return (
    <>
      <PageHeader
        title='Contact Information Management'
        subTitle='Manage your contact information that will be displayed in the footer and contact form.'
        extra={[
          !edit && (
            <Button key='edit' onClick={() => setEdit(true)} className='flex items-center gap-2'>
              <Edit className='w-4 h-4' />
              Edit
            </Button>
          )
        ]}
      />

      {edit ? (
        <ContactSettings
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
}
