'use client'

import SocialLoginForm from '@/components/admin/form/settings/SocialLoginForm'
import PageHeader from '@/components/common/PageHeader'
import useAsync from '@/hooks/useAsync'
import { Suspense } from 'react'

type SettingValue = { isActive?: boolean; appId?: string; appSecret?: string } | null

function SocialLoginManagementContent() {
  const googleReq = useAsync<{ data?: { value?: SettingValue } }>(
    () => '/admin/settings/key/system_google_login',
    true
  )
  const facebookReq = useAsync<{ data?: { value?: SettingValue } }>(
    () => '/admin/settings/key/system_facebook_login',
    true
  )
  const twitterReq = useAsync<{ data?: { value?: SettingValue } }>(
    () => '/admin/settings/key/system_twitter_login',
    true
  )
  const telegramReq = useAsync<{ data?: { value?: SettingValue } }>(
    () => '/admin/settings/key/system_telegram_login',
    true
  )

  const loading =
    googleReq.loading || facebookReq.loading || twitterReq.loading || telegramReq.loading
  const initialGoogle = googleReq.data?.data?.value ?? null
  const initialFacebook = facebookReq.data?.data?.value ?? null
  const initialTwitter = twitterReq.data?.data?.value ?? null
  const initialTelegram = telegramReq.data?.data?.value ?? null

  const refetch = () => {
    googleReq.mutate()
    facebookReq.mutate()
    twitterReq.mutate()
    telegramReq.mutate()
  }

  if (loading) {
    return (
      <div className='flex justify-center items-center min-h-[400px]'>
        <div className='text-center'>
          <div className='mx-auto border-primary border-b-2 rounded-full w-8 h-8 animate-spin' />
          <p className='mt-2 text-muted-foreground text-sm'>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className='mx-auto w-full max-w-5xl overflow-x-hidden'>
      <SocialLoginForm
        initialGoogle={initialGoogle}
        initialFacebook={initialFacebook}
        initialTwitter={initialTwitter}
        initialTelegram={initialTelegram}
        refetch={refetch}
      />
    </div>
  )
}

export default function SocialLoginManagementPage() {
  return (
    <>
      <PageHeader
        title='Social Login Management'
        subTitle='Enable and configure Google, Facebook, Twitter (X), and Telegram login. When enabled, credentials from the database are used on the login and sign-up pages.'
      />
      <Suspense
        fallback={<div className='min-h-[400px] flex items-center justify-center'>Loading...</div>}
      >
        <SocialLoginManagementContent />
      </Suspense>
    </>
  )
}
