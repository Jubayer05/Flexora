'use client'

import MotionLoader from '@/components/common/MotionLoader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import useAsync from '@/hooks/useAsync'
import { showError } from '@/lib/errMsg'
import requests from '@/services/network/http'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

type PayGateProvider = {
  code: string
  name: string
  type: 'card' | 'crypto' | 'bank'
  method: string
  regions: string[]
  isActive: boolean
  sortOrder: number
  minAmount?: number
  maxAmount?: number
  feePercent?: number
}

export default function PayGateProvidersManager() {
  const [providers, setProviders] = useState<PayGateProvider[]>([])
  const [saving, setSaving] = useState(false)

  const { data, loading, mutate } = useAsync<{
    success: boolean
    data: {
      source: 'defaults' | 'custom' | 'networks'
      providers: PayGateProvider[]
    }
  }>(() => '/admin/paygate-providers')

  useEffect(() => {
    if (data?.data?.providers) {
      const sorted = [...data.data.providers].sort((a, b) => a.sortOrder - b.sortOrder)
      setProviders(sorted)
    }
  }, [data?.data?.providers])

  const updateProvider = (code: string, patch: Partial<PayGateProvider>) => {
    setProviders((prev) =>
      prev.map((provider) => (provider.code === code ? { ...provider, ...patch } : provider))
    )
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = providers.map((provider, index) => ({
        ...provider,
        sortOrder: provider.sortOrder || index + 1
      }))

      await requests.put('/admin/paygate-providers', { providers: payload })
      toast.success('PayGate providers updated')
      await mutate()
    } catch (error) {
      showError(error)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    setSaving(true)
    try {
      await requests.post('/admin/paygate-providers/reset', {})
      toast.success('PayGate providers reset to defaults')
      await mutate()
    } catch (error) {
      showError(error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>PayGate Providers</CardTitle>
        <p className='text-sm text-muted-foreground'>
          Configure PayGate card/crypto/bank providers used in checkout and wallet topups.
        </p>
      </CardHeader>
      <CardContent className='space-y-4'>
        {loading ? (
          <div className='flex justify-center py-8'>
            <MotionLoader size='sm' variant='dots' />
          </div>
        ) : providers.length === 0 ? (
          <p className='text-sm text-muted-foreground'>No providers found.</p>
        ) : (
          <div className='space-y-3'>
            {providers.map((provider) => (
              <div
                key={provider.code}
                className='rounded-lg border border-border bg-background p-3'
              >
                <div className='grid grid-cols-1 gap-3 md:grid-cols-5'>
                  <div className='md:col-span-2'>
                    <div className='font-medium'>{provider.name}</div>
                    <div className='text-xs text-muted-foreground'>
                      {provider.code} • {provider.type.toUpperCase()} • {provider.method}
                    </div>
                  </div>

                  <div className='space-y-1'>
                    <label className='text-xs text-muted-foreground'>Sort</label>
                    <Input
                      type='number'
                      min={1}
                      value={provider.sortOrder}
                      onChange={(event) => {
                        const value = Number(event.target.value)
                        updateProvider(provider.code, {
                          sortOrder: Number.isFinite(value) && value > 0 ? value : provider.sortOrder
                        })
                      }}
                    />
                  </div>

                  <div className='space-y-1'>
                    <label className='text-xs text-muted-foreground'>Min</label>
                    <Input
                      type='number'
                      min={0}
                      step='0.01'
                      value={provider.minAmount ?? ''}
                      onChange={(event) => {
                        const value = event.target.value
                        updateProvider(provider.code, {
                          minAmount: value === '' ? undefined : Number(value)
                        })
                      }}
                    />
                  </div>

                  <div className='flex items-center justify-between md:justify-end gap-2'>
                    <span className='text-sm text-muted-foreground'>Active</span>
                    <Switch
                      checked={provider.isActive}
                      onCheckedChange={(checked) =>
                        updateProvider(provider.code, { isActive: checked })
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className='flex flex-wrap gap-2'>
          <Button onClick={handleSave} disabled={saving || loading || providers.length === 0}>
            {saving ? 'Saving...' : 'Save Providers'}
          </Button>
          <Button variant='outline' onClick={handleReset} disabled={saving || loading}>
            Reset Defaults
          </Button>
          <span className='self-center text-xs text-muted-foreground'>
            Source: {data?.data?.source || 'defaults'}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
