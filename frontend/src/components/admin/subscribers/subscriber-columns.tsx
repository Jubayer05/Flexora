'use client'

import { Button } from '@/components/ui/button'
import { useConfirmationModal } from '@/hooks/useConfirmationModal'
import requests from '@/services/network/http'
import { Trash2 } from 'lucide-react'
import React from 'react'
import { toast } from 'sonner'

// Custom table column type
export interface TableColumn<T = any> {
  key: string
  header: string | React.ReactNode
  render?: (value: any, data: T, index: number) => React.ReactNode
  width?: string
  className?: string
}

// Subscriber type
interface Subscriber {
  id: number
  email: string
  createdAt: string | Date
}

// Subscriber columns function
export const createSubscriberColumns = (
  currentPage: number = 1,
  pageLimit: number = 10,
  onDelete?: () => void
): TableColumn<Subscriber>[] => {
  return [
    {
      key: 'sl',
      header: '#SL',
      render: (_, __, index) => {
        // Calculate the correct SL based on current page and limit
        const serialNumber = (currentPage - 1) * pageLimit + index + 1
        return <div>{serialNumber}</div>
      },
      width: 'w-16'
    },
    {
      key: 'email',
      header: 'Email Address',
      render: (value) => <>{value ?? '-'}</>,
      width: 'w-56'
    },
    {
      key: 'createdAt',
      header: 'Subscribed Date',
      render: (value) => {
        if (!value) return <div>-</div>
        const date = new Date(value)

        // Format: "08 Sep 2025, 11:31AM"
        const formattedDate = date.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        })

        const formattedTime = date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })

        return (
          <>
            {formattedDate}, {formattedTime}
          </>
        )
      },
      width: 'w-40'
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, subscriber: Subscriber) => (
        <ActionsCell subscriber={subscriber} onDelete={onDelete} />
      ),
      width: 'w-24'
    }
  ]
}

const ActionsCell = ({
  subscriber,
  onDelete
}: {
  subscriber: Subscriber
  onDelete?: () => void
}) => {
  const deleteModal = useConfirmationModal({
    title: 'Delete Subscriber',
    description: `Are you sure you want to delete subscriber "${subscriber.email}"? This action cannot be undone.`,
    confirmText: 'Delete',
    variant: 'destructive',
    icon: Trash2
  })

  const handleDelete = async () => {
    try {
      await requests.delete(`/admin/subscribers/${subscriber.id}`)
      toast.success('Subscriber deleted successfully')
      onDelete?.()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete subscriber')
      throw error // Re-throw to prevent modal from closing
    }
  }

  return (
    <>
      <Button
        variant='ghost'
        size='sm'
        onClick={() => deleteModal.openModal(handleDelete)}
        className='text-red-500 hover:text-red-700 hover:bg-red-50'
      >
        <Trash2 className='w-4 h-4' />
      </Button>
      <deleteModal.ModalComponent />
    </>
  )
}
