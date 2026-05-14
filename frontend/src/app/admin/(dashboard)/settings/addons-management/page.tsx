'use client'

import AddonsForm from '@/components/admin/form/settings/AddonsForm'
import useAsync from '@/hooks/useAsync'
import { AddonsSettingsType } from '@/lib/validations/schemas/addonsSchema'
import { Suspense } from 'react'

function AddonsSettings() {
  const settingsKey = 'addons_management'
  const { data, mutate, loading } = useAsync<SettingsData<AddonsSettingsType>>(
    () => `/admin/settings/key/${settingsKey}`,
    true
  )

  if (loading) {
    return (
      <div className='flex justify-center items-center min-h-[400px]'>
        <div className='text-center'>
          <div className='mx-auto border-primary border-b-2 rounded-full w-8 h-8 animate-spin'></div>
          <p className='mt-2 text-muted-foreground text-sm'>Loading...</p>
        </div>
      </div>
    )
  }

  const onClose = () => {
    mutate()
  }

  return (
    <div className='mx-auto w-full max-w-5xl overflow-x-hidden'>
      <AddonsForm settingsKey={settingsKey} initialValues={data?.data?.value} refetch={onClose} />
    </div>
  )
}

export default function SocialLinksPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AddonsSettings />
    </Suspense>
  )
}
