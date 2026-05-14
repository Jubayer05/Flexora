'use client'

import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { format } from 'date-fns'
import { Eye } from 'lucide-react'
import { useState } from 'react'

import { ActionsDropdown } from '@/components/admin/common/ActionsDropdown'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getImgUrl } from '@/lib/get-image-url'

const getTransferDisplayName = (data: TelegramOwnerShipData) => {
  const telegramUsername = data?.order?.user?.telegramUsername?.trim()
  if (telegramUsername) {
    return telegramUsername.startsWith('@') ? telegramUsername : `@${telegramUsername}`
  }

  return (
    data?.order?.user?.firstName ||
    data?.order?.customerName ||
    data?.order?.user?.email ||
    data?.customerTelegram ||
    'N/A'
  )
}

// Custom table column type
export interface TableColumn<T = any> {
  key: string
  header: string | React.ReactNode
  render?: (value: any, data: T, index: number) => React.ReactNode
  width?: string
  className?: string
}

const ActionsCell = ({ data }: { data: TelegramOwnerShipData }) => {
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const displayName = getTransferDisplayName(data)
  const proofUrl = data?.transferProofUrl || data?.proofData || null
  const proofImageUrl = proofUrl ? getImgUrl(proofUrl) : null

  // Define actions for dropdown
  const actions = [
    {
      type: 'action' as const,
      label: 'View Details',
      icon: Eye,
      onClick: () => setViewDialogOpen(true)
    }
  ]

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-500'
      case 'WAITING_PERIOD':
        return 'bg-blue-500'
      case 'COMPLETED':
        return 'bg-green-500'
      case 'FAILED':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <>
      <ActionsDropdown data={data} actions={actions} />

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar'>
          <DialogHeader>
            <DialogTitle>Sold Channel/Group Details</DialogTitle>
          </DialogHeader>
          <div className='space-y-4'>
            <div className='grid grid-cols-2 gap-4'>
              <div>
                <p className='text-sm text-muted-foreground'>User Name</p>
                <p className='font-medium'>{displayName}</p>
              </div>
              <div>
                <p className='text-sm text-muted-foreground'>Transfer Type</p>
                <p className='font-medium capitalize'>{data?.transferType || 'N/A'}</p>
              </div>
              <div>
                <p className='text-sm text-muted-foreground'>Group/Channel URL</p>
                <p className='font-medium break-all'>{data?.targetUrl || 'N/A'}</p>
              </div>
              <div>
                <p className='text-sm text-muted-foreground'>New Owner Phone</p>
                <p className='font-medium'>{data?.customerTelegram || 'N/A'}</p>
              </div>
              <div>
                <p className='text-sm text-muted-foreground'>Status</p>
                <Badge
                  className={`px-2 py-1 text-xs font-normal border-0 text-white ${getStatusColor(
                    data?.status
                  )}`}
                >
                  {data?.status?.replace('_', ' ') || 'N/A'}
                </Badge>
              </div>
              <div>
                <p className='text-sm text-muted-foreground'>Initiated</p>
                <p className='font-medium'>
                  {data?.createdAt ? format(new Date(data.createdAt), 'MMM dd, yyyy HH:mm') : 'N/A'}
                </p>
              </div>
            </div>
            {proofImageUrl && (
              <div>
                <p className='text-sm text-muted-foreground mb-2'>Proof</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={proofImageUrl}
                  alt='Transfer Proof'
                  className='w-full max-w-md rounded-lg border border-border'
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Ownership transfer columns function
export const ownershipTransferColumns = (): TableColumn<TelegramOwnerShipData>[] => {
  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-500'
      case 'WAITING_PERIOD':
        return 'bg-blue-500'
      case 'COMPLETED':
        return 'bg-green-500'
      case 'FAILED':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  return [
    {
      key: 'select',
      header: <Checkbox className='' />,
      render: () => <Checkbox className='' />,
      width: 'w-10'
    },
    {
      key: 'id',
      header: 'ID',
      render: (_, record) => <span className='font-medium'>#{record.id}</span>,
      width: 'w-20'
    },
    {
      key: 'userName',
      header: 'User Name',
      render: (_, record) => (
        <div className='font-medium'>
          {getTransferDisplayName(record)}
        </div>
      ),
      width: 'w-40'
    },
    {
      key: 'targetUrl',
      header: 'Group/Channel',
      render: (_, record) => (
        <div className='flex flex-col max-w-xs'>
          <div className='font-medium truncate'>{record.targetUrl || 'N/A'}</div>
          <div className='text-muted text-xs capitalize'>{record.transferType || ''}</div>
        </div>
      ),
      width: 'w-48'
    },
    {
      key: 'customerTelegram',
      header: 'New Owner',
      render: (value) => <span className='font-medium'>{value || 'N/A'}</span>,
      width: 'w-40'
    },
    {
      key: 'status',
      header: 'Status',
      render: (_, record) => (
        <Badge
          className={`px-2 py-1 text-xs font-normal border-0 text-white ${getStatusColor(
            record.status
          )}`}
        >
          {record.status?.replace('_', ' ') || 'N/A'}
        </Badge>
      ),
      width: 'w-32'
    },
    {
      key: 'proofData',
      header: 'Proof',
      render: (_, record) => {
        const proofUrl = record?.transferProofUrl || record?.proofData || null
        const proofImageUrl = proofUrl ? getImgUrl(proofUrl) : null

        return (
        <div className='w-16 h-16'>
          {proofImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={proofImageUrl}
              alt='Proof'
              className='w-full h-full object-cover rounded border border-border'
            />
          ) : (
            <div className='w-full h-full bg-muted rounded border border-border flex items-center justify-center'>
              <span className='text-xs text-muted-foreground'>No Proof</span>
            </div>
          )}
        </div>
      )},
      width: 'w-28'
    },
    {
      key: 'createdAt',
      header: 'Initiated',
      render: (value) => (
        <span className='text-sm'>{value ? format(new Date(value), 'MMM dd, yyyy') : 'N/A'}</span>
      ),
      width: 'w-32'
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, data) => <ActionsCell data={data} />,
      width: 'w-20'
    }
  ]
}

// Export the default columns for backward compatibility
export const defaultOwnershipTransferColumns = ownershipTransferColumns()
