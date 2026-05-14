'use client'

import { Suspense, lazy } from 'react'
import React from 'react'

import useAsync from '@/hooks/useAsync'
import { Skeleton } from '@/components/ui/skeleton'
import PageHeader from '@/components/common/PageHeader'

// Lazy load the form to reduce initial bundle
const TelegramLoginForm = lazy(() =>
  import('@/components/admin/form/settings/TelegramLogin').then((m) => ({
    default: m.default
  }))
)

import type { TelegramLoginType } from '@/components/admin/form/settings/TelegramLogin'

function TelegramLogin() {
  const settingsKey = 'system_telegram_login'
  const { data, mutate, loading } = useAsync<SettingsData<TelegramLoginType>>(
    () => `/admin/settings/key/${settingsKey}`,
    false, // Disable aggressive revalidation
    false
  )

  const FormSkeleton = () => (
    <div className='mx-auto w-full max-w-5xl overflow-x-hidden'>
      <div className='space-y-4'>
        <Skeleton className='h-10 w-48' />
        <Skeleton className='h-32 w-full' />
        <Skeleton className='h-32 w-full' />
        <Skeleton className='h-10 w-32' />
      </div>
    </div>
  )

  const onClose = () => {
    mutate()
  }

  return (
    <>
      <PageHeader
        title='Telegram Login Settings'
        subTitle='Configure Telegram OAuth login settings'
      />
      
      {loading && <FormSkeleton />}
      {!loading && (
        <div className='mx-auto w-full max-w-5xl overflow-x-hidden'>
          <Suspense fallback={<FormSkeleton />}>
            <TelegramLoginForm
              settingsKey={settingsKey}
              initialValues={data?.data?.value}
              refetch={onClose}
            />
          </Suspense>
        </div>
      )}
    </>
  )
}

export default function TelegramLoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TelegramLogin />
    </Suspense>
  )
}
