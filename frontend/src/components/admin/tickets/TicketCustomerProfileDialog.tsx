'use client'

import ManageFundsForm from '@/components/admin/form/ManageFundsForm'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import useAsync from '@/hooks/useAsync'
import { useConfirmationModal } from '@/hooks/useConfirmationModal'
import { showError } from '@/lib/errMsg'
import requests from '@/services/network/http'
import { Ban, ExternalLink, ShoppingBag, UserRound, Wallet } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

type TicketCustomerProfileResponse = {
  data: {
    ticketId: number
    ticketNumber: string
    customer: {
      type: 'registered' | 'guest'
      id: number | null
      displayName: string
      email: string | null
      phone: string | null
      telegramUsername: string | null
      photoUrl: string | null
      isBanned: boolean
      isVerified: boolean
      balance: number
      totalOrders: number
      totalSpent: number
      rank: string | null
      canManageFunds: boolean
      canBan: boolean
      canEmail: boolean
      canOpenCustomer: boolean
    }
    purchases: Array<{
      id: number
      orderNumber: string
      status: string
      deliveryStatus: string
      total: number
      subtotal: number
      discount: number
      quantity: number
      createdAt: string
      product: {
        id: number
        name: string
        platform: string | null
        sku: string | null
        type: string | null
        thumbnail: string | null
      }
      telegramTransfer?: {
        id: number
        status: string
        customerTelegram: string | null
        targetUrl: string
        joinVerified: boolean
        transferCompletedAt: string | null
        createdAt: string
        isTelegramProduct: true
      } | null
    }>
  }
}

interface TicketCustomerProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ticketId: number
}

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2
})

const formatDate = (value: string) =>
  new Date(value).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

export default function TicketCustomerProfileDialog({
  open,
  onOpenChange,
  ticketId
}: TicketCustomerProfileDialogProps) {
  const router = useRouter()
  const [manageFundsOpen, setManageFundsOpen] = useState(false)

  const {
    data,
    loading,
    mutate
  } = useAsync<TicketCustomerProfileResponse>(
    () => (open ? `/admin/tickets/${ticketId}/customer-profile` : null),
    open,
    false,
    true,
    1000 * 60
  )

  const profile = data?.data
  const customer = profile?.customer
  const purchases = profile?.purchases || []

  const spendStats = useMemo(() => {
    const telegramCount = purchases.filter((purchase) => purchase.telegramTransfer).length
    return {
      telegramCount,
      totalOrders: customer?.totalOrders || purchases.length,
      totalSpent: customer?.totalSpent || 0
    }
  }, [customer?.totalOrders, customer?.totalSpent, purchases])

  const banModal = useConfirmationModal({
    title: customer?.isBanned ? 'Unban Customer' : 'Ban Customer',
    description: customer?.isBanned
      ? 'This customer will regain access to the platform.'
      : 'This customer will lose access to the platform until unbanned.',
    confirmText: customer?.isBanned ? 'Unban' : 'Ban',
    cancelText: 'Cancel',
    variant: customer?.isBanned ? 'default' : 'destructive',
    icon: Ban,
    showInput: !customer?.isBanned,
    inputConfig: customer?.isBanned
      ? undefined
      : {
          name: 'reason',
          label: 'Ban Reason',
          placeholder: 'Enter ban reason',
          type: 'textarea',
          required: true
        }
  })

  const handleBanToggle = () => {
    if (!customer?.id || !customer.canBan) return

    banModal.openModal(async (inputData) => {
      try {
        if (customer.isBanned) {
          await requests.post(`/admin/customers/${customer.id}/unban`, {})
          toast.success('Customer unbanned successfully!')
        } else {
          await requests.post(`/admin/customers/${customer.id}/ban`, {
            reason: inputData?.reason || 'Banned from ticket profile'
          })
          toast.success('Customer banned successfully!')
        }
        mutate()
      } catch (error) {
        showError(error)
        throw error
      }
    })
  }

  const openCustomerPage = () => {
    if (!customer?.email) return
    router.push(`/admin/customers/customers-list?search=${encodeURIComponent(customer.email)}`)
  }

  return (
    <>
      <banModal.ModalComponent />

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className='max-h-[90vh] overflow-hidden sm:max-w-6xl'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-3 text-xl'>
              <div className='rounded-lg bg-primary/10 p-2 text-primary'>
                <UserRound className='h-5 w-5' />
              </div>
              <div>
                <div>Customer Profile</div>
                <div className='mt-1 text-sm font-normal text-muted-foreground'>
                  {profile?.ticketNumber ? `Ticket #${profile.ticketNumber}` : 'Support context'}
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className='custom-scrollbar space-y-6 overflow-y-auto pr-1'>
            {loading ? (
              <div className='flex min-h-[280px] items-center justify-center'>
                <div className='text-center'>
                  <div className='mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent' />
                  <p className='text-sm text-muted-foreground'>Loading customer profile...</p>
                </div>
              </div>
            ) : !profile || !customer ? (
              <div className='rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground'>
                Unable to load customer profile.
              </div>
            ) : (
              <>
                <div className='grid gap-4 xl:grid-cols-[1.1fr_0.9fr]'>
                  <div className='rounded-xl border border-border bg-card p-5'>
                    <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
                      <div>
                        <div className='flex items-center gap-2'>
                          <h3 className='text-2xl font-semibold text-foreground'>
                            {customer.displayName}
                          </h3>
                          <Badge variant='outline'>{customer.type}</Badge>
                          {customer.isBanned ? (
                            <Badge variant='destructive'>Banned</Badge>
                          ) : (
                            <Badge className='bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10'>
                              Active
                            </Badge>
                          )}
                        </div>
                        <p className='mt-1 text-sm text-muted-foreground'>
                          {customer.email || 'No email available'}
                        </p>
                      </div>

                      <div className='flex flex-wrap gap-2'>
                        {customer.canManageFunds ? (
                          <Button variant='outline' size='sm' onClick={() => setManageFundsOpen(true)}>
                            <Wallet className='mr-2 h-4 w-4' />
                            Add Balance
                          </Button>
                        ) : null}
                        {customer.canBan ? (
                          <Button
                            variant={customer.isBanned ? 'outline' : 'destructive'}
                            size='sm'
                            onClick={handleBanToggle}
                          >
                            <Ban className='mr-2 h-4 w-4' />
                            {customer.isBanned ? 'Unban' : 'Ban'}
                          </Button>
                        ) : null}
                        {customer.canOpenCustomer ? (
                          <Button variant='outline' size='sm' onClick={openCustomerPage}>
                            <ExternalLink className='mr-2 h-4 w-4' />
                            Open Customer
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    <div className='mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
                      <div className='rounded-lg border border-border bg-muted/20 p-4'>
                        <div className='text-xs uppercase tracking-wide text-muted-foreground'>
                          Rank
                        </div>
                        <div className='mt-2 text-lg font-semibold'>
                          {customer.rank || 'No rank'}
                        </div>
                      </div>
                      <div className='rounded-lg border border-border bg-muted/20 p-4'>
                        <div className='text-xs uppercase tracking-wide text-muted-foreground'>
                          Total Spent
                        </div>
                        <div className='mt-2 text-lg font-semibold'>
                          {currency.format(spendStats.totalSpent)}
                        </div>
                      </div>
                      <div className='rounded-lg border border-border bg-muted/20 p-4'>
                        <div className='text-xs uppercase tracking-wide text-muted-foreground'>
                          Orders
                        </div>
                        <div className='mt-2 text-lg font-semibold'>{spendStats.totalOrders}</div>
                      </div>
                      <div className='rounded-lg border border-border bg-muted/20 p-4'>
                        <div className='text-xs uppercase tracking-wide text-muted-foreground'>
                          Balance
                        </div>
                        <div className='mt-2 text-lg font-semibold'>
                          {currency.format(customer.balance || 0)}
                        </div>
                      </div>
                    </div>

                    <div className='mt-5 grid gap-4 md:grid-cols-2'>
                      <div className='rounded-lg border border-border bg-card p-4'>
                        <div className='mb-3 text-sm font-medium text-foreground'>Customer Info</div>
                        <div className='space-y-2 text-sm text-muted-foreground'>
                          <div>
                            <span className='text-foreground'>Email:</span> {customer.email || '-'}
                          </div>
                          <div>
                            <span className='text-foreground'>Phone:</span> {customer.phone || '-'}
                          </div>
                          <div>
                            <span className='text-foreground'>Telegram:</span>{' '}
                            {customer.telegramUsername || '-'}
                          </div>
                          <div>
                            <span className='text-foreground'>Verified:</span>{' '}
                            {customer.isVerified ? 'Yes' : 'No'}
                          </div>
                        </div>
                      </div>

                      <div className='rounded-lg border border-border bg-card p-4'>
                        <div className='mb-3 text-sm font-medium text-foreground'>Quick Summary</div>
                        <div className='space-y-2 text-sm text-muted-foreground'>
                          <div>
                            <span className='text-foreground'>Telegram purchases:</span>{' '}
                            {spendStats.telegramCount}
                          </div>
                          <div>
                            <span className='text-foreground'>Profile type:</span> {customer.type}
                          </div>
                          <div>
                            <span className='text-foreground'>Email action:</span>{' '}
                            {customer.canEmail ? 'Available' : 'Not available'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className='rounded-xl border border-border bg-card p-5'>
                    <div className='mb-4 flex items-center gap-2 text-foreground'>
                      <ShoppingBag className='h-4 w-4 text-primary' />
                      <h3 className='font-semibold'>Purchases</h3>
                    </div>
                    <div className='space-y-3'>
                      <div className='grid gap-3 sm:grid-cols-3'>
                        <div className='rounded-lg border border-border bg-muted/20 p-4'>
                          <div className='text-xs uppercase tracking-wide text-muted-foreground'>
                            Total Orders
                          </div>
                          <div className='mt-2 text-xl font-semibold'>{spendStats.totalOrders}</div>
                        </div>
                        <div className='rounded-lg border border-border bg-muted/20 p-4'>
                          <div className='text-xs uppercase tracking-wide text-muted-foreground'>
                            Telegram
                          </div>
                          <div className='mt-2 text-xl font-semibold'>{spendStats.telegramCount}</div>
                        </div>
                        <div className='rounded-lg border border-border bg-muted/20 p-4'>
                          <div className='text-xs uppercase tracking-wide text-muted-foreground'>
                            Spend
                          </div>
                          <div className='mt-2 text-xl font-semibold'>
                            {currency.format(spendStats.totalSpent)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className='rounded-xl border border-border bg-card p-5'>
                  <div className='mb-4 flex items-center justify-between gap-2'>
                    <div>
                      <h3 className='font-semibold text-foreground'>All Purchases</h3>
                      <p className='mt-1 text-sm text-muted-foreground'>
                        Order IDs, details, and Telegram purchase context.
                      </p>
                    </div>
                  </div>

                  {purchases.length === 0 ? (
                    <div className='rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground'>
                      No purchases found for this customer.
                    </div>
                  ) : (
                    <div className='space-y-3'>
                      {purchases.map((purchase) => (
                        <div
                          key={purchase.id}
                          className='rounded-lg border border-border bg-muted/10 p-4'
                        >
                          <div className='flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'>
                            <div className='min-w-0'>
                              <div className='flex flex-wrap items-center gap-2'>
                                <button
                                  type='button'
                                  className='font-semibold text-primary hover:underline'
                                  onClick={() => router.push(`/admin/orders/${purchase.id}`)}
                                >
                                  #{purchase.orderNumber}
                                </button>
                                <Badge variant='outline'>{purchase.status}</Badge>
                                <Badge variant='outline'>{purchase.deliveryStatus}</Badge>
                                {purchase.telegramTransfer ? (
                                  <Badge className='bg-blue-500/10 text-blue-600 hover:bg-blue-500/10'>
                                    Telegram
                                  </Badge>
                                ) : null}
                              </div>
                              <div className='mt-2 text-sm font-medium text-foreground'>
                                {purchase.product?.name || 'Unknown product'}
                              </div>
                              <div className='mt-1 text-sm text-muted-foreground'>
                                SKU: {purchase.product?.sku || 'N/A'} · Qty: {purchase.quantity} ·{' '}
                                {formatDate(purchase.createdAt)}
                              </div>
                              {purchase.telegramTransfer ? (
                                <div className='mt-2 text-sm text-muted-foreground'>
                                  Telegram ID: {purchase.telegramTransfer.customerTelegram || '-'} ·
                                  Transfer status: {purchase.telegramTransfer.status}
                                </div>
                              ) : null}
                            </div>

                            <div className='flex shrink-0 flex-col items-start gap-2 text-sm lg:items-end'>
                              <div className='font-semibold text-foreground'>
                                {currency.format(purchase.total)}
                              </div>
                              {purchase.discount > 0 ? (
                                <div className='text-green-600'>
                                  Discount: {currency.format(purchase.discount)}
                                </div>
                              ) : null}
                              <Button
                                variant='outline'
                                size='sm'
                                onClick={() => router.push(`/admin/orders/${purchase.id}`)}
                              >
                                View Order
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={manageFundsOpen} onOpenChange={setManageFundsOpen}>
        <DialogContent className='sm:max-w-2xl'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <Wallet className='h-5 w-5 text-primary' />
              Manage Balance
            </DialogTitle>
          </DialogHeader>
          {customer?.id ? (
            <ManageFundsForm
              customer={{
                id: customer.id,
                email: customer.email || '',
                firstName: customer.displayName
              } as any}
              onClose={() => setManageFundsOpen(false)}
              onSuccess={() => {
                setManageFundsOpen(false)
                mutate()
              }}
            />
          ) : (
            <div className='rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground'>
              Balance actions are only available for registered customers.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
