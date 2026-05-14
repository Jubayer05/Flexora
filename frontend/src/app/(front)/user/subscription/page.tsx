'use client'

import CustomLink from '@/components/common/CustomLink'
import { Typography } from '@/components/common/typography'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import useAsync from '@/hooks/useAsync'
import { formatSubscriptionTimeRemaining } from '@/hooks/useActiveSubscriptionDiscount'
import { showError } from '@/lib/errMsg'
import requests from '@/services/network/http'
import type {
  ActiveSubscription,
  SubscriptionPackage,
  SubscriptionPayment
} from '@/types/subscription'
import { format } from 'date-fns'
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Crown,
  Loader2,
  Package,
  RefreshCw,
  Sparkles,
  Star,
  X,
  Zap
} from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

interface SubscriptionResponse {
  success: boolean
  data: ActiveSubscription | null
}

interface PackagesResponse {
  success: boolean
  data: {
    data: SubscriptionPackage[]
  }
}

interface HistoryResponse {
  success: boolean
  data: {
    data: SubscriptionPayment[]
  }
}

interface PaymentMethodsResponse {
  success: boolean
  data: any[]
}

export default function UserSubscriptionPage() {
  const searchParams = useSearchParams()
  const packageIdParam = searchParams.get('package')

  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false)
  const [showRenewDialog, setShowRenewDialog] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null)
  const [selectedGateway, setSelectedGateway] = useState<string>('')

  // Fetch data with useAsync
  const {
    data: activeSubData,
    loading: activeLoading,
    mutate: refetchActive
  } = useAsync<SubscriptionResponse>(() => '/customer/subscriptions/active')

  const { data: packagesData } = useAsync<PackagesResponse>(
    () => '/subscription-packages?isActive=true'
  )

  const {
    data: historyData,
    loading: historyLoading,
    mutate: refetchHistory
  } = useAsync<HistoryResponse>(() => '/customer/subscriptions/history?page=1&limit=10')

  const { data: paymentMethodsData } =
    useAsync<PaymentMethodsResponse>(() => '/payment-methods')

  const activeSubscription = activeSubData?.data || null
  const availablePackages = packagesData?.data?.data || []
  const subscriptionHistory = historyData?.data?.data || []
  const paymentMethods = paymentMethodsData?.data || []
  const activeSubscriptionDuration = Number(activeSubscription?.package?.duration || 30)
  const activeSubscriptionRemaining = formatSubscriptionTimeRemaining(activeSubscription?.endDate)

  // Auto-select package if provided in URL
  useEffect(() => {
    if (packageIdParam) {
      setSelectedPackageId(parseInt(packageIdParam))
      setShowPurchaseDialog(true)
    }
  }, [packageIdParam])

  const handlePurchase = async () => {
    if (!selectedPackageId || !selectedGateway) {
      toast.error('Please select a package and payment method')
      return
    }

    try {
      setActionLoading(true)
      const response = await requests.post('/customer/subscriptions/purchase', {
        subscriptionPackageId: selectedPackageId,
        gateway: selectedGateway
      })

      toast.success(response.message || 'Subscription purchase initiated!')
      setShowPurchaseDialog(false)

      // Redirect to payment URL if provided
      if (response.data?.paymentUrl) {
        toast.info('Redirecting to payment gateway...')
        setTimeout(() => {
          window.location.href = response.data.paymentUrl
        }, 1000)
      } else {
        // For balance payments or immediate completion
        toast.success('Payment processed successfully!')
        // Refresh data
        await refetchActive()
        await refetchHistory()
      }
    } catch (error: any) {
      showError(error)
    } finally {
      setActionLoading(false)
    }
  }

  const handleRenew = async () => {
    if (!selectedGateway) {
      toast.error('Please select a payment method')
      return
    }

    try {
      setActionLoading(true)
      const response = await requests.post('/customer/subscriptions/renew', {
        gateway: selectedGateway
      })

      toast.success(response.message || 'Subscription renewal initiated!')
      setShowRenewDialog(false)

      // Redirect to payment URL if provided
      if (response.data?.paymentUrl) {
        toast.info('Redirecting to payment gateway...')
        setTimeout(() => {
          window.location.href = response.data.paymentUrl
        }, 1000)
      } else {
        // For balance payments or immediate completion
        toast.success('Payment processed successfully!')
        await refetchActive()
        await refetchHistory()
      }
    } catch (error: any) {
      showError(error)
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancel = async () => {
    try {
      setActionLoading(true)
      const response = await requests.post('/customer/subscriptions/cancel', {})

      toast.success(response.message || 'Subscription cancelled successfully')
      setShowCancelDialog(false)
      await refetchActive()
      await refetchHistory()
    } catch (error: any) {
      showError(error)
    } finally {
      setActionLoading(false)
    }
  }

  const getPackageIcon = (name: string) => {
    const nameLower = name.toLowerCase()
    if (nameLower.includes('premium') || nameLower.includes('pro')) return Crown
    if (nameLower.includes('elite') || nameLower.includes('vip')) return Star
    if (nameLower.includes('starter') || nameLower.includes('basic')) return Zap
    return Sparkles
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'text-green-600 dark:text-green-500'
      case 'PENDING':
        return 'text-yellow-600 dark:text-yellow-500'
      case 'FAILED':
        return 'text-red-600 dark:text-red-500'
      case 'REFUNDED':
        return 'text-muted-foreground'
      default:
        return 'text-muted-foreground'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return CheckCircle2
      case 'PENDING':
        return Clock
      case 'FAILED':
        return X
      case 'REFUNDED':
        return RefreshCw
      default:
        return AlertCircle
    }
  }

  return (
    <div className='mx-auto px-4 py-8 container max-w-6xl'>
      {/* Header - Render immediately for LCP */}
      <div className='mb-8'>
        <Typography variant='h3' weight='bold' className='mb-2'>
          My Subscription
        </Typography>
        <Typography variant='body1' className='text-muted-foreground'>
          Manage your subscription plan and payment history
        </Typography>
      </div>

      {/* Active Subscription Card */}
      {activeLoading ? (
        <Card className='mb-8 p-6'>
          <div className='flex sm:flex-row flex-col justify-between items-start gap-6'>
            <div className='flex-1'>
              <div className='flex items-center gap-3 mb-4'>
                <Skeleton className='w-8 h-8 rounded-lg' />
                <div className='flex-1'>
                  <Skeleton className='w-32 h-6 mb-2' />
                  <Skeleton className='w-24 h-4' />
                </div>
              </div>
              <div className='space-y-3'>
                <Skeleton className='w-full h-4' />
                <Skeleton className='w-full h-4' />
                <Skeleton className='w-full h-4' />
              </div>
            </div>
            <div className='flex sm:flex-col flex-row gap-3'>
              <Skeleton className='w-24 h-10' />
              <Skeleton className='w-24 h-10' />
            </div>
          </div>
        </Card>
      ) : activeSubscription ? (
        <Card className='mb-8 p-6'>
          <div className='flex sm:flex-row flex-col justify-between items-start gap-6'>
            <div className='flex-1'>
              <div className='flex items-center gap-3 mb-4'>
                {(() => {
                  const IconComponent = getPackageIcon(activeSubscription.package?.name || '')
                  return <IconComponent className='w-8 h-8 text-primary' />
                })()}
                <div>
                  <Typography variant='h5' weight='bold'>
                    {activeSubscription.package?.name || 'Subscription'}
                  </Typography>
                  <Typography variant='body2' className='text-muted-foreground'>
                    Active Subscription
                  </Typography>
                </div>
              </div>

              <div className='space-y-3'>
                <div className='flex items-center gap-2'>
                  <Package className='w-4 h-4 text-muted-foreground' />
                  <Typography variant='body2'>
                    <span className='font-semibold'>
                      {parseFloat(activeSubscription.package?.discount || '0').toFixed(0)}% OFF
                    </span>{' '}
                    on all orders
                  </Typography>
                </div>
                <div className='flex items-center gap-2'>
                  <Calendar className='w-4 h-4 text-muted-foreground' />
                  <Typography variant='body2'>
                    Discount valid for {activeSubscriptionDuration} days from purchase
                  </Typography>
                </div>
                <div className='flex items-center gap-2'>
                  <Calendar className='w-4 h-4 text-muted-foreground' />
                  <Typography variant='body2'>
                    Expires on{' '}
                    {activeSubscription.endDate &&
                      format(new Date(activeSubscription.endDate), 'MMM dd, yyyy')}
                  </Typography>
                </div>
                <div className='flex items-center gap-2'>
                  <Clock className='w-4 h-4 text-muted-foreground' />
                  <Typography variant='body2'>
                    {activeSubscriptionRemaining || `${activeSubscription.daysRemaining} days remaining`}
                  </Typography>
                </div>
              </div>
            </div>

            <div className='flex sm:flex-col flex-row gap-3'>
              <Button onClick={() => setShowRenewDialog(true)} variant='default'>
                <RefreshCw className='mr-2 w-4 h-4' />
                Renew
              </Button>
              <Button onClick={() => setShowCancelDialog(true)} variant='destructive'>
                Cancel
              </Button>
            </div>
          </div>

          {/* Warning if expiring soon */}
          {activeSubscription.daysRemaining <= 3 && (
            <div className='flex items-center gap-3 bg-yellow-500/10 mt-4 p-4 border border-yellow-500/20 rounded-lg'>
              <AlertCircle className='w-5 h-5 text-yellow-500' />
              <Typography variant='body2' className='text-yellow-700 dark:text-yellow-400'>
                Your subscription is expiring soon! Renew now to continue enjoying discounts.
              </Typography>
            </div>
          )}
        </Card>
      ) : (
        <Card className='mb-8 p-8 text-center'>
          <div className='flex justify-center mb-4'>
            <div className='flex justify-center items-center bg-primary/10 rounded-full w-16 h-16'>
              <Crown className='w-8 h-8 text-primary' />
            </div>
          </div>
          <Typography variant='h5' weight='bold' className='mb-2'>
            No Active Subscription
          </Typography>
          <Typography variant='body2' className='mb-6 text-muted-foreground'>
            Subscribe to a package and get discounts on all your orders
          </Typography>
          <div className='flex flex-col sm:flex-row justify-center gap-3'>
            <Button
              onClick={() => setShowPurchaseDialog(true)}
              className='w-full sm:w-auto'
            >
              <Sparkles className='mr-2 w-4 h-4' />
              Get a Subscription
            </Button>

            <CustomLink href='/subscription'>
              <Button variant='outline' className='w-full sm:w-auto'>
                Browse Packages
              </Button>
            </CustomLink>
          </div>
        </Card>
      )}

      {/* Subscription History */}
      <Card className='p-6'>
        <Typography variant='h5' weight='bold' className='mb-4'>
          Payment History
        </Typography>

        {historyLoading ? (
          <div className='space-y-3'>
            {[...Array(3)].map((_, i) => (
              <div key={i} className='flex justify-between items-center p-4 border rounded-lg'>
                <div className='flex items-center gap-4 flex-1'>
                  <Skeleton className='w-5 h-5 rounded-full' />
                  <div className='flex-1'>
                    <Skeleton className='w-40 h-4 mb-2' />
                    <Skeleton className='w-32 h-3' />
                  </div>
                </div>
                <div className='flex flex-col items-end gap-1'>
                  <Skeleton className='w-20 h-4' />
                  <Skeleton className='w-16 h-3' />
                </div>
              </div>
            ))}
          </div>
        ) : subscriptionHistory.length > 0 ? (
          <div className='space-y-3'>
            {subscriptionHistory.map((payment) => {
              const StatusIcon = getStatusIcon(payment.paymentStatus)
              const statusColor = getStatusColor(payment.paymentStatus)

              return (
                <div
                  key={payment.id}
                  className='flex justify-between items-center p-4 border rounded-lg'
                >
                  <div className='flex items-center gap-4'>
                    <div className={`${statusColor}`}>
                      <StatusIcon className='w-5 h-5' />
                    </div>
                    <div>
                      <Typography variant='body1' weight='medium'>
                        {payment.subscriptionPackage?.name || 'Subscription'}
                      </Typography>
                      <Typography variant='body2' className='text-muted-foreground'>
                        {format(new Date(payment.createdAt), 'MMM dd, yyyy')} •{' '}
                        {payment.paymentMethod?.name || 'Payment'}
                      </Typography>
                    </div>
                  </div>
                  <div className='flex flex-col items-end gap-1'>
                    <Typography variant='body1' weight='bold'>
                      ${parseFloat(payment.amount).toFixed(2)}
                    </Typography>
                    <Typography variant='body2' className={`${statusColor}`}>
                      {payment.paymentStatus}
                    </Typography>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className='py-8 text-center'>
            <CreditCard className='mx-auto mb-3 w-12 h-12 text-muted-foreground' />
            <Typography variant='body2' className='text-muted-foreground'>
              No payment history yet
            </Typography>
          </div>
        )}
      </Card>

      {/* Purchase Dialog */}
      <Dialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Purchase Subscription</DialogTitle>
            <DialogDescription>
              Choose a package and payment method. Subscription discount is valid for 30 days and
              applies automatically to all products.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 py-4'>
            <div>
              <Label htmlFor='package'>Subscription Package</Label>
              <Select
                value={selectedPackageId?.toString()}
                onValueChange={(value) => setSelectedPackageId(parseInt(value))}
              >
                <SelectTrigger id='package'>
                  <SelectValue placeholder='Select a package' />
                </SelectTrigger>
                <SelectContent>
                  {availablePackages.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id.toString()}>
                      {pkg.name} - ${parseFloat(pkg.price).toFixed(2)} (
                      {parseFloat(pkg.discount).toFixed(0)}% OFF for {pkg.duration || 30} days)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor='payment-method'>Payment Method</Label>
              <Select value={selectedGateway} onValueChange={(value) => setSelectedGateway(value)}>
                <SelectTrigger id='payment-method'>
                  <SelectValue placeholder='Select payment method' />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.id} value={method.gateway}>
                      {method.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={() => setShowPurchaseDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handlePurchase} disabled={actionLoading}>
              {actionLoading && <Loader2 className='mr-2 w-4 h-4 animate-spin' />}
              Purchase
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Renew Dialog */}
      <Dialog open={showRenewDialog} onOpenChange={setShowRenewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renew Subscription</DialogTitle>
            <DialogDescription>
              Select a payment method to renew your subscription
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 py-4'>
            <div>
              <Label htmlFor='renew-payment-method'>Payment Method</Label>
              <Select value={selectedGateway} onValueChange={(value) => setSelectedGateway(value)}>
                <SelectTrigger id='renew-payment-method'>
                  <SelectValue placeholder='Select payment method' />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.id} value={method.gateway}>
                      {method.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {activeSubscription && (
              <div className='bg-muted/50 p-4 rounded-lg'>
                <Typography variant='body2' className='text-muted-foreground'>
                  Renewal will extend your subscription for another{' '}
                  {availablePackages.find((p) => p.id === activeSubscription.package?.id)
                    ?.duration || 30}{' '}
                  days. Remaining time: {activeSubscriptionRemaining || 'active'}.
                </Typography>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={() => setShowRenewDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRenew} disabled={actionLoading}>
              {actionLoading && <Loader2 className='mr-2 w-4 h-4 animate-spin' />}
              Renew
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Subscription</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel your subscription? You will lose your discount
              immediately.
            </DialogDescription>
          </DialogHeader>

          <div className='bg-red-500/10 p-4 border border-red-500/20 rounded-lg'>
            <Typography variant='body2' className='text-red-600 dark:text-red-400'>
              This action cannot be undone. You will need to purchase a new subscription to get
              discounts again.
            </Typography>
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={() => setShowCancelDialog(false)}>
              Keep Subscription
            </Button>
            <Button variant='destructive' onClick={handleCancel} disabled={actionLoading}>
              {actionLoading && <Loader2 className='mr-2 w-4 h-4 animate-spin' />}
              Cancel Subscription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
