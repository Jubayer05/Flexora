'use client'

import RobotsEditorForm from '@/components/admin/form/settings/RobotsEditorForm'
import useAsync from '@/hooks/useAsync'
import { Suspense } from 'react'

type SettingsData<T> = {
  success: boolean
  data: {
    value: T
  }
}

type RobotsConfig = {
  content: string
}

function RobotsEditor() {
  const settingsKey = 'robots_txt_config'
  const { data, mutate, loading } = useAsync<SettingsData<RobotsConfig>>(
    () => `/admin/settings/key/${settingsKey}`,
    true
  )

  if (loading) {
    return (
      <div className='flex justify-center items-center min-h-[400px]'>
        <div className='text-center'>
          <div className='mx-auto border-primary border-b-2 rounded-full w-8 h-8 animate-spin'></div>
          <p className='mt-2 text-muted-foreground text-sm'>Loading robots.txt configuration...</p>
        </div>
      </div>
    )
  }

  const onClose = () => {
    mutate()
  }

  return (
    <div className='mx-auto w-full max-w-5xl overflow-x-hidden'>
      <RobotsEditorForm
        settingsKey={settingsKey}
        initialValues={data?.data?.value}
        refetch={onClose}
      />
    </div>
  )
}

export default function RobotsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RobotsEditor />
    </Suspense>
  )
}

