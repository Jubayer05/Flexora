'use client'

import PageHeader from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { showError } from '@/lib/errMsg'
import requests from '@/services/network/http'
import useAsync from '@/hooks/useAsync'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

const SETTINGS_KEY = 'maintenance_mode'
const DEFAULT_MESSAGE =
  "We're currently performing maintenance. Please check back later."

type MaintenanceValue = {
  isMaintenanceMode?: boolean
  maintenanceMessage?: string
}

export default function MaintenanceModePage() {
  const [saving, setSaving] = useState(false)
  const [messageInput, setMessageInput] = useState(DEFAULT_MESSAGE)

  const { data, loading, mutate } = useAsync<{ data?: { value?: MaintenanceValue } }>(
    () => `/admin/settings/key/${SETTINGS_KEY}`,
    true
  )

  const value = data?.data?.value
  const isMaintenanceMode = Boolean(value?.isMaintenanceMode)
  const maintenanceMessage =
    typeof value?.maintenanceMessage === 'string' && value.maintenanceMessage.trim()
      ? value.maintenanceMessage
      : DEFAULT_MESSAGE

  useEffect(() => {
    setMessageInput(maintenanceMessage)
  }, [maintenanceMessage])

  const handleToggle = async (checked: boolean) => {
    setSaving(true)
    try {
      await requests.post(`/admin/settings/${SETTINGS_KEY}`, {
        value: {
          isMaintenanceMode: checked,
          maintenanceMessage: messageInput.trim() || DEFAULT_MESSAGE
        }
      })
      toast.success(checked ? 'Site is now under maintenance.' : 'Site is now active.')
      mutate()
    } catch (e) {
      showError(e)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveMessage = async () => {
    setSaving(true)
    try {
      await requests.post(`/admin/settings/${SETTINGS_KEY}`, {
        value: {
          isMaintenanceMode: isMaintenanceMode,
          maintenanceMessage: messageInput.trim() || DEFAULT_MESSAGE
        }
      })
      toast.success('Maintenance message updated.')
      mutate()
    } catch (e) {
      showError(e)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className='flex justify-center items-center min-h-[400px] text-foreground'>
        <div className='text-center'>
          <div className='mx-auto border-primary border-b-2 rounded-full w-8 h-8 animate-spin' />
          <p className='mt-2 text-muted-foreground text-sm'>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className='w-full max-w-full overflow-x-hidden'>
      <PageHeader
        title='Maintenance Mode'
        subTitle='Configure and manage site maintenance. When enabled, only admin dashboard and admin login remain accessible.'
      />

      <div className='space-y-6'>
        {/* Current status */}
        <div className='rounded-lg border border-border bg-card p-4'>
          <div className='flex flex-wrap items-center justify-between gap-4'>
            <div>
              <h3 className='font-medium text-foreground'>Current status</h3>
              <p className='text-sm text-muted-foreground mt-1'>
                {isMaintenanceMode
                  ? 'Your site is under maintenance. Visitors will see the maintenance page.'
                  : 'Your site is active and accessible to everyone.'}
              </p>
            </div>
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${
                isMaintenanceMode
                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  : 'border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400'
              }`}
            >
              {isMaintenanceMode ? 'Under maintenance' : 'Active'}
            </span>
          </div>
        </div>

        {/* Toggle */}
        <div className='rounded-lg border border-border bg-card p-4'>
          <h3 className='font-medium text-foreground mb-4'>Toggle maintenance mode</h3>
          <div className='flex flex-wrap items-center justify-between gap-4'>
            <div>
              <p className='text-sm text-muted-foreground'>
                {isMaintenanceMode ? 'Turn off to make the site accessible again.' : 'Turn on to show the maintenance page to visitors.'}
              </p>
            </div>
            <Switch
              checked={isMaintenanceMode}
              onCheckedChange={handleToggle}
              disabled={saving}
            />
          </div>
        </div>

        {/* Message */}
        <div className='rounded-lg border border-border bg-card p-4'>
          <h3 className='font-medium text-foreground mb-4'>Maintenance message</h3>
          <div className='space-y-4'>
            <div>
              <Label htmlFor='maintenance-message' className='text-foreground'>
                Message shown to visitors during maintenance
              </Label>
              <Textarea
                id='maintenance-message'
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder={DEFAULT_MESSAGE}
                rows={4}
                className='mt-2 bg-background border-border text-foreground placeholder:text-muted-foreground'
              />
            </div>
            <Button onClick={handleSaveMessage} disabled={saving}>
              {saving ? 'Saving...' : 'Update message'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
