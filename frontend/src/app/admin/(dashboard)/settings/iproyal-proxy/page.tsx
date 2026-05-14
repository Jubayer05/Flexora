'use client'

import { useState } from 'react'
import IProyalProxySettings from '@/components/admin/form/settings/IProyalProxySettings'
import { EmptyState } from '@/components/common/EmptyState'
import PageHeader from '@/components/common/PageHeader'
import RenderData from '@/components/common/RenderData'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import useAsync from '@/hooks/useAsync'

type ProxyConfig = {
  host: string
  port: number
  type: 'SOCKS5' | 'HTTP'
  username?: string
  password?: string
}

type SettingsData<T> = {
  data: { value: T }
}

// Main component
export default function IProyalProxyPage() {
  const [edit, setEdit] = useState(false)
  const settingsKey = 'iproyal'

  const { data, mutate, loading } = useAsync<SettingsData<ProxyConfig>>(
    () => `/admin/settings/key/${settingsKey}`,
    false, // Disable aggressive revalidation
    false
  )
  const resData = data?.data?.value ?? undefined
  const onClose = () => {
    mutate()
    setEdit(false)
  }

  const FormSkeleton = () => (
    <div className='space-y-4'>
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className='h-12 w-full rounded' />
      ))}
    </div>
  )

  return (
    <>
      <PageHeader
        title='IP Royal Proxy Configuration'
        subTitle='Configure global IP Royal proxy for all Telegram accounts'
        extra={
          <Button variant={edit ? 'destructive' : 'default'} onClick={() => setEdit(!edit)}>
            {edit ? 'Cancel' : 'Edit'}
          </Button>
        }
      />

      <div className='mb-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg'>
        <h3 className='text-sm font-semibold text-blue-400 mb-2'>ℹ️ How It Works</h3>
        <ul className='text-sm text-muted-foreground space-y-1'>
          <li>• All new Telegram accounts automatically use this proxy configuration</li>
          <li>• Protects all Telegram API operations (sessions, OTP, transfers)</li>
          <li>• Accounts without specific proxy fall back to this global config</li>
          <li>• Changes apply immediately to new operations</li>
        </ul>
      </div>

      {edit ? (
        <IProyalProxySettings settingsKey={settingsKey} initialValues={resData} refetch={onClose} />
      ) : loading ? (
        <FormSkeleton />
      ) : resData ? (
        <RenderData title='Current Proxy Configuration' data={resData} />
      ) : (
        <EmptyState
          title='No Proxy Configured'
          description='Set up IP Royal proxy to protect Telegram operations'
        />
      )}
    </>
  )
}
