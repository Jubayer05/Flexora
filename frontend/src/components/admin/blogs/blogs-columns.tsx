'use client'

import { Eye, Pencil, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import { ActionsDropdown } from '@/components/admin/common/ActionsDropdown'
import CustomImage from '@/components/common/CustomImage'
import { Badge } from '@/components/ui/badge'
import { useConfirmationModal } from '@/hooks/useConfirmationModal'
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

// Blog action types
export type BlogActionType = 'view' | 'edit' | 'delete'

function formatDateTime(value: unknown) {
  if (!value) return '-'
  const d = new Date(value as any)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatRemaining(ms: number) {
  if (ms <= 0) return '0m'
  const totalMinutes = Math.ceil(ms / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours <= 0) return `${minutes}m`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}

const RemainingTimeCell = ({
  publishedAt,
  isPublished
}: {
  publishedAt?: string | Date | null
  isPublished?: boolean
}) => {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  if (!publishedAt) return <span className='text-muted-foreground'>-</span>
  const target = new Date(publishedAt as any).getTime()
  if (Number.isNaN(target)) return <span className='text-muted-foreground'>-</span>

  const diff = target - now
  if (diff <= 0) {
    return (
      <span className={isPublished ? 'text-green-600' : 'text-muted-foreground'}>
        {isPublished ? 'Published' : 'Due'}
      </span>
    )
  }

  return <span className='tabular-nums'>{formatRemaining(diff)} remain</span>
}

const ActionsCell = ({ data, mutate }: { data: any; mutate?: () => void }) => {
  // Define action configurations for confirmation modals
  const actionConfigs = {
    delete: {
      title: 'Delete Blog Post',
      description: 'Are you sure you want to delete this blog post? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'destructive' as const,
      icon: Trash2,
      showInput: false,
      inputConfig: undefined,
      onClick: async (data: any) => {
        try {
          await requests.delete(`/admin/blogs/${data?.id}`)
          toast.success('Blog post deleted successfully')
          mutate?.()
        } catch (error) {
          showError(error)
          throw error // Re-throw to prevent modal from closing
        }
      }
    }
  }

  const [currentAction, setCurrentAction] = useState<{
    type: keyof typeof actionConfigs
  } | null>(null)

  const actionModal = useConfirmationModal({
    title: currentAction ? actionConfigs[currentAction.type].title : '',
    description: currentAction ? actionConfigs[currentAction.type].description : '',
    confirmText: currentAction ? actionConfigs[currentAction.type].confirmText : 'Confirm',
    cancelText: 'Cancel',
    variant: currentAction ? actionConfigs[currentAction.type].variant : 'default',
    icon: currentAction ? actionConfigs[currentAction.type].icon : Trash2,
    showInput: currentAction ? actionConfigs[currentAction.type].showInput : false,
    inputConfig: currentAction ? actionConfigs[currentAction.type].inputConfig : undefined
  })

  // Action configurations for dropdown
  const actions = [
    {
      type: 'action' as const,
      label: 'View',
      icon: Eye,
      href: `/admin/blogs/${data.id}`
    },
    {
      type: 'action' as const,
      label: 'Edit',
      icon: Pencil,
      href: `/admin/blogs/${data.id}/edit/`
    },
    {
      type: 'action' as const,
      label: 'Delete',
      icon: Trash2,
      variant: 'destructive' as const,
      onClick: async () => {
        const config = actionConfigs.delete
        setCurrentAction({ type: 'delete' })
        actionModal.openModal(async () => {
          await config.onClick(data)
          setCurrentAction(null)
        })
      }
    }
  ]

  return (
    <>
      <ActionsDropdown data={data} actions={actions} />
      <actionModal.ModalComponent />
    </>
  )
}

// Blog columns function that accepts mutate callback
export const blogColumns = (mutate?: () => void): TableColumn<any>[] => {
  return [
    {
      key: 'thumbnail',
      header: 'Thumbnail',
      render: (value) =>
        value ? (
          <div className='relative bg-gray-100 rounded-md w-12 h-12 overflow-hidden'>
            <CustomImage src={value} alt='Thumbnail' fill className='w-full h-full object-cover' />
          </div>
        ) : (
          <span className='text-muted-foreground'>-</span>
        ),
      width: 'w-20'
    },
    {
      key: 'title',
      header: 'Title',
      render: (value, data) => (
        <div className='max-w-xs'>
          <div className='font-medium truncate'>{value}</div>
          <div className='text-muted-foreground text-xs truncate'>/{data.slug}</div>
        </div>
      ),
      width: 'w-64'
    },
    {
      key: 'isPublished',
      header: 'Status',
      render: (value, data) => {
        const pubAt = data?.publishedAt
        const isScheduled =
          value && pubAt && new Date(pubAt as string) > new Date()
        if (isScheduled) return <Badge variant="outline">Scheduled</Badge>
        return (
          <Badge variant={value ? 'default' : 'secondary'}>
            {value ? 'Published' : 'Draft'}
          </Badge>
        )
      },
      width: 'w-24'
    },
    {
      key: 'publishedAt',
      header: 'Publishing Time',
      render: (value) => <div className='text-sm'>{formatDateTime(value)}</div>,
      width: 'w-44'
    },
    {
      key: 'remainingTime',
      header: 'Remaining Time',
      render: (_, data) => (
        <RemainingTimeCell publishedAt={data?.publishedAt} isPublished={data?.isPublished} />
      ),
      width: 'w-36'
    },
    {
      key: 'seo',
      header: 'SEO',
      render: (value) => (
        <div className='text-xs'>
          {value?.title ? (
            <div className='text-green-600'>✓ Optimized</div>
          ) : (
            <div className='text-orange-600'>Basic</div>
          )}
        </div>
      ),
      width: 'w-20'
    },
    // {
    //   key: 'createdAt',
    //   header: 'Created',
    //   render: (value) => <div className='text-sm'>{new Date(value).toLocaleDateString()}</div>,
    //   width: 'w-28'
    // },
    {
      key: 'actions',
      header: <span className='font-manrope font-medium'>Actions</span>,
      render: (_, data) => (
        <div className='flex items-center justify-end font-manrope'>
          <ActionsCell data={data} mutate={mutate} />
        </div>
      ),
      width: 'w-24',
      className: 'text-right'
    }
  ]
}

// Export the default columns for backward compatibility
export const defaultBlogColumns = blogColumns()
