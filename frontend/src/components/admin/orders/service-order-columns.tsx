'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { TableCell } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import CustomInput from '@/components/common/CustomInput'
import StatusBadge from '@/components/common/StatusBadge'
import { getStatusColor } from '@/components/ui/custom-badge'
import useAsync from '@/hooks/useAsync'
import requests from '@/services/network/http'
import { format } from 'date-fns'
import {
  CheckCircle,
  Clock,
  MoreVertical,
  XCircle,
  User,
  Package,
  Mail,
  FileText,
  MessageSquare,
  Calendar
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import type { TableColumn } from '@/components/admin/common/data-table'

interface ServiceOrderFulfillmentDialogProps {
  order: Order
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

function ServiceOrderFulfillmentDialog({
  order,
  isOpen,
  onClose,
  onSuccess
}: ServiceOrderFulfillmentDialogProps) {
  const [status, setStatus] = useState<'COMPLETED' | 'CANCELLED' | 'IN_PROGRESS'>('COMPLETED')
  const [fulfillmentNotes, setFulfillmentNotes] = useState('')
  const [notifyCustomer, setNotifyCustomer] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!status) {
      toast.error('Please select a status')
      return
    }

    setIsSubmitting(true)
    try {
      await requests.put(`/admin/orders/${order.id}/service-fulfillment`, {
        status,
        fulfillmentNotes: fulfillmentNotes.trim() || undefined,
        notifyCustomer
      })

      toast.success(`Service order ${status.toLowerCase()} successfully`)
      onSuccess()
      onClose()
      // Reset form
      setStatus('COMPLETED')
      setFulfillmentNotes('')
      setNotifyCustomer(true)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update service order')
    } finally {
      setIsSubmitting(false)
    }
  }

  const fulfillmentStatus = (order.meta as any)?.serviceFulfillment?.status || order.status

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>Update Service Order Fulfillment</DialogTitle>
          <DialogDescription>
            Update the fulfillment status for order {order.orderNumber}
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4 py-4'>
          {/* Order Info */}
          <div className='p-4 bg-muted/50 rounded-lg border'>
            <div className='grid grid-cols-2 gap-4 text-sm'>
              <div>
                <span className='text-muted-foreground'>Order Number:</span>
                <p className='font-medium'>{order.orderNumber}</p>
              </div>
              <div>
                <span className='text-muted-foreground'>Product:</span>
                <p className='font-medium'>{order.product?.name || 'N/A'}</p>
              </div>
              <div>
                <span className='text-muted-foreground'>Customer:</span>
                <p className='font-medium'>
                  {order.user?.firstName || order.customerName || order.guestEmail || 'N/A'}
                </p>
              </div>
              <div>
                <span className='text-muted-foreground'>Current Status:</span>
                <p className='font-medium'>
                  <StatusBadge status={fulfillmentStatus} />
                </p>
              </div>
            </div>
          </div>

          {/* Client Input */}
          {(order.meta as any)?.clientInput && (
            <div className='p-4 bg-blue-500/10 rounded-lg border border-blue-500/20'>
              <div className='flex items-center gap-2 mb-2'>
                <FileText className='w-4 h-4 text-blue-400' />
                <span className='text-sm font-medium'>Client Input:</span>
              </div>
              <p className='text-sm text-muted-foreground'>{(order.meta as any).clientInput}</p>
            </div>
          )}

          {/* Status Selection */}
          <div className='space-y-2'>
            <label className='text-sm font-medium'>Update Status</label>
            <div className='grid grid-cols-3 gap-2'>
              <Button
                type='button'
                variant={status === 'IN_PROGRESS' ? 'default' : 'outline'}
                onClick={() => setStatus('IN_PROGRESS')}
                className='flex items-center gap-2'
              >
                <Clock className='w-4 h-4' />
                In Progress
              </Button>
              <Button
                type='button'
                variant={status === 'COMPLETED' ? 'default' : 'outline'}
                onClick={() => setStatus('COMPLETED')}
                className='flex items-center gap-2'
              >
                <CheckCircle className='w-4 h-4' />
                Completed
              </Button>
              <Button
                type='button'
                variant={status === 'CANCELLED' ? 'destructive' : 'outline'}
                onClick={() => setStatus('CANCELLED')}
                className='flex items-center gap-2'
              >
                <XCircle className='w-4 h-4' />
                Cancelled
              </Button>
            </div>
          </div>

          {/* Fulfillment Notes */}
          <CustomInput
            type='textarea'
            label='Fulfillment Notes (Admin Only)'
            value={fulfillmentNotes}
            onChange={(e) => setFulfillmentNotes(e.target.value)}
            placeholder='Add notes about the fulfillment process...'
            rows={4}
            maxLength={500}
            showCharCount={true}
          />

          {/* Notify Customer */}
          <div className='flex items-center gap-2'>
            <input
              type='checkbox'
              id='notifyCustomer'
              checked={notifyCustomer}
              onChange={(e) => setNotifyCustomer(e.target.checked)}
              className='w-4 h-4 rounded border-gray-300'
            />
            <label htmlFor='notifyCustomer' className='text-sm cursor-pointer'>
              Notify customer via email when status is updated
            </label>
          </div>

          {/* Fulfillment History */}
          {((order.meta as any)?.fulfillmentHistory as any[])?.length > 0 && (
            <div className='p-4 bg-muted/50 rounded-lg border'>
              <h4 className='text-sm font-medium mb-2'>Fulfillment History</h4>
              <div className='space-y-2'>
                {((order.meta as any).fulfillmentHistory as any[])
                  .slice()
                  .reverse()
                  .map((entry: any, index: number) => (
                    <div key={index} className='text-xs border-l-2 border-primary pl-2'>
                      <div className='flex items-center justify-between'>
                        <span className='font-medium'>{entry.status}</span>
                        <span className='text-muted-foreground'>
                          {format(new Date(entry.updatedAt), 'MMM dd, yyyy HH:mm')}
                        </span>
                      </div>
                      {entry.notes && (
                        <p className='text-muted-foreground mt-1'>{entry.notes}</p>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Updating...' : 'Update Status'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export const serviceOrderColumns = (mutate?: () => void): TableColumn<Order>[] => {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isFulfillmentDialogOpen, setIsFulfillmentDialogOpen] = useState(false)

  return [
    {
      key: 'orderNumber',
      header: 'Order Number',
      render: (_, record) => (
        <div className='font-medium'>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className='cursor-help'>{record.orderNumber}</span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Click to view details</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      ),
      width: 'w-40'
    },
    {
      key: 'date',
      header: 'Date',
      render: (_, record) => (
        <div className='flex items-center gap-2 text-sm'>
          <Calendar className='w-4 h-4 text-muted-foreground' />
          {format(new Date(record.createdAt), 'MMM dd, yyyy')}
        </div>
      ),
      width: 'w-32'
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (_, record) => {
        const user = record?.user as any
        const customerName = user?.firstName || record?.customerName || 'Guest'
        const customerEmail = user?.email || record?.guestEmail || 'N/A'

        return (
          <div className='flex items-center gap-3'>
            <Avatar className='w-8 h-8'>
              <AvatarImage src={user?.avatar || user?.profilePicture} alt={customerName} />
              <AvatarFallback className='bg-primary/10 text-primary text-xs'>
                {(user?.firstName?.[0] || customerName[0] || 'G').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className='font-medium text-sm'>{customerName}</div>
              <div className='text-xs text-muted-foreground flex items-center gap-1'>
                <Mail className='w-3 h-3' />
                {customerEmail}
              </div>
            </div>
          </div>
        )
      },
      width: 'w-64'
    },
    {
      key: 'product',
      header: 'Product',
      render: (_, record) => (
        <div className='flex items-center gap-2'>
          <Package className='w-4 h-4 text-muted-foreground' />
          <div>
            <div className='font-medium text-sm'>{record.product?.name || 'N/A'}</div>
            <Badge variant='outline' className='text-xs mt-1'>
              {record.product?.platform || 'N/A'}
            </Badge>
          </div>
        </div>
      ),
      width: 'w-48'
    },
    {
      key: 'clientInput',
      header: 'Client Input',
      render: (_, record) => {
        const clientInput = (record.meta as any)?.clientInput || (record.meta as any)?.customerTelegram
        return (
          <div className='max-w-xs'>
            {clientInput ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className='text-sm text-muted-foreground truncate cursor-help'>
                      {clientInput}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className='max-w-xs break-words'>{clientInput}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <span className='text-sm text-muted-foreground'>—</span>
            )}
          </div>
        )
      },
      width: 'w-48'
    },
    {
      key: 'quantity',
      header: 'Quantity',
      render: (_, record) => <div className='text-sm'>{record.quantity || 1}</div>,
      width: 'w-24'
    },
    {
      key: 'status',
      header: 'Status',
      render: (_, record) => {
        const fulfillmentStatus = (record.meta as any)?.serviceFulfillment?.status || record.status
        return <StatusBadge status={fulfillmentStatus} />
      },
      width: 'w-32'
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, record) => {
        const fulfillmentStatus = (record.meta as any)?.serviceFulfillment?.status || record.status

        return (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='ghost' size='icon'>
                  <MoreVertical className='w-4 h-4' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end'>
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedOrder(record)
                    setIsFulfillmentDialogOpen(true)
                  }}
                >
                  <MessageSquare className='mr-2 h-4 w-4' />
                  Update Fulfillment
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    window.open(`/admin/orders/${record.id}`, '_blank')
                  }}
                >
                  <FileText className='mr-2 h-4 w-4' />
                  View Details
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {selectedOrder && (
              <ServiceOrderFulfillmentDialog
                order={selectedOrder}
                isOpen={isFulfillmentDialogOpen}
                onClose={() => {
                  setIsFulfillmentDialogOpen(false)
                  setSelectedOrder(null)
                }}
                onSuccess={() => {
                  mutate?.()
                }}
              />
            )}
          </>
        )
      },
      width: 'w-24'
    }
  ]
}

