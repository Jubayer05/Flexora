'use client'

import SocialLinksForm from '@/components/admin/form/settings/SocialLinks'
import useAsync from '@/hooks/useAsync'
import { SocialLinksType } from '@/lib/validations/schemas/socialLinks'
import { Suspense } from 'react'

function SocialLinks() {
  const settingsKey = 'system_social_links'
  const { data, mutate, loading } = useAsync<SettingsData<SocialLinksType>>(
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
    <div className='mx-auto w-full max-w-4xl overflow-x-hidden'>
      <SocialLinksForm
        settingsKey={settingsKey}
        initialValues={data?.data?.value}
        refetch={onClose}
      />
    </div>
  )
}

export default function SocialLinksPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SocialLinks />
    </Suspense>
  )
}
