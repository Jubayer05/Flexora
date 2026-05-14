'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useConfirmationModal } from '@/hooks/useConfirmationModal'
import { showError } from '@/lib/errMsg'
import requests from '@/services/network/http'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'

// Custom table column type
export interface TableColumn<T = any> {
  key: string
  header: string | React.ReactNode
  render?: (value: any, data: T, index: number) => React.ReactNode
  width?: string
  className?: string
}

const ActionsCell = ({
  session,
  mutate
}: {
  session: SessionListResponse['sessions'][0]
  mutate?: () => void
}) => {
  const actionModal = useConfirmationModal({
    title: 'Delete Telegram Session',
    description: `Are you sure you want to delete the session for ${session.phone_number}? This action cannot be undone.`,
    confirmText: 'Delete',
    cancelText: 'Cancel',
    variant: 'destructive',
    icon: Trash2,
    showInput: false
  })

  const handleDelete = () => {
    actionModal.openModal(async () => {
      try {
        await requests.delete(
          `/admin/telegram-sessions/delete-session/${encodeURIComponent(session.phone_number)}`
        )
        toast.success('Telegram session deleted successfully')
        mutate?.()
      } catch (error) {
        showError(error)
        throw error // Re-throw to prevent modal from closing
      }
    })
  }

  return (
    <div className='flex items-center gap-2'>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='ghost'
              size='icon'
              className='h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950'
              onClick={handleDelete}
            >
              <Trash2 className='h-4 w-4' />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Delete Session</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <actionModal.ModalComponent />
    </div>
  )
}

// Helper function to format bytes
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

// Helper function to format date
const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

export const telegramSessionColumns = (
  mutate?: () => void
): TableColumn<SessionListResponse['sessions'][0]>[] => [
  {
    key: 'phone_number',
    header: 'Phone Number',
    render: (value: string) => {
      if (!value) return <div className='font-medium text-muted-foreground'>N/A</div>
      const formatted = value.includes('session') ? '+' + value.replace('session_', '') : '+' + value
      return <div className='font-medium'>{formatted}</div>
    },
    width: '200px'
  },
  {
    key: 'file_exists',
    header: 'Status',
    render: (value: boolean) => (
      <Badge variant={value ? 'default' : 'destructive'}>{value ? 'Active' : 'Inactive'}</Badge>
    ),
    width: '120px'
  },
  {
    key: 'size_bytes',
    header: 'File Size',
    render: (value: number) => (
      <div className='text-sm text-muted-foreground'>{formatBytes(value)}</div>
    ),
    width: '120px'
  },
  {
    key: 'created_at',
    header: 'Created At',
    render: (value: string) => (
      <div className='text-sm text-muted-foreground'>{formatDate(value)}</div>
    ),
    width: '180px'
  },
  {
    key: 'modified_at',
    header: 'Last Modified',
    render: (value: string) => (
      <div className='text-sm text-muted-foreground'>{formatDate(value)}</div>
    ),
    width: '180px'
  },
  {
    key: 'actions',
    header: 'Actions',
    render: (_: any, session: SessionListResponse['sessions'][0]) => (
      <ActionsCell session={session} mutate={mutate} />
    ),
    width: '100px',
    className: 'text-right'
  }
]
