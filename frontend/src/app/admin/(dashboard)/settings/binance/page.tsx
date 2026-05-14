'use client'

import { useState, useEffect } from 'react'
import PageHeader from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { CustomTable } from '@/components/admin/common/data-table'
import useAsync from '@/hooks/useAsync'
import requests from '@/services/network/http'
import { showError } from '@/lib/errMsg'
import { toast } from 'sonner'
import { Loader2, CheckCircle2, XCircle, Settings, History, RefreshCw, AlertCircle, Shield } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Typography } from '@/components/common/typography'

interface BinanceConfig {
  session: {
    email: string | null
    isValid: boolean
    expiresAt: Date | null
    updatedAt: Date
    createdAt: Date
  } | null
  sessionValid: boolean
  stats: {
    recentLogsCount: number
    failedAttempts: number
  }
  credentialsConfigured: {
    email: boolean
    password: boolean
    totpSecret: boolean
  }
}

interface BinanceAuditLog {
  id: number
  type: string
  orderId: number | null
  paymentId: number | null
  binanceOrderId: string | null
  result: string
  userId: number | null
  ipAddress: string | null
  userAgent: string | null
  meta: any
  createdAt: string
  user?: {
    id: number
    email: string
    firstName: string | null
  } | null
}

interface AuditLogsResponse {
  logs: BinanceAuditLog[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export default function BinanceSettingsPage() {
  const [isTesting, setIsTesting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [testResult, setTestResult] = useState<{
    sessionValid: boolean
    error?: string
  } | null>(null)
  const [showTestDialog, setShowTestDialog] = useState(false)
  const [binanceEmail, setBinanceEmail] = useState('')
  const [cookiesText, setCookiesText] = useState('')
  const [logsPage, setLogsPage] = useState(1)
  const [logsFilter, setLogsFilter] = useState<'all' | 'ok' | 'failed'>('all')

  // Fetch current config
  const { data: configData, loading: configLoading, mutate: refetchConfig } = useAsync<{
    data: BinanceConfig
  }>(() => '/admin/binance/config', true) // Auto-refetch on mount

  // Fetch audit logs
  const { data: logsData, loading: logsLoading, mutate: refetchLogs } = useAsync<{
    data: AuditLogsResponse
  }>(
    () => `/admin/binance/audit-logs?page=${logsPage}&limit=20${logsFilter !== 'all' ? `&result=${logsFilter === 'ok' ? 'ok' : 'not_ok'}` : ''}`
  )

  // Fetch bootstrap status
  const { data: bootstrapData, loading: bootstrapLoading } = useAsync<{
    data: {
      sessionValid: boolean
      hasCredentials: boolean
      instructions: string
      command: string
    }
  }>(() => '/admin/binance/bootstrap-status')

  const config = configData?.data
  const logs = logsData?.data?.logs || []
  const pagination = logsData?.data?.pagination

  const handleTestSession = async () => {
    setIsTesting(true)
    setTestResult(null)
    try {
      const response = await requests.post<{
        data: {
          sessionValid: boolean
        }
      }>('/admin/binance/test-session', {})

      setTestResult(response.data)
      setShowTestDialog(true)
      // Refresh config after testing
      refetchConfig()
    } catch (error: any) {
      showError(error)
      setTestResult({
        sessionValid: false,
        error: error.message || 'Failed to test session'
      })
      setShowTestDialog(true)
      // Refresh config even on error to get latest status
      refetchConfig()
    } finally {
      setIsTesting(false)
    }
  }

  const handleImportSession = async () => {
    if (!cookiesText.trim()) {
      toast.error('Please paste Binance cookies first')
      return
    }

    setIsImporting(true)
    try {
      const response = await requests.post<{
        message?: string
        data?: { savedCookies: number }
      }>('/admin/binance/import-session', {
        email: binanceEmail.trim() || undefined,
        cookiesText
      })

      toast.success(
        response?.message ||
          `Binance session imported successfully (${response?.data?.savedCookies || 0} cookies)`
      )
      setCookiesText('')
      refetchConfig()
      refetchLogs()
    } catch (error: any) {
      showError(error)
    } finally {
      setIsImporting(false)
    }
  }

  const getResultBadge = (result: string) => {
    const variants: Record<string, { variant: 'default' | 'destructive' | 'secondary'; label: string }> = {
      ok: { variant: 'default', label: 'Success' },
      payment_not_found: { variant: 'destructive', label: 'Payment Not Found' },
      already_completed: { variant: 'secondary', label: 'Already Completed' },
      invalid_status: { variant: 'destructive', label: 'Invalid Status' },
      invalid_format: { variant: 'destructive', label: 'Invalid Format' },
      duplicate_order_id: { variant: 'destructive', label: 'Duplicate Order ID' },
      ORDER_NOT_FOUND: { variant: 'destructive', label: 'Order Not Found' },
      AMOUNT_MISMATCH: { variant: 'destructive', label: 'Amount Mismatch' },
      RECIPIENT_MISMATCH: { variant: 'destructive', label: 'Recipient Mismatch' },
      session_expired: { variant: 'destructive', label: 'Session Expired' },
      verification_error: { variant: 'destructive', label: 'Verification Error' },
      verification_failed: { variant: 'destructive', label: 'Verification Failed' }
    }

    const variant = variants[result] || { variant: 'secondary' as const, label: result }
    return (
      <Badge variant={variant.variant} className='text-xs'>
        {variant.label}
      </Badge>
    )
  }

  const logColumns = [
    {
      key: 'createdAt',
      header: 'Date & Time',
      render: (value: string) => (
        <span className='text-sm text-muted-foreground'>
          {new Date(value).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </span>
      )
    },
    {
      key: 'type',
      header: 'Type',
      render: (value: string) => (
        <Badge variant='outline' className='bg-blue-500/10 text-blue-500 border-blue-500/20'>
          {value}
        </Badge>
      )
    },
    {
      key: 'binanceOrderId',
      header: 'Binance Order ID',
      render: (value: string | null) => (
        <span className='text-sm font-mono text-muted-foreground'>{value || 'N/A'}</span>
      )
    },
    {
      key: 'result',
      header: 'Result',
      render: (_: any, log: BinanceAuditLog) => getResultBadge(log.result)
    },
    {
      key: 'user',
      header: 'User',
      render: (_: any, log: BinanceAuditLog) => (
        <div>
          {log.user ? (
            <>
              <div className='text-sm font-medium'>{log.user.email}</div>
              {log.user.firstName && (
                <div className='text-xs text-muted-foreground'>{log.user.firstName}</div>
              )}
            </>
          ) : (
            <span className='text-sm text-muted-foreground'>Guest</span>
          )}
        </div>
      )
    },
    {
      key: 'ipAddress',
      header: 'IP Address',
      render: (value: string | null) => (
        <span className='text-sm font-mono text-muted-foreground'>{value || 'N/A'}</span>
      )
    }
  ]

  if (configLoading || bootstrapLoading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <Loader2 className='h-8 w-8 animate-spin text-primary' />
      </div>
    )
  }

  return (
    <div className='space-y-6 text-foreground'>
      <PageHeader
        title='Binance Payment Settings'
        subTitle='Configure and manage Binance internal transfer payment verification'
        extra={
          <div className='flex items-center gap-2'>
            <Button variant='outline' onClick={handleTestSession} disabled={isTesting}>
              {isTesting ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Testing...
                </>
              ) : (
                <>
                  <CheckCircle2 className='mr-2 h-4 w-4' />
                  Test Session
                </>
              )}
            </Button>
          </div>
        }
      />

      {/* Session Status Card */}
      <Card className='border-border'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-foreground'>
            <Shield className='h-5 w-5' />
            Session Status
          </CardTitle>
          <CardDescription className='text-foreground/80'>
            Binance login session status and configuration
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            {/* Session Status */}
            <div className='space-y-2'>
              <Typography variant='body2' className='text-foreground/80'>
                Session Status
              </Typography>
              <div className='flex items-center gap-2'>
                {config?.sessionValid ? (
                  <>
                    <CheckCircle2 className='h-5 w-5 text-green-500' />
                    <Badge className='bg-green-500/10 text-green-500 border-green-500/20'>
                      Active
                    </Badge>
                  </>
                ) : (
                  <>
                    <XCircle className='h-5 w-5 text-red-500' />
                    <Badge className='bg-red-500/10 text-red-500 border-red-500/20'>
                      Not Configured
                    </Badge>
                  </>
                )}
              </div>
            </div>

            {/* Session Email */}
            {config?.session?.email && (
              <div className='space-y-2'>
                <Typography variant='body2' className='text-foreground/80'>
                  Binance Email
                </Typography>
                <Typography variant='body1' className='text-foreground'>
                  {config.session.email}
                </Typography>
              </div>
            )}

            {/* Session Expiry */}
            {config?.session?.expiresAt && (
              <div className='space-y-2'>
                <Typography variant='body2' className='text-foreground/80'>
                  Session Expires
                </Typography>
                <Typography variant='body1' className='text-foreground'>
                  {new Date(config.session.expiresAt).toLocaleString()}
                </Typography>
              </div>
            )}

            {/* Last Updated */}
            {config?.session?.updatedAt && (
              <div className='space-y-2'>
                <Typography variant='body2' className='text-foreground/80'>
                  Last Updated
                </Typography>
                <Typography variant='body1' className='text-foreground'>
                  {new Date(config.session.updatedAt).toLocaleString()}
                </Typography>
              </div>
            )}
          </div>

          {/* Credentials Status */}
          <div className='pt-4 border-t border-border'>
            <Typography variant='body2' className='text-foreground/80 mb-2'>
              Credentials Configuration
            </Typography>
            <div className='flex flex-wrap gap-2'>
              {config?.credentialsConfigured.email ? (
                <Badge className='bg-green-500/10 text-green-500 border-green-500/20'>
                  <CheckCircle2 className='mr-1 h-3 w-3' />
                  Email Configured
                </Badge>
              ) : (
                <Badge variant='destructive'>
                  <XCircle className='mr-1 h-3 w-3' />
                  Email Missing
                </Badge>
              )}
              {config?.credentialsConfigured.password ? (
                <Badge className='bg-green-500/10 text-green-500 border-green-500/20'>
                  <CheckCircle2 className='mr-1 h-3 w-3' />
                  Password Configured
                </Badge>
              ) : (
                <Badge variant='destructive'>
                  <XCircle className='mr-1 h-3 w-3' />
                  Password Missing
                </Badge>
              )}
              {config?.credentialsConfigured.totpSecret ? (
                <Badge className='bg-green-500/10 text-green-500 border-green-500/20'>
                  <CheckCircle2 className='mr-1 h-3 w-3' />
                  TOTP Secret Configured
                </Badge>
              ) : (
                <Badge variant='destructive'>
                  <XCircle className='mr-1 h-3 w-3' />
                  TOTP Secret Missing
                </Badge>
              )}
            </div>
          </div>

          {/* Bootstrap Instructions */}
          <div className='pt-4 border-t border-border'>
            <div className='bg-blue-500/10 border border-blue-500/20 rounded-lg p-4'>
              <div className='flex items-start gap-3'>
                <AlertCircle className='h-5 w-5 text-blue-500 mt-0.5' />
                <div className='flex-1'>
                  <Typography variant='body2' className='font-semibold text-foreground mb-1'>
                    Bootstrap Login Required
                  </Typography>
                  <Typography variant='body2' className='text-foreground/80 mb-3'>
                    {bootstrapData?.data?.instructions || 'Configure credentials in .env file and run bootstrap script'}
                  </Typography>
                  {bootstrapData?.data?.hasCredentials && (
                    <div className='bg-muted rounded p-3 font-mono text-sm text-foreground'>
                      {bootstrapData.data.command}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Card */}
      <Card className='border-border'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-foreground'>
            <Settings className='h-5 w-5' />
            Update Session From UI
          </CardTitle>
          <CardDescription className='text-foreground/80'>
            For non-technical users: export Binance cookies from browser and paste here to refresh
            session without running terminal scripts.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Typography variant='body2' className='text-foreground/80'>
                Binance Email (optional)
              </Typography>
              <Input
                placeholder='client@company.com'
                value={binanceEmail}
                onChange={(e) => setBinanceEmail(e.target.value)}
              />
            </div>
          </div>

          <div className='space-y-2'>
            <Typography variant='body2' className='text-foreground/80'>
              Cookies (JSON array or Netscape format)
            </Typography>
            <Textarea
              value={cookiesText}
              onChange={(e) => setCookiesText(e.target.value)}
              placeholder='Paste cookies exported from Binance browser session...'
              className='min-h-44 font-mono text-xs'
            />
          </div>

          <div className='flex flex-wrap items-center gap-2'>
            <Button onClick={handleImportSession} disabled={isImporting || !cookiesText.trim()}>
              {isImporting ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Importing...
                </>
              ) : (
                'Import Session'
              )}
            </Button>
            <Button
              variant='outline'
              onClick={() => {
                setCookiesText('')
                setBinanceEmail('')
              }}
              disabled={isImporting}
            >
              Clear
            </Button>
          </div>

          <div className='rounded-lg border border-border bg-muted/40 p-3 text-sm text-foreground/80'>
            After importing, click <span className='font-semibold text-foreground'>Test Session</span> above.
          </div>
        </CardContent>
      </Card>

      {/* Statistics Card */}
      <Card className='border-border'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-foreground'>
            <History className='h-5 w-5' />
            Verification Statistics
          </CardTitle>
          <CardDescription className='text-foreground/80'>
            Recent verification activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='bg-muted/30 border border-border rounded-lg p-4'>
              <Typography variant='body2' className='text-foreground/80 mb-1'>
                Last 24 Hours
              </Typography>
              <Typography variant='h3' className='text-foreground font-bold'>
                {config?.stats.recentLogsCount || 0}
              </Typography>
              <Typography variant='caption' className='text-foreground/75'>
                Total Verification Attempts
              </Typography>
            </div>
            <div className='bg-muted/30 border border-border rounded-lg p-4'>
              <Typography variant='body2' className='text-foreground/80 mb-1'>
                Failed Attempts
              </Typography>
              <Typography variant='h3' className='text-red-500 font-bold'>
                {config?.stats.failedAttempts || 0}
              </Typography>
              <Typography variant='caption' className='text-foreground/75'>
                Last 24 Hours
              </Typography>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Card */}
      <Card className='border-border'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-foreground'>
            <History className='h-5 w-5' />
            Audit Logs
          </CardTitle>
          <CardDescription className='text-foreground/80'>
            View all Binance payment verification attempts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filter */}
          <div className='flex items-center gap-2 mb-4'>
            <Button
              variant={logsFilter === 'all' ? 'default' : 'outline'}
              size='sm'
              onClick={() => setLogsFilter('all')}
            >
              All
            </Button>
            <Button
              variant={logsFilter === 'ok' ? 'default' : 'outline'}
              size='sm'
              onClick={() => setLogsFilter('ok')}
            >
              Success
            </Button>
            <Button
              variant={logsFilter === 'failed' ? 'default' : 'outline'}
              size='sm'
              onClick={() => setLogsFilter('failed')}
            >
              Failed
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={() => refetchLogs()}
            >
              <RefreshCw className='h-4 w-4' />
            </Button>
          </div>

          {logsLoading ? (
            <div className='flex items-center justify-center py-8'>
              <Loader2 className='h-6 w-6 animate-spin text-primary' />
            </div>
          ) : logs.length > 0 ? (
            <>
              <CustomTable
                columns={logColumns}
                data={logs}
                getRowId={(row: BinanceAuditLog) => row.id.toString()}
                emptyMessage='No audit logs found'
              />
              {pagination && pagination.totalPages > 1 && (
                <div className='flex items-center justify-between mt-4'>
                  <div className='text-sm text-foreground/80'>
                    Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                  </div>
                  <div className='flex gap-2'>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => setLogsPage((p) => Math.max(1, p - 1))}
                      disabled={logsPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => setLogsPage((p) => p + 1)}
                      disabled={logsPage >= pagination.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className='text-center py-8 text-foreground/80'>No audit logs found</div>
          )}
        </CardContent>
      </Card>

      {/* Test Session Dialog */}
      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent className='bg-background border-border text-foreground'>
          <DialogHeader>
            <DialogTitle>Session Test Result</DialogTitle>
            <DialogDescription className='text-foreground/80'>
              Binance session connection test result
            </DialogDescription>
          </DialogHeader>
          {testResult && (
            <div className='space-y-4 py-4'>
              <div className='flex items-center justify-between'>
                <span className='text-foreground/80'>Session Valid:</span>
                {testResult.sessionValid ? (
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

