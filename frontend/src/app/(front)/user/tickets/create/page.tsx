'use client'

import CustomInput from '@/components/common/CustomInput'
import TicketImageUpload from '@/components/common/TicketImageUpload'
import { Typography } from '@/components/common/typography'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import useAsync from '@/hooks/useAsync'
import requests from '@/services/network/http'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle, Package } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

const ticketSchema = z.object({
  orderNumber: z
    .string()
    .min(1, 'Order ID is required')
    .max(100, 'Order ID is too long')
    .transform((value) => value.trim().toUpperCase()),
  subject: z
    .string()
    .min(5, 'Subject must be at least 5 characters long')
    .max(100, 'Subject must not exceed 100 characters'),
  description: z
    .string()
    .min(20, 'Description must be at least 20 characters long')
    .max(1000, 'Description must not exceed 1000 characters')
})

type TicketFormData = z.infer<typeof ticketSchema>

type OrderOption = {
  id: number
  orderNumber: string
  status: string
  deliveryStatus: string
  total: string | number
  createdAt: string
  product?: {
    name?: string
  }
}

export default function CreateTicketPage() {
  const { push } = useRouter()
  const searchParams = useSearchParams()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [attachments, setAttachments] = useState<string[]>([])

  const { data: orderResponse, loading: loadingOrders } = useAsync<{
    orders?: OrderOption[]
  }>(() => '/customer/orders?page=1&limit=100', true)

  const orders = useMemo(() => orderResponse?.orders ?? [], [orderResponse?.orders])

  const form = useForm<TicketFormData>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      orderNumber: '',
      subject: '',
      description: ''
    }
  })

  const selectedOrderNumber = form.watch('orderNumber')
  const selectedOrder = orders.find((order) => order.orderNumber === selectedOrderNumber)
  const hasOrders = orders.length > 0

  useEffect(() => {
    const requestedOrderNumber = searchParams.get('orderNumber')?.trim().toUpperCase()
    if (!requestedOrderNumber) return

    form.setValue('orderNumber', requestedOrderNumber, {
      shouldValidate: true,
      shouldDirty: false
    })
  }, [form, searchParams])

  const onSubmit = async (data: TicketFormData) => {
    setIsSubmitting(true)
    try {
      const response = await requests.post<{
        success: boolean
        message: string
      }>('/customer/tickets', { ...data, attachments })

      if (response.success) {
        toast.success(response.message || 'Ticket created successfully!')
        form.reset()
        setAttachments([])
        push('/user/tickets')
      } else {
        toast.error(response.message || 'Failed to create ticket')
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to create ticket. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className='space-y-6'>
      <div>
        <Typography variant='h4' weight='semibold'>
          Create Support Ticket
        </Typography>
        <Typography variant='body2' className='mt-1 text-muted-foreground'>
          Open a ticket for a specific order so support can review the exact purchase details.
        </Typography>
      </div>

      <Alert className='border-border bg-card/70'>
        <Package className='h-4 w-4 text-primary' />
        <AlertTitle>Order-linked support</AlertTitle>
        <AlertDescription className='text-muted-foreground'>
          Enter your order ID before opening a ticket. Your order information and client details
          will automatically appear inside the ticket conversation.
        </AlertDescription>
      </Alert>

      {!loadingOrders && !hasOrders ? (
        <Alert className='border-amber-500/20 bg-amber-500/10'>
          <AlertTriangle className='h-4 w-4 text-amber-500' />
          <AlertTitle>No eligible orders found</AlertTitle>
          <AlertDescription className='space-y-3 text-muted-foreground'>
            <p>You need at least one purchase on this account before opening a support ticket.</p>
            <Button variant='outline' onClick={() => push('/user/purchased-items')}>
              Open Purchased Items
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Ticket Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
            <Controller
              name='orderNumber'
              control={form.control}
              render={({ field, fieldState }) => (
                <CustomInput
                  label='Order ID'
                  placeholder='Enter your order ID, for example ORD-2026-000123'
                  required
                  disabled={isSubmitting || !hasOrders}
                  error={fieldState.error?.message}
                  helperText='Support tickets can only be opened for orders on this account.'
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                />
              )}
            />

            {hasOrders ? (
              <div className='space-y-3'>
                <p className='text-sm font-medium text-foreground'>Recent purchases</p>
                <div className='grid gap-3 md:grid-cols-2'>
                  {orders.slice(0, 6).map((order) => {
                    const isActive = selectedOrderNumber === order.orderNumber
                    return (
                      <button
                        key={order.id}
                        type='button'
                        onClick={() => form.setValue('orderNumber', order.orderNumber, { shouldValidate: true })}
                        className={`rounded-xl border p-4 text-left transition-colors ${
                          isActive
                            ? 'border-primary bg-primary/10'
                            : 'border-border bg-background hover:border-primary/40 hover:bg-muted/30'
                        }`}
                      >
                        <p className='font-semibold text-foreground'>{order.orderNumber}</p>
                        <p className='mt-1 text-sm text-muted-foreground'>
                          {order.product?.name || 'Order product'}
                        </p>
                        <p className='mt-2 text-xs text-muted-foreground'>
                          {order.status} · {order.deliveryStatus}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : null}

            {selectedOrder ? (
              <div className='rounded-xl border border-border bg-muted/20 p-4'>
                <p className='text-sm font-medium text-foreground'>Selected order</p>
                <div className='mt-2 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2'>
                  <p>
                    <span className='text-foreground'>Order:</span> {selectedOrder.orderNumber}
                  </p>
                  <p>
                    <span className='text-foreground'>Product:</span> {selectedOrder.product?.name || 'N/A'}
                  </p>
                  <p>
                    <span className='text-foreground'>Status:</span> {selectedOrder.status}
                  </p>
                  <p>
                    <span className='text-foreground'>Delivery:</span> {selectedOrder.deliveryStatus}
                  </p>
                </div>
              </div>
            ) : null}

            <Controller
              name='subject'
              control={form.control}
              render={({ field, fieldState }) => (
                <CustomInput
                  label='Subject'
                  placeholder='Brief description of your issue'
                  required
                  disabled={isSubmitting || !hasOrders}
                  error={fieldState.error?.message}
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                />
              )}
            />

            <Controller
              name='description'
              control={form.control}
              render={({ field, fieldState }) => (
                <CustomInput
                  label='Description'
                  type='textarea'
                  placeholder='Please provide detailed information about your issue, including the exact problem with this order.'
                  required
                  disabled={isSubmitting || !hasOrders}
                  error={fieldState.error?.message}
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  rows={6}
                />
              )}
            />

            <div>
              <span className='text-sm text-muted-foreground'>
                Attach images (optional, max 2MB each)
              </span>
              <TicketImageUpload
                value={attachments}
                onChange={setAttachments}
                isAdmin={false}
                className='mt-2'
                disabled={isSubmitting || !hasOrders}
              />
            </div>

            <div className='flex gap-3 pt-4'>
              <Button type='submit' disabled={isSubmitting || !hasOrders} className='flex-1 sm:flex-none'>
                {isSubmitting ? 'Creating Ticket...' : 'Create Ticket'}
              </Button>
              <Button
                type='button'
                variant='outline'
                onClick={() => push('/user/tickets')}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
