'use client'

import { Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useConfirmationModal } from '@/hooks/useConfirmationModal'
import { useFilter } from '@/hooks/useFilter'
import { showError } from '@/lib/errMsg'
import requests from '@/services/network/http'
import { toast } from 'sonner'

// Custom table column type
export interface TableColumn<T = any> {
  key: string
  header: string | React.ReactNode
  render?: (value: any, data: T, index: number) => React.ReactNode
  width?: string
  className?: string
}

const ActionsCell = ({ data, mutate }: { data: Account; mutate?: () => void }) => {
  const { setPage } = useFilter(10)

  const deleteModal = useConfirmationModal({
    title: 'Delete Account',
    description: 'Are you sure you want to delete this account? This action cannot be undone.',
    confirmText: 'Delete',
    variant: 'destructive',
    icon: Trash2
  })

  const handleDelete = async () => {
    deleteModal.openModal(async () => {
      try {
        await requests.delete(`/admin/accounts/${data.id}`)
        toast.success('Account deleted successfully')
        mutate?.()
        setPage(1)
      } catch (error) {
        showError(error)
        throw error
      }
    })
  }

  return (
    <>
      <Button
        variant='ghost'
        size='icon'
        onClick={handleDelete}
        className='h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10'
      >
        <Trash2 className='h-4 w-4' />
      </Button>
      <deleteModal.ModalComponent />
    </>
  )
}

// Account columns function
export const accountColumns = (
  mutate?: () => void,
  selectionHandlers?: {
    selectedIds: number[]
    onSelectAll: (checked: boolean) => void
    onSelectOne: (id: number, checked: boolean) => void
  }
): TableColumn<Account>[] => {
  return [
    {
      key: 'select',
      header: (
        <Checkbox
          checked={
            selectionHandlers
              ? selectionHandlers.selectedIds.length > 0 &&
                selectionHandlers.selectedIds.length ===
                  (document.querySelectorAll('[data-account-id]').length || 0)
              : false
          }
          onCheckedChange={(checked) => selectionHandlers?.onSelectAll(checked as boolean)}
        />
      ),
      render: (_, record) => (
        <Checkbox
          data-account-id={record.id}
          checked={selectionHandlers?.selectedIds.includes(record.id) || false}
          onCheckedChange={(checked) =>
            selectionHandlers?.onSelectOne(record.id, checked as boolean)
          }
        />
      ),
      width: 'w-10'
    },
    {
      key: 'id',
      header: 'ID',
      render: (value) => <span className='font-mono text-sm'>#{value}</span>,
      width: 'w-20'
    },
    {
      key: 'productName',
      header: 'Product',
      render: (_, record) => (
        <div className='flex flex-col'>
          <span className='font-medium'>{record.productName || 'N/A'}</span>
          <span className='text-xs text-muted-foreground'>ID: {record.productId}</span>
        </div>
      ),
      width: 'w-48'
    },
    {
      key: 'isUsed',
      header: 'Used',
      render: (_, record) => (
        <Badge className={record.isUsed ? 'bg-orange-500' : 'bg-gray-500'}>
          {record.isUsed ? 'Yes' : 'No'}
        </Badge>
      ),
      width: 'w-24'
    },
    {
      key: 'isValid',
      header: 'Valid',
      render: (_, record) => (
        <Badge className={record.isValid ? 'bg-green-500' : 'bg-red-500'}>
          {record.isValid ? 'Yes' : 'No'}
        </Badge>
      ),
      width: 'w-24'
    },
    {
      key: 'hasPremium',
      header: 'Premium',
      render: (_, record) => (
        <Badge className={record.hasPremium ? 'bg-purple-500' : 'bg-gray-500'}>
          {record.hasPremium ? 'Yes' : 'No'}
        </Badge>
      ),
      width: 'w-24'
    },
    {
      key: 'adminNote',
      header: 'Private Note',
      render: (_, record) => {
        const adminNote = (record as any).meta?.adminNote || (record as any).meta?.note || ''
        return (
          <div className='max-w-xs'>
            {adminNote ? (
              <p className='text-sm text-muted-foreground line-clamp-2' title={adminNote}>
                {adminNote}
              </p>
            ) : (
              <span className='text-xs text-muted-foreground'>-</span>
            )}
          </div>
        )
      },
      width: 'w-48'
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, data) => <ActionsCell data={data} mutate={mutate} />,
      width: 'w-20'
    }
  ]
}
