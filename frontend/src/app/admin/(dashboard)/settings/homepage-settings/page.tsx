'use client'

import { useState } from 'react'

import HomepageSettings from '@/components/admin/form/settings/HomepageSettings'
import { EmptyState } from '@/components/common/EmptyState'
import PageHeader from '@/components/common/PageHeader'
import RenderData from '@/components/common/RenderData'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import useAsync from '@/hooks/useAsync'

// Main component
export default function HomeConfigPage() {
  const [edit, setEdit] = useState(false)
  const settingsKey = 'homepage_settings'
  const { data, mutate, loading } = useAsync<SettingsData<HomepageSettings>>(
    () => `/admin/settings/key/${settingsKey}`,
    true
  )
  const homeConfig = data?.data?.value ?? undefined
  const onClose = () => {
    mutate()
    setEdit(false)
  }

  return (
    <>
      <PageHeader
        title='Homepage Configuration'
        subTitle='Manage homepage settings and content'
        extra={
          <Button variant={edit ? 'destructive' : 'default'} onClick={() => setEdit(!edit)}>
            {edit ? 'Cancel' : 'Edit'}
          </Button>
        }
      />

      {edit ? (
        <HomepageSettings settingsKey={settingsKey} initialValues={homeConfig} refetch={onClose} />
      ) : loading ? (
        Array.from({ length: 2 }).map((_, idx) => <Skeleton className='my-8' key={idx} />)
      ) : homeConfig ? (
        <div className='space-y-10!'>
          <RenderData
            // title='Homepage Settings'
            data={homeConfig}
            excludedFields={[]}
          />
        </div>
      ) : (
        <EmptyState />
      )}
    </>
  )
}
