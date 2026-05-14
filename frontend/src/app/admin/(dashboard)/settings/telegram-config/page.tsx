'use client'

import { useState } from 'react'

import TelegramSettings from '@/components/admin/form/settings/TelegramSettings'
import { EmptyState } from '@/components/common/EmptyState'
import PageHeader from '@/components/common/PageHeader'
import RenderData from '@/components/common/RenderData'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import useAsync from '@/hooks/useAsync'
import { TelegramSchema } from '@/lib/validations/schemas/telegram'

type SettingsData<T> = {
  data: { value: T }
}

// Main component
export default function TelegramConfigPage() {
  const [edit, setEdit] = useState(false)
  const settingsKey = 'telegram_config'

  const { data, mutate, loading } = useAsync<SettingsData<TelegramSchema>>(
    () => `/admin/settings/key/${settingsKey}`,
    true
  )
  const resData = data?.data?.value ?? undefined
  const onClose = () => {
    mutate()
    setEdit(false)
  }

  return (
    <>
      <PageHeader
        title='Telegram Configuration'
        subTitle='Configure Telegram Bot settings for notifications'
        extra={
          <Button variant={edit ? 'destructive' : 'default'} onClick={() => setEdit(!edit)}>
            {edit ? 'Cancel' : 'Edit'}
          </Button>
        }
      />

      {edit ? (
        <TelegramSettings settingsKey={settingsKey} initialValues={resData} refetch={onClose} />
      ) : loading ? (
        Array.from({ length: 2 }).map((_, idx) => <Skeleton className='my-8' key={idx} />)
      ) : resData ? (
        <RenderData title='Telegram Notifications' data={resData} />
      ) : (
        <EmptyState />
      )}
    </>
  )
}
