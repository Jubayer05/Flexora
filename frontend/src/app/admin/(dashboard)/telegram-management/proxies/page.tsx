'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { CustomTable } from '@/components/admin/common/data-table'
import PageHeader from '@/components/common/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CustomSelect } from '@/components/common/CustomSelect'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import useAsync from '@/hooks/useAsync'
import { toast } from 'sonner'
import {
  Network,
  Plus,
  TestTube,
  Trash2,
  Edit,
  CheckCircle2,
  XCircle,
  Upload,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import requests from '@/services/network/http'

interface Proxy {
  id: string
  provider: 'iproyal' | 'proxy-seller' | 'bright-data' | 'custom'
  host: string
  port: number
  type: 'socks5' | 'http'
  username?: string
  password?: string
  lastUsed?: number
  lastTested?: number
  successCount: number
  failureCount: number
  averageResponseTime: number
  isHealthy: boolean
  enabled: boolean
}

interface ProxyResponse {
  proxies: Proxy[]
  configs: any[]
}

interface ProxyStats {
  totalProxies: number
  activeProxies: number
  failedProxies: number
  averageResponseTime: number
  totalSuccessCount: number
  totalFailureCount: number
}

interface ApiSuccess<T> {
  success: boolean
  data: T
  message: string
}

function ProxyManagementList() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false)
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isTesting, setIsTesting] = useState<string | null>(null)
  const [isBulkImporting, setIsBulkImporting] = useState(false)
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)
  const [selectedProxy, setSelectedProxy] = useState<Proxy | null>(null)
  const [selectedProxyIds, setSelectedProxyIds] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [proxyForm, setProxyForm] = useState({
    provider: 'custom' as 'iproyal' | 'proxy-seller' | 'bright-data' | 'custom',
    enabled: true,
    host: '',
    port: '',
    type: 'socks5' as 'socks5' | 'http',
    username: '',
    password: '',
    rotationEnabled: false,
    rotationInterval: ''
  })
  const [bulkForm, setBulkForm] = useState({
    provider: 'custom' as 'iproyal' | 'proxy-seller' | 'bright-data' | 'custom',
    enabled: true,
    type: 'socks5' as 'socks5' | 'http',
    proxiesText: ''
  })

  const { data, loading, mutate } = useAsync<ApiSuccess<ProxyResponse>>(() => '/admin/telegram-proxies')
  const { data: statsData, mutate: mutateStats } = useAsync<ApiSuccess<ProxyStats>>(
    () => '/admin/telegram-proxies/stats'
  )

  const proxies = data?.data?.proxies || []
  const totalPages = Math.max(1, Math.ceil(proxies.length / pageSize))

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  const paginatedProxies = useMemo(() => {
    const start = (page - 1) * pageSize
    return proxies.slice(start, start + pageSize)
  }, [page, pageSize, proxies])

  const allVisibleSelected =
    paginatedProxies.length > 0 && paginatedProxies.every((proxy) => selectedProxyIds.includes(proxy.id))

  const refreshProxyData = async () => {
    await Promise.all([mutate?.(), mutateStats?.()])
  }

  const handleAddProxy = async () => {
    if (!proxyForm.host || !proxyForm.port) {
      toast.error('Host and port are required')
      return
    }

    try {
      await requests.post('/admin/telegram-proxies', proxyForm)
      toast.success('Proxy added successfully')
      setIsAddDialogOpen(false)
      setProxyForm({
        provider: 'custom',
        enabled: true,
        host: '',
        port: '',
        type: 'socks5',
        username: '',
        password: '',
        rotationEnabled: false,
        rotationInterval: ''
      })
      await refreshProxyData()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to add proxy')
    }
  }

  const handleEditProxy = async () => {
    if (!selectedProxy || !proxyForm.host || !proxyForm.port) {
      toast.error('Host and port are required')
      return
    }

    try {
      await requests.post('/admin/telegram-proxies', proxyForm)
      toast.success('Proxy updated successfully')
      setIsEditDialogOpen(false)
      setSelectedProxy(null)
      await refreshProxyData()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update proxy')
    }
  }

  const handleBulkImport = async () => {
    if (!bulkForm.proxiesText.trim()) {
      toast.error('Please paste proxy lines first')
      return
    }

    setIsBulkImporting(true)
    try {
      const response = await requests.post<
        ApiSuccess<{
          imported: number
          skipped: number
          invalid: number
          invalidLines?: string[]
        }>
      >('/admin/telegram-proxies/bulk', bulkForm)

      const imported = response.data?.imported || 0
      const skipped = response.data?.skipped || 0
      const invalid = response.data?.invalid || 0

      toast.success(
        `Imported ${imported} proxies${skipped ? `, skipped ${skipped}` : ''}${invalid ? `, invalid ${invalid}` : ''}`
      )

      setBulkForm({
        provider: 'custom',
        enabled: true,
        type: 'socks5',
        proxiesText: ''
      })
      setIsBulkDialogOpen(false)
      setPage(1)
      await refreshProxyData()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to import proxies')
    } finally {
      setIsBulkImporting(false)
    }
  }

  const handleBulkDelete = async () => {
    if (!selectedProxyIds.length) {
      toast.error('Please select proxies first')
      return
    }

    setIsBulkDeleting(true)
    try {
      const selectedProxies = proxies.filter((proxy) => selectedProxyIds.includes(proxy.id))

      await Promise.all(
        selectedProxies.map((proxy) =>
          requests.delete(`/admin/telegram-proxies/${proxy.provider}/${proxy.host}/${proxy.port}`)
        )
      )

      toast.success(`Deleted ${selectedProxies.length} proxies successfully`)
      setSelectedProxyIds([])
      setIsBulkDeleteDialogOpen(false)
      setPage(1)
      await refreshProxyData()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete selected proxies')
    } finally {
      setIsBulkDeleting(false)
    }
  }

  const handleTestProxy = async (proxy: Proxy) => {
    setIsTesting(proxy.id)
    setTestResult(null)
    setSelectedProxy(proxy)
    setIsTestDialogOpen(true)

    try {
      const response = await requests.post<
        ApiSuccess<{
          success: boolean
          responseTime?: number
          externalIp?: string
          country?: string
          error?: string
        }>
      >('/admin/telegram-proxies/test', {
        host: proxy.host,
        port: proxy.port,
        type: proxy.type,
        username: proxy.username,
        password: proxy.password,
        provider: proxy.provider
      })

      setTestResult(response.data)
      if (response.data.success) {
        toast.success(`Proxy test successful (${response.data.responseTime}ms)`)
      } else {
        toast.error(response.data.error || 'Proxy test failed')
      }
      await refreshProxyData()
    } catch (error: any) {
      setTestResult({ success: false, error: error?.response?.data?.message || 'Test failed' })
      toast.error(error?.response?.data?.message || 'Failed to test proxy')
    } finally {
      setIsTesting(null)
    }
  }

  const handleDeleteProxy = async (proxy: Proxy) => {
    setIsDeleting(proxy.id)
    try {
      await requests.delete(`/admin/telegram-proxies/${proxy.provider}/${proxy.host}/${proxy.port}`)
      toast.success('Proxy deleted successfully')
      setSelectedProxyIds((prev) => prev.filter((id) => id !== proxy.id))
      await refreshProxyData()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete proxy')
    } finally {
      setIsDeleting(null)
    }
  }

  const handleEditClick = (proxy: Proxy) => {
    setSelectedProxy(proxy)
    setProxyForm({
      provider: proxy.provider,
      enabled: proxy.enabled,
      host: proxy.host,
      port: proxy.port.toString(),
      type: proxy.type,
      username: proxy.username || '',
      password: proxy.password || '',
      rotationEnabled: false,
      rotationInterval: ''
    })
    setIsEditDialogOpen(true)
  }

  const getProviderLabel = (provider: string) => {
    const labels: Record<string, string> = {
      iproyal: 'IP Royal',
      'proxy-seller': 'Proxy-Seller',
      'bright-data': 'Bright Data',
      custom: 'Custom'
    }
    return labels[provider] || provider
  }

  const columns = [
    {
      key: 'select',
      header: (
        <Checkbox
          checked={allVisibleSelected}
          onCheckedChange={(checked) => {
            if (checked) {
              setSelectedProxyIds((prev) => Array.from(new Set([...prev, ...paginatedProxies.map((proxy) => proxy.id)])))
            } else {
              setSelectedProxyIds((prev) =>
                prev.filter((id) => !paginatedProxies.some((proxy) => proxy.id === id))
              )
            }
          }}
          aria-label='Select all visible proxies'
        />
      ),
      render: (_: any, proxy: Proxy) => (
        <Checkbox
          checked={selectedProxyIds.includes(proxy.id)}
          onCheckedChange={(checked) => {
            setSelectedProxyIds((prev) =>
              checked ? Array.from(new Set([...prev, proxy.id])) : prev.filter((id) => id !== proxy.id)
            )
          }}
          aria-label={`Select proxy ${proxy.host}:${proxy.port}`}
        />
      ),
      className: 'w-12'
    },
    {
      key: 'provider',
      header: 'Provider',
      render: (value: string) => (
        <Badge variant='outline' className='bg-blue-500/10 text-blue-500 border-blue-500/20'>
          {getProviderLabel(value)}
        </Badge>
      )
    },
    {
      key: 'host',
      header: 'Host',
      render: (value: string, proxy: Proxy) => (
        <div className='text-sm'>
          <div className='font-medium'>{value}</div>
          <div className='text-xs text-muted-foreground'>Port: {proxy.port}</div>
        </div>
      )
    },
    {
      key: 'type',
      header: 'Type',
      render: (value: string) => (
        <Badge variant='outline' className='bg-gray-500/10 text-gray-500 border-gray-500/20'>
          {value.toUpperCase()}
        </Badge>
      )
    },
    {
      key: 'isHealthy',
      header: 'Status',
      render: (value: boolean, proxy: Proxy) => (
        <div className='flex items-center gap-2'>
          {value ? (
            <Badge variant='outline' className='bg-green-500/10 text-green-500 border-green-500/20'>
              <CheckCircle2 className='h-3 w-3 mr-1' />
              Healthy
            </Badge>
          ) : (
            <Badge variant='outline' className='bg-red-500/10 text-red-500 border-red-500/20'>
              <XCircle className='h-3 w-3 mr-1' />
              Failed
            </Badge>
          )}
          {proxy.enabled ? (
            <Badge variant='outline' className='bg-blue-500/10 text-blue-500 border-blue-500/20'>
              Enabled
            </Badge>
          ) : (
            <Badge variant='outline' className='bg-gray-500/10 text-gray-500 border-gray-500/20'>
              Disabled
            </Badge>
          )}
        </div>
      )
    },
    {
      key: 'successCount',
      header: 'Success / Failure',
      render: (_: any, proxy: Proxy) => (
        <div className='text-sm'>
          <div className='text-green-500'>✓ {proxy.successCount}</div>
          <div className='text-red-500'>✗ {proxy.failureCount}</div>
        </div>
      )
    },
    {
      key: 'averageResponseTime',
      header: 'Avg Response',
      render: (value: number) => (
        <div className='text-sm'>{value ? `${Math.round(value)}ms` : 'N/A'}</div>
      )
    },
    {
      key: 'lastTested',
      header: 'Last Tested',
      render: (value: number) => (
        <div className='text-sm text-muted-foreground'>
          {value ? new Date(value).toLocaleString() : 'Never'}
        </div>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_: any, proxy: Proxy) => (
        <div className='flex gap-2'>
          <Button
            size='sm'
            variant='outline'
            onClick={() => handleTestProxy(proxy)}
            disabled={isTesting === proxy.id}
          >
            <TestTube className='h-4 w-4 mr-1' />
            {isTesting === proxy.id ? 'Testing...' : 'Test'}
          </Button>
          <Button size='sm' variant='outline' onClick={() => handleEditClick(proxy)}>
            <Edit className='h-4 w-4 mr-1' />
            Edit
          </Button>
          <Button
            size='sm'
            variant='destructive'
            onClick={() => handleDeleteProxy(proxy)}
            disabled={isDeleting === proxy.id}
          >
            <Trash2 className='h-4 w-4' />
          </Button>
        </div>
      )
    }
  ]

  return (
    <div className='w-full max-w-full overflow-x-hidden'>
      <PageHeader
        title='Proxy Management'
        subTitle='Manage and test Telegram proxy configurations'
        extra={
          <div className='flex flex-wrap items-center gap-2'>
            <Button
              variant='destructive'
              onClick={() => setIsBulkDeleteDialogOpen(true)}
              disabled={!selectedProxyIds.length}
            >
              <Trash2 className='h-4 w-4 mr-2' />
              Delete Selected
            </Button>
            <Button variant='outline' onClick={() => setIsBulkDialogOpen(true)}>
              <Upload className='h-4 w-4 mr-2' />
              Bulk Import
            </Button>
            <Button onClick={() => setIsAddDialogOpen(true)} className='bg-primary text-primary-foreground'>
              <Plus className='h-4 w-4 mr-2' />
              Add Proxy
            </Button>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className='grid grid-cols-1 md:grid-cols-4 gap-4 mb-6'>
        <Card className='bg-background border-white/20'>
          <CardHeader className='pb-2'>
            <CardDescription>Total Proxies</CardDescription>
            <CardTitle className='text-2xl'>{statsData?.data?.totalProxies || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card className='bg-background border-white/20'>
          <CardHeader className='pb-2'>
            <CardDescription>Active Proxies</CardDescription>
            <CardTitle className='text-2xl text-green-500'>
              {statsData?.data?.activeProxies || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className='bg-background border-white/20'>
          <CardHeader className='pb-2'>
            <CardDescription>Failed Proxies</CardDescription>
            <CardTitle className='text-2xl text-red-500'>{statsData?.data?.failedProxies || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card className='bg-background border-white/20'>
          <CardHeader className='pb-2'>
            <CardDescription>Avg Response Time</CardDescription>
            <CardTitle className='text-2xl'>
              {statsData?.data?.averageResponseTime
                ? `${Math.round(statsData.data.averageResponseTime)}ms`
                : 'N/A'}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Table */}
      <CustomTable
        columns={columns}
        data={paginatedProxies}
        getRowId={(row: Proxy) => row.id}
        emptyMessage={
          loading
            ? 'Loading proxies...'
            : 'No proxies configured. Click "Add Proxy" to add your first proxy.'
        }
        className={loading ? 'opacity-50 pointer-events-none' : ''}
      />

      <div className='mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex items-center gap-2'>
          <Label className='text-sm'>Rows</Label>
          <CustomSelect
            value={String(pageSize)}
            onChange={(value) => {
              setPageSize(Number(value))
              setPage(1)
            }}
            staticOptions={[
              { title: '10', label: '10', value: '10' },
              { title: '20', label: '20', value: '20' },
              { title: '30', label: '30', value: '30' }
            ]}
            showSearch={false}
          />
        </div>

        <div className='text-sm text-muted-foreground'>
          {proxies.length ? `${page}/${totalPages} (${proxies.length})` : '0/1 (0)'}
        </div>

        <div className='flex items-center gap-2'>
          <Button variant='outline' size='icon' onClick={() => setPage(1)} disabled={page <= 1}>
            <ChevronLeft className='h-4 w-4' />
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page <= 1}
          >
            Prev
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={page >= totalPages}
          >
            Next
          </Button>
          <Button
            variant='outline'
            size='icon'
            onClick={() => setPage(totalPages)}
            disabled={page >= totalPages}
          >
            <ChevronRight className='h-4 w-4' />
          </Button>
        </div>
      </div>

      {/* Add Proxy Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Add Proxy</DialogTitle>
            <DialogDescription>Configure a new proxy for Telegram accounts</DialogDescription>
          </DialogHeader>
          <div className='space-y-4'>
            <div>
              <Label>Provider</Label>
              <CustomSelect
                value={proxyForm.provider}
                onChange={(val) => setProxyForm({ ...proxyForm, provider: val as any })}
                staticOptions={[
                  { title: 'IP Royal', label: 'IP Royal', value: 'iproyal' },
                  { title: 'Proxy-Seller', label: 'Proxy-Seller', value: 'proxy-seller' },
                  { title: 'Bright Data', label: 'Bright Data', value: 'bright-data' },
                  { title: 'Custom', label: 'Custom', value: 'custom' }
                ]}
                showSearch={false}
              />
            </div>
            <div>
              <Label>Host</Label>
              <Input
                value={proxyForm.host}
                onChange={(e) => setProxyForm({ ...proxyForm, host: e.target.value })}
                placeholder='proxy.example.com'
              />
            </div>
            <div>
              <Label>Port</Label>
              <Input
                type='number'
                value={proxyForm.port}
                onChange={(e) => setProxyForm({ ...proxyForm, port: e.target.value })}
                placeholder='1080'
              />
            </div>
            <div>
              <Label>Type</Label>
              <CustomSelect
                value={proxyForm.type}
                onChange={(val) => setProxyForm({ ...proxyForm, type: val as any })}
                staticOptions={[
                  { title: 'SOCKS5', label: 'SOCKS5', value: 'socks5' },
                  { title: 'HTTP', label: 'HTTP', value: 'http' }
                ]}
                showSearch={false}
              />
            </div>
            <div>
              <Label>Username (Optional)</Label>
              <Input
                value={proxyForm.username}
                onChange={(e) => setProxyForm({ ...proxyForm, username: e.target.value })}
                placeholder='username'
              />
            </div>
            <div>
              <Label>Password (Optional)</Label>
              <Input
                type='password'
                value={proxyForm.password}
                onChange={(e) => setProxyForm({ ...proxyForm, password: e.target.value })}
                placeholder='password'
              />
            </div>
            <div className='flex items-center gap-2'>
              <Switch
                checked={proxyForm.enabled}
                onCheckedChange={(checked) => setProxyForm({ ...proxyForm, enabled: checked })}
              />
              <Label>Enabled</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddProxy}>Add Proxy</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Dialog */}
      <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
        <DialogContent className='sm:max-w-2xl'>
          <DialogHeader>
            <DialogTitle>Bulk Import Proxies</DialogTitle>
            <DialogDescription>
              Paste one proxy per line. Supported formats: <code>host:port</code> or{' '}
              <code>host:port:username:password</code>.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4'>
            <div className='grid gap-4 md:grid-cols-3'>
              <div>
                <Label>Provider</Label>
                <CustomSelect
                  value={bulkForm.provider}
                  onChange={(val) => setBulkForm({ ...bulkForm, provider: val as any })}
                  staticOptions={[
                    { title: 'IP Royal', label: 'IP Royal', value: 'iproyal' },
                    { title: 'Proxy-Seller', label: 'Proxy-Seller', value: 'proxy-seller' },
                    { title: 'Bright Data', label: 'Bright Data', value: 'bright-data' },
                    { title: 'Custom', label: 'Custom', value: 'custom' }
                  ]}
                  showSearch={false}
                />
              </div>
              <div>
                <Label>Type</Label>
                <CustomSelect
                  value={bulkForm.type}
                  onChange={(val) => setBulkForm({ ...bulkForm, type: val as any })}
                  staticOptions={[
                    { title: 'SOCKS5', label: 'SOCKS5', value: 'socks5' },
                    { title: 'HTTP', label: 'HTTP', value: 'http' }
                  ]}
                  showSearch={false}
                />
              </div>
              <div className='flex items-end'>
                <div className='flex items-center gap-2 rounded-md border px-3 py-2 w-full'>
                  <Switch
                    checked={bulkForm.enabled}
                    onCheckedChange={(checked) => setBulkForm({ ...bulkForm, enabled: checked })}
                  />
                  <Label>Enabled</Label>
                </div>
              </div>
            </div>

            <div>
              <Label>Proxy List</Label>
              <Textarea
                value={bulkForm.proxiesText}
                onChange={(e) => setBulkForm({ ...bulkForm, proxiesText: e.target.value })}
                placeholder={`1.2.3.4:1080\n1.2.3.5:1080:user:pass\nproxy.example.com:8080`}
                className='min-h-[260px]'
              />
              <p className='text-xs text-muted-foreground mt-2'>
                One proxy per line. Existing duplicates will be skipped automatically.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setIsBulkDialogOpen(false)} disabled={isBulkImporting}>
              Cancel
            </Button>
            <Button onClick={handleBulkImport} disabled={isBulkImporting}>
              {isBulkImporting ? 'Importing...' : 'Import Proxies'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Proxy Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Edit Proxy</DialogTitle>
            <DialogDescription>Update proxy configuration</DialogDescription>
          </DialogHeader>
          <div className='space-y-4'>
            <div>
              <Label>Provider</Label>
              <CustomSelect
                value={proxyForm.provider}
                onChange={(val) => setProxyForm({ ...proxyForm, provider: val as any })}
                staticOptions={[
                  { title: 'IP Royal', label: 'IP Royal', value: 'iproyal' },
                  { title: 'Proxy-Seller', label: 'Proxy-Seller', value: 'proxy-seller' },
                  { title: 'Bright Data', label: 'Bright Data', value: 'bright-data' },
                  { title: 'Custom', label: 'Custom', value: 'custom' }
                ]}
                showSearch={false}
              />
            </div>
            <div>
              <Label>Host</Label>
              <Input
                value={proxyForm.host}
                onChange={(e) => setProxyForm({ ...proxyForm, host: e.target.value })}
                placeholder='proxy.example.com'
              />
            </div>
            <div>
              <Label>Port</Label>
              <Input
                type='number'
                value={proxyForm.port}
                onChange={(e) => setProxyForm({ ...proxyForm, port: e.target.value })}
                placeholder='1080'
              />
            </div>
            <div>
              <Label>Type</Label>
              <CustomSelect
                value={proxyForm.type}
                onChange={(val) => setProxyForm({ ...proxyForm, type: val as any })}
                staticOptions={[
                  { title: 'SOCKS5', label: 'SOCKS5', value: 'socks5' },
                  { title: 'HTTP', label: 'HTTP', value: 'http' }
                ]}
                showSearch={false}
              />
            </div>
            <div>
              <Label>Username (Optional)</Label>
              <Input
                value={proxyForm.username}
                onChange={(e) => setProxyForm({ ...proxyForm, username: e.target.value })}
                placeholder='username'
              />
            </div>
            <div>
              <Label>Password (Optional)</Label>
              <Input
                type='password'
                value={proxyForm.password}
                onChange={(e) => setProxyForm({ ...proxyForm, password: e.target.value })}
                placeholder='password'
              />
            </div>
            <div className='flex items-center gap-2'>
              <Switch
                checked={proxyForm.enabled}
                onCheckedChange={(checked) => setProxyForm({ ...proxyForm, enabled: checked })}
              />
              <Label>Enabled</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditProxy}>Update Proxy</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <Dialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Delete Selected Proxies</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedProxyIds.length} selected proxies? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={() => setIsBulkDeleteDialogOpen(false)} disabled={isBulkDeleting}>
              Cancel
            </Button>
            <Button variant='destructive' onClick={handleBulkDelete} disabled={isBulkDeleting}>
              {isBulkDeleting ? 'Deleting...' : 'Delete Selected'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Result Dialog */}
      <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Proxy Test Result</DialogTitle>
            <DialogDescription>
              {selectedProxy && `${selectedProxy.host}:${selectedProxy.port}`}
            </DialogDescription>
          </DialogHeader>
          {testResult && (
            <div className='space-y-2'>
              {testResult.success ? (
                <div className='text-green-500'>
                  <CheckCircle2 className='h-5 w-5 inline mr-2' />
                  Test Successful
                </div>
              ) : (
                <div className='text-red-500'>
                  <XCircle className='h-5 w-5 inline mr-2' />
                  Test Failed
                </div>
              )}
              {testResult.responseTime && (
                <div className='text-sm'>Response Time: {testResult.responseTime}ms</div>
              )}
              {testResult.externalIp && <div className='text-sm'>External IP: {testResult.externalIp}</div>}
              {testResult.country && <div className='text-sm'>Country: {testResult.country}</div>}
              {testResult.error && <div className='text-sm text-red-500'>Error: {testResult.error}</div>}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsTestDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function ProxyManagementPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProxyManagementList />
    </Suspense>
  )
}

