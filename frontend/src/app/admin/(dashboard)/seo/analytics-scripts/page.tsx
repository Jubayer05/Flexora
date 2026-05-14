'use client'

import AnalyticsScriptsForm, { AnalyticsScriptsType } from '@/components/admin/form/settings/AnalyticsScripts'
import useAsync from '@/hooks/useAsync'
import { Suspense } from 'react'

function AnalyticsScripts() {
  const settingsKey = 'system_analytics_scripts'
  const { data, mutate, loading } = useAsync<SettingsData<AnalyticsScriptsType>>(
    () => `/admin/settings/key/${settingsKey}`,
    true
  )

  if (loading) {
    return (
      <div className='flex justify-center items-center min-h-[400px]'>
        <div className='text-center'>
          <div className='mx-auto border-primary border-b-2 rounded-full w-8 h-8 animate-spin'></div>
          <p className='mt-2 text-muted-foreground text-sm'>Loading analytics scripts...</p>
        </div>
      </div>
    )
  }

  const onClose = () => {
    mutate()
  }

  return (
    <div className='mx-auto w-full max-w-5xl overflow-x-hidden'>
      <AnalyticsScriptsForm
        settingsKey={settingsKey}
        initialValues={data?.data?.value}
        refetch={onClose}
      />
    </div>
  )
}

export default function AnalyticsScriptsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AnalyticsScripts />
    </Suspense>
  )
}
