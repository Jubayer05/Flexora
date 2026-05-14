'use client'

import PageHeader from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import useAsync from '@/hooks/useAsync'
import { showError } from '@/lib/errMsg'
import requests from '@/services/network/http'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

const SETTINGS_KEY = 'system_registration_verification'

type VerificationSettingValue = {
  isActive?: boolean
}

export default function EmailVerificationSettingsPage() {
  const [saving, setSaving] = useState(false)

  const { data, loading, mutate } = useAsync<{ data?: { value?: VerificationSettingValue } }>(
    () => `/admin/settings/key/${SETTINGS_KEY}`,
    true
  )

  const isEnabled = useMemo(
    () => (typeof data?.data?.value?.isActive === 'boolean' ? data.data.value.isActive : true),
    [data?.data?.value?.isActive]
  )

  const saveSetting = async (nextValue: boolean) => {
    setSaving(true)
    try {
      await requests.post(`/admin/settings/${SETTINGS_KEY}`, {
        value: {
          isActive: nextValue
        }
      })
      toast.success(nextValue ? 'Email verification requirement enabled.' : 'Email verification requirement disabled.')
      mutate()
    } catch (error) {
      showError(error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className='flex min-h-[320px] items-center justify-center text-muted-foreground'>
        Loading...
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Email Verification'
        subTitle='Control whether registration requires a 6-digit verification code before customers can sign in.'
      />

      <div className='rounded-lg border border-border bg-card p-5'>
        <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
          <div className='space-y-2'>
            <h3 className='font-medium text-foreground'>Require verification on registration</h3>
            <p className='text-sm text-muted-foreground'>
              When enabled, new customers must enter the email verification code during signup.
            </p>
          </div>
          <Switch checked={isEnabled} onCheckedChange={saveSetting} disabled={saving} />
        </div>
      </div>

      <div className='rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground'>
        <p>Current behavior:</p>
        <ul className='mt-3 list-disc space-y-2 pl-5'>
          <li>6-digit verification code sent by email</li>
          <li>Code validity: 10 minutes</li>
          <li>Maximum 5 codes per email per day</li>
          <li>5-minute cooldown between requests</li>
          <li>Cloudflare Turnstile challenge on the verification form when enabled in Addons Management</li>
        </ul>
        <div className='mt-4'>
          <Button variant='outline' onClick={() => saveSetting(isEnabled)} disabled={saving}>
            {saving ? 'Saving...' : 'Save Current Setting'}
          </Button>
        </div>
      </div>
    </div>
  )
}
