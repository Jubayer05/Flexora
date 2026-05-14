'use client'

import { useState, useEffect } from 'react'
import PageHeader from '@/components/common/PageHeader'
import TelegramSettings from '@/components/admin/form/settings/TelegramSettings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CustomTable } from '@/components/admin/common/data-table'
import useAsync from '@/hooks/useAsync'
import requests from '@/services/network/http'
import { showError } from '@/lib/errMsg'
import { toast } from 'sonner'
import { Loader2, CheckCircle2, XCircle, Crown, Settings, History } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { TelegramSchema } from '@/lib/validations/schemas/telegram'

interface PremiumConfig {
  apiKey: string
  baseUrl: string
  enabled: boolean
}

interface PremiumPrice {
  '1-month': number
  '3-month': number
  '6-month': number
  '12-month': number
}

interface PremiumOrder {
  id: number
  orderNumber: string
  status: string
  total: string
  createdAt: string
  guestEmail?: string | null
  customerName?: string | null
  customerPhone?: string | null
  product: {
    id: number
    name: string
    type: string
    price: string
  }
  user: {
    id: number
    email: string
    firstName: string | null
  } | null
}

export default function TelegramPremiumSettingsPage() {
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [enabled, setEnabled] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{
    configured: boolean
    enabled: boolean
    apiConnected: boolean
    error?: string
  } | null>(null)
  const [showTestDialog, setShowTestDialog] = useState(false)
  const [ordersPage, setOrdersPage] = useState(1)

  // Fetch current config
  const { data: configData, loading: configLoading, mutate: refetchConfig } = useAsync<{
    data: PremiumConfig
  }>(() => '/admin/telegram-premium/config')

  // Fetch prices
  const { data: pricesData, loading: pricesLoading, mutate: refetchPrices } = useAsync<{
    data: PremiumPrice
  }>(() => '/admin/telegram-premium/prices')

  // Fetch order history
  const { data: ordersData, loading: ordersLoading } = useAsync<{
    data: {
      orders: PremiumOrder[]
      pagination: {
        page: number
        limit: number
        total: number
        totalPages: number
      }
    }
  }>(() => `/admin/telegram-premium/orders?page=${ordersPage}&limit=10`)

  // Fetch Telegram bot notification config
  const { data: botConfigData, loading: botConfigLoading, mutate: refetchBotConfig } = useAsync<{
    data: { value: TelegramSchema }
  }>(() => '/admin/settings/key/telegram_config')

  // Load config into state
  useEffect(() => {
    if (configData?.data) {
      setApiKey(configData.data.apiKey || '')
      setBaseUrl(configData.data.baseUrl || '')
      setEnabled(configData.data.enabled || false)
    }
  }, [configData])

  const handleSave = async () => {
    if (!apiKey.trim() || !baseUrl.trim()) {
      toast.error('Please fill in API key and base URL')
      return
    }

    setIsSaving(true)
    try {
      await requests.post('/admin/telegram-premium/config', {
        apiKey: apiKey.trim(),
        baseUrl: baseUrl.trim(),
        enabled
      })

      toast.success('Premium configuration saved successfully!')
      refetchConfig()
      refetchPrices()
    } catch (error) {
      showError(error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleTestConnection = async () => {
    setIsTesting(true)
    setTestResult(null)
    try {
    const response = await requests.post<{
  data: {
    configured: boolean
    enabled: boolean
    apiConnected: boolean
    error?: string
  }
}>('/admin/telegram-premium/test-connection', {})  // <- add {}

      setTestResult(response.data)
      setShowTestDialog(true)
    } catch (error) {
      showError(error)
      setTestResult({
        configured: false,
        enabled: false,
        apiConnected: false,
        error: 'Failed to test connection'
      })
      setShowTestDialog(true)
    } finally {
      setIsTesting(false)
    }
  }

  const orders = ordersData?.data?.orders || []
  const pagination = ordersData?.data?.pagination

  const orderColumns = [
    {
      key: 'orderNumber',
      header: 'Order Number',
      render: (value: string) => <span className='font-medium'>{value}</span>
    },
    {
      key: 'product',
      header: 'Product',
      render: (_: any, order: PremiumOrder) => (
        <div>
          <div className='font-medium'>{order.product.name}</div>
          <div className='text-sm text-muted-foreground'>{order.product.type}</div>
        </div>
      )
    },
    {
      key: 'user',
      header: 'Customer',
      render: (_: any, order: PremiumOrder) => {
        // Check if it's a guest order
        const isGuest = !order.user && (order.guestEmail || order.customerName)
        
        if (isGuest) {
          // Display guest information
          const guestName = order.customerName || 'Guest'
          const guestEmail = order.guestEmail || ''
          
          return (
            <div>
              <div className='font-medium'>{guestName}</div>
              {guestEmail && (
                <div className='text-sm text-muted-foreground'>{guestEmail}</div>
              )}
              <Badge variant='outline' className='bg-blue-500/10 text-blue-500 border-blue-500/20 text-xs mt-1'>
                Guest
              </Badge>
            </div>
          )
        }
        
        // Display logged-in user information
        return (
          <div>
            {order.user ? (
              <>
                <div className='font-medium'>{order.user.email}</div>
                {order.user.firstName && (
                  <div className='text-sm text-muted-foreground'>{order.user.firstName}</div>
                )}
              </>
            ) : (
              <span className='text-muted-foreground'>Guest</span>
            )}
          </div>
        )
      }
    },
    {
      key: 'total',
      header: 'Total',
      render: (value: string) => <span className='font-medium'>${parseFloat(value).toFixed(2)}</span>
    },
    {
      key: 'status',
      header: 'Status',
      render: (value: string) => (
        <Badge
          variant='outline'
          className={
            value === 'COMPLETED'
              ? 'bg-green-500/10 text-green-500 border-green-500/20'
              : value === 'PENDING'
              ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
              : 'bg-red-500/10 text-red-500 border-red-500/20'
          }
        >
          {value}
        </Badge>
      )
    },
    {
      key: 'createdAt',
      header: 'Date',
      render: (value: string) => (
        <span className='text-sm text-muted-foreground'>{new Date(value).toLocaleDateString()}</span>
      )
    }
  ]

  if (configLoading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Telegram Premium Settings'
        subTitle='Configure Telegram Premium integration with Fragment API'
        extra={
          <div className='flex items-center gap-2'>
            <Button variant='outline' onClick={handleTestConnection} disabled={isTesting}>
              {isTesting ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Testing...
                </>
              ) : (
                <>
                  <CheckCircle2 className='mr-2 h-4 w-4' />
                  Test Connection
                </>
              )}
            </Button>
          </div>
        }
      />

      {/* Configuration Card */}
      <Card className='bg-card border-border'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-foreground'>
            <Settings className='h-5 w-5' />
            API Configuration
          </CardTitle>
          <CardDescription className='text-muted-foreground'>
            Configure Fragment API credentials for Telegram Premium activation
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'> 

          <div className='space-y-2'>
            <Label htmlFor='apiKey' className='text-foreground'>
              API Key <span className='text-muted-foreground text-sm'>(Bearer Token)</span>
            </Label>
            <Input
              id='apiKey'
              type='password'
              placeholder='Enter your Fragment API key (Bearer token)'
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className='bg-background border-border text-foreground'
            />
            <p className='text-xs text-muted-foreground'>
              Your API key will be sent as a Bearer token in the Authorization header
            </p>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='baseUrl' className='text-foreground'>
              Base URL
            </Label>
            <Input
              id='baseUrl'
              type='text'
              placeholder='https://robynhood.parssms.info'
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className='bg-background border-border text-foreground'
            />
            <p className='text-xs text-muted-foreground'>
              Default: https://robynhood.parssms.info (Fragment API endpoint)
            </p>
          </div>

          <div className='flex items-center justify-between'>
            <div className='space-y-0.5'>
              <Label htmlFor='enabled' className='text-foreground'>
                Enable Premium Service
              </Label>
              <p className='text-sm text-muted-foreground'>
                Enable or disable Telegram Premium activation service
              </p>
            </div>
            <Switch
              id='enabled'
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>

          <Button onClick={handleSave} disabled={isSaving} className='w-full'>
            {isSaving ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Saving...
              </>
            ) : (
              'Save Configuration'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Prices Card */}
      <Card className='bg-card border-border'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-foreground'>
            <Crown className='h-5 w-5' />
            Premium Prices
          </CardTitle>
          <CardDescription className='text-muted-foreground'>
            Current Premium subscription prices from Fragment API
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pricesLoading ? (
            <div className='flex items-center justify-center py-8'>
              <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
            </div>
          ) : pricesData?.data ? (
            <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
              {Object.entries(pricesData.data).map(([duration, price]) => (
                <div
                  key={duration}
                  className='bg-muted/50 border border-border rounded-lg p-4 text-center'
                >
                  <div className='text-sm text-muted-foreground mb-1'>{duration}</div>
                  <div className='text-xl font-bold text-foreground'>${price.toFixed(2)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className='text-center py-8 text-muted-foreground'>
              No prices available. Please configure API and test connection.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order History Card */}
      <Card className='bg-card border-border'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-foreground'>
            <History className='h-5 w-5' />
            Premium Order History
          </CardTitle>
          <CardDescription className='text-muted-foreground'>
            View all Telegram Premium subscription orders
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ordersLoading ? (
            <div className='flex items-center justify-center py-8'>
              <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
            </div>
          ) : orders.length > 0 ? (
            <>
              <CustomTable
                columns={orderColumns}
                data={orders}
                getRowId={(row: PremiumOrder) => row.id}
                emptyMessage='No orders found'
              />
              {pagination && pagination.totalPages > 1 && (
                <div className='flex items-center justify-between mt-4'>
                  <div className='text-sm text-muted-foreground'>
                    Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                  </div>
                  <div className='flex gap-2'>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => setOrdersPage((p) => Math.max(1, p - 1))}
                      disabled={ordersPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => setOrdersPage((p) => p + 1)}
                      disabled={ordersPage >= pagination.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className='text-center py-8 text-muted-foreground'>No premium orders found</div>
          )}
        </CardContent>
      </Card>

      {/* Telegram Bot Notification Settings */}
      <div className='space-y-4'>
        <div>
          <h2 className='text-2xl font-bold text-foreground'>Telegram Bot Notification Settings</h2>
          <p className='text-muted-foreground'>
            Configure Telegram bot notifications and send test messages from this page.
          </p>
        </div>

        {botConfigLoading ? (
          Array.from({ length: 2 }).map((_, idx) => <Skeleton className='my-4 h-40' key={idx} />)
        ) : (
          <TelegramSettings
            settingsKey='telegram_config'
            initialValues={botConfigData?.data?.value}
            refetch={refetchBotConfig}
          />
        )}
      </div>

      {/* Test Connection Dialog */}
      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent className='bg-card border-border text-foreground'>
          <DialogHeader>
            <DialogTitle>Connection Test Result</DialogTitle>
            <DialogDescription className='text-muted-foreground'>
              Status of Telegram Premium API connection
            </DialogDescription>
          </DialogHeader>
          {testResult && (
            <div className='space-y-4 py-4'>
              <div className='flex items-center justify-between'>
                <span className='text-foreground'>Configured:</span>
                {testResult.configured ? (
                  <Badge className='bg-green-500/10 text-green-500 border-green-500/20'>
                    <CheckCircle2 className='mr-1 h-3 w-3' />
                    Yes
                  </Badge>
                ) : (
                  <Badge className='bg-red-500/10 text-red-500 border-red-500/20'>
                    <XCircle className='mr-1 h-3 w-3' />
                    No
                  </Badge>
                )}
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-foreground'>Enabled:</span>
                {testResult.enabled ? (
                  <Badge className='bg-green-500/10 text-green-500 border-green-500/20'>
                    <CheckCircle2 className='mr-1 h-3 w-3' />
                    Yes
                  </Badge>
                ) : (
                  <Badge className='bg-red-500/10 text-red-500 border-red-500/20'>
                    <XCircle className='mr-1 h-3 w-3' />
                    No
                  </Badge>
                )}
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-foreground'>API Connected:</span>
                {testResult.apiConnected ? (
                  <Badge className='bg-green-500/10 text-green-500 border-green-500/20'>
                    <CheckCircle2 className='mr-1 h-3 w-3' />
                    Connected
                  </Badge>
                ) : (
                  <Badge className='bg-red-500/10 text-red-500 border-red-500/20'>
                    <XCircle className='mr-1 h-3 w-3' />
                    Not Connected
                  </Badge>
                )}
              </div>
              {testResult.error && (
                <div className='bg-red-500/10 border border-red-500/20 rounded-lg p-3'>
                  <p className='text-sm text-red-500'>{testResult.error}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant='outline' onClick={() => setShowTestDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

