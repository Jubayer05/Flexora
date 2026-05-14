'use client'

import { Suspense, lazy } from 'react'
import React from 'react'

import useAsync from '@/hooks/useAsync'
import { PromotionalIconsType } from '@/lib/validations/schemas/promotionalIcon'
import { Skeleton } from '@/components/ui/skeleton'
import PageHeader from '@/components/common/PageHeader'

// Lazy load the form component to reduce initial bundle
const PromotionalIconForm = lazy(() =>
  import('@/components/admin/form/settings/PromotionalIconForm').then((m) => ({
    default: m.default
  }))
)

function PromotionalIcons() {
  const settingsKey = 'system_promotional_icons'
  const { data, mutate, loading } = useAsync<SettingsData<PromotionalIconsType>>(
    () => `/admin/settings/key/${settingsKey}`,
    false, // Disable aggressive revalidation
    false
  )

  // Skeleton loader component
  const FormSkeleton = () => (
    <div className='mx-auto w-full max-w-3xl overflow-x-hidden'>
      <div className='space-y-4'>
        <Skeleton className='h-10 w-48' />
        <Skeleton className='h-32 w-full' />
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
        title='Promotional Icons'
        subTitle='Configure promotional icons with image, name, URL and active status'
      />
      
      {loading && <FormSkeleton />}
      {!loading && (
        <div className='mx-auto w-full max-w-3xl overflow-x-hidden'>
          <Suspense fallback={<FormSkeleton />}>
            <PromotionalIconForm
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

export default function SocialLinksPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PromotionalIcons />
    </Suspense>
  )
}
