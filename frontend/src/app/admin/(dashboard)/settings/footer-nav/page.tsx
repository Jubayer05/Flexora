'use client'
import NavigationForm from '@/components/admin/form/settings/NavigationForm'
import PageHeader from '@/components/common//PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import RenderData from '@/components/common/RenderData'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import useAsync from '@/hooks/useAsync'
import { NavSettings } from '@/lib/validations/schemas/navigations'
import { useState } from 'react'

export default function FooterNavPage() {
  const [edit, setEdit] = useState(false)
  const settingsKey = 'footerNav'

  const { data, mutate, loading } = useAsync<SettingsData<NavSettings>>(
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
        title='Footer Navigations'
        extra={!edit && <Button onClick={() => setEdit(true)}>Edit</Button>}
      />

      <div className=''>
        {loading ? (
          <div className='space-y-4'>
            <Skeleton className='w-full h-4' />
            <Skeleton className='w-3/4 h-4' />
            <Skeleton className='w-1/2 h-4' />
            <Skeleton className='w-2/3 h-4' />
          </div>
        ) : edit ? (
          <NavigationForm
            settingsKey={settingsKey}
            initialValues={data?.data?.value}
            refetch={onClose}
          />
        ) : data?.data?.key && data.data.value.length > 0 ? (
          <div className='space-y-5'>
            {data.data.value?.map((item, idx) => (
              <RenderData key={idx} data={item} />
            ))}
          </div>
        ) : (
          <EmptyState />
        )}
      </div>
    </>
  )
}
