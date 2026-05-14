'use client'

import EmailConfigurationForm from '@/components/admin/form/settings/EmailConfiguration'
import PageHeader from '@/components/common/PageHeader'
import RenderData from '@/components/common/RenderData'
import { Button } from '@/components/ui/button'
import useAsync from '@/hooks/useAsync'
import { EmailConfiguration } from '@/lib/validations/schemas/emailConfiguration'
import { Suspense, useState } from 'react'

function EmailConfigurations() {
  const [edit, setEdit] = useState(false)

  const settingsKey = 'system_email_configurations'
  const { data, mutate, loading } = useAsync<SettingsData<EmailConfiguration>>(
    () => `/admin/settings/key/${settingsKey}`,
    true
  )

  if (loading) {
    return (
      <div className='flex justify-center items-center min-h-[400px]'>
        <div className='text-center'>
          <div className='mx-auto border-primary border-b-2 rounded-full w-8 h-8 animate-spin'></div>
          <p className='mt-2 text-muted-foreground text-sm'>Loading email configurations...</p>
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
        extra={
          <Button
            variant={edit ? 'destructive' : 'default'}
            size='sm'
            onClick={() => setEdit(!edit)}
          >
            {!edit ? 'Edit' : 'Cancel'}
          </Button>
        }
      />

      {/* Render email template configurations */}
      {!edit && data?.data?.value ? (
        <RenderData data={data?.data?.value ?? {}} />
      ) : (
        <EmailConfigurationForm
          settingsKey={settingsKey}
          initialValues={data?.data?.value}
          refetch={onClose}
        />
      )}
    </div>
  )
}

export default function EmailConfigurationsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EmailConfigurations />
    </Suspense>
  )
}
