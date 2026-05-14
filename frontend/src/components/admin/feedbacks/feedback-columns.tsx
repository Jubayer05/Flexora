'use client'

import FeedbackForm from '@/components/admin/form/FeedbackForm'
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
import { Label } from '@/components/ui/label'
import { useConfirmationModal } from '@/hooks/useConfirmationModal'
import { showError } from '@/lib/errMsg'
import requests from '@/services/network/http'
import { renderStars } from '@/utils/renderStarts'
import { CheckCircle, Eye, Pencil, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { ActionsDropdown } from '@/components/admin/common/ActionsDropdown'

// Countdown Timer Component
const CountdownTimer = ({ createdAt }: { createdAt?: string }) => {
  const [timeRemaining, setTimeRemaining] = useState<string>('')
  const [isPosted, setIsPosted] = useState(false)

  useEffect(() => {
    if (!createdAt) {
      setIsPosted(true)
      return
    }

    const calculateTime = () => {
      const createdAtDate = new Date(createdAt)
      const now = new Date()
      const diffMs = createdAtDate.getTime() - now.getTime()

      // If the created time has passed, show "posted"
      if (diffMs <= 0) {
        setIsPosted(true)
        return
      }

      // Calculate time remaining
      const diffSeconds = Math.floor(diffMs / 1000)
      const diffMinutes = Math.floor(diffSeconds / 60)
      const diffHours = Math.floor(diffMinutes / 60)
      const diffDays = Math.floor(diffHours / 24)

      const days = diffDays
      const hours = diffHours % 24
      const minutes = diffMinutes % 60
      const seconds = diffSeconds % 60

      const timeString =
        days > 0
          ? `${days}d:${hours}h:${minutes}m:${seconds}s`
          : `${hours}h:${minutes}m:${seconds}s`

      setTimeRemaining(timeString)
    }

    // Calculate immediately
    calculateTime()

    // Update every second
    const interval = setInterval(calculateTime, 1000)

    return () => clearInterval(interval)
  }, [createdAt])

  if (isPosted) {
    return <span className='text-muted-foreground text-xs'>posted</span>
  }

  return (
    <span className='font-medium tabular-nums text-xs transition-all duration-300'>
      {timeRemaining}
    </span>
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

const ActionsCell = ({ feedback, mutate }: { feedback: Feedback; mutate?: () => void }) => {
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [isApproving, setIsApproving] = useState(false)

  // Define action configurations
  const actionConfigs = {
    delete: {
      title: 'Delete Feedback',
      description: `Are you sure you want to delete the feedback from "${feedback.name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'destructive' as const,
      icon: Trash2,
      showInput: false,
      inputConfig: undefined,
      onClick: async (feedback: Feedback) => {
        try {
          await requests.delete(`/admin/feedbacks/${feedback.id}`)
          toast.success('Feedback deleted successfully')
          mutate?.()
        } catch (error) {
          showError(error)
          throw error
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

  // Unified action handler
  const handleAction = async (action: string, feedback: Feedback) => {
    switch (action) {
      case 'view':
        setViewDialogOpen(true)
        break
      case 'edit':
        setEditDialogOpen(true)
        break
      case 'approve':
        setApproveDialogOpen(true)
        break
      case 'delete':
        if (actionConfigs.delete) {
          setCurrentAction({ type: 'delete' })
          actionModal.openModal(async () => {
            await actionConfigs.delete.onClick(feedback)
          })
        }
        break
      default:
        console.log(`Action ${action} not implemented yet.`)
    }
  }

  const handleApprove = async () => {
    setIsApproving(true)
    try {
      await requests.put(`/admin/feedbacks/${feedback.id}`, {
        published: true
      })
      toast.success('Feedback approved successfully')
      setApproveDialogOpen(false)
      mutate?.()
    } catch (error) {
      showError(error)
    } finally {
      setIsApproving(false)
    }
  }

  // Define actions for dropdown - conditionally include Approve
  const actions = [
    {
      type: 'action' as const,
      label: 'View',
      icon: Eye,
      onClick: () => handleAction('view', feedback)
    },
    {
      type: 'action' as const,
      label: 'Edit',
      icon: Pencil,
      onClick: () => handleAction('edit', feedback)
    },
    // Only show Approve action if feedback is not published
    ...(!feedback.published
      ? [
          {
            type: 'action' as const,
            label: 'Approve',
            icon: CheckCircle,
            onClick: () => handleAction('approve', feedback)
          }
        ]
      : []),
    {
      type: 'action' as const,
      label: 'Delete',
      icon: Trash2,
      onClick: () => handleAction('delete', feedback),
      className: 'text-red-600 focus:text-red-600'
    }
  ]

  return (
    <>
      <ActionsDropdown data={feedback} actions={actions} />
      <actionModal.ModalComponent />

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>Feedback Details</DialogTitle>
            <DialogDescription>View complete feedback information.</DialogDescription>
          </DialogHeader>
          <div className='py-4'>
            <div className='space-y-4'>
              <div>
                <Label className='text-muted-foreground text-sm'>Customer Name</Label>
                <p className='mt-1 font-medium'>{feedback.name}</p>
              </div>
              <div>
                <Label className='text-muted-foreground text-sm'>Rating</Label>
                <div className='mt-1'>{renderStars(feedback.rating)}</div>
              </div>
              <div>
                <Label className='text-muted-foreground text-sm'>Feedback</Label>
                <p className='mt-1 text-sm leading-relaxed'>{feedback.feedback}</p>
              </div>
              <div>
                <Label className='text-muted-foreground text-sm'>Submitted At</Label>
                <p className='mt-1 text-sm'>
                  {new Date(feedback.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Approve Feedback</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this feedback? It will be visible on the website.
            </DialogDescription>
          </DialogHeader>
          <div className='py-4'>
            <div className='space-y-3 bg-muted/50 p-4 rounded-lg'>
              <div>
                <span className='text-muted-foreground text-sm'>From: </span>
                <span className='font-medium'>{feedback.name}</span>
              </div>
              <div>
                <span className='text-muted-foreground text-sm'>Rating: </span>
                {renderStars(feedback.rating)}
              </div>
              <div>
                <p className='text-sm line-clamp-3'>{feedback.feedback}</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setApproveDialogOpen(false)}
              disabled={isApproving}
            >
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={isApproving}>
              {isApproving ? 'Approving...' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>Edit Feedback</DialogTitle>
            <DialogDescription>Update the feedback details.</DialogDescription>
          </DialogHeader>
          <div className='py-4'>
            <FeedbackForm
              feedback={feedback}
              onSuccess={() => {
                setEditDialogOpen(false)
                mutate?.()
              }}
              onCancel={() => setEditDialogOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Feedback columns function
export const feedbackColumns = (mutate?: () => void): TableColumn<Feedback>[] => {
  return [
    {
      key: 'name',
      header: 'Customer Name',
      render: (_, record) => <div className='font-medium'>{record.name}</div>,
      width: 'w-48'
    },
    {
      key: 'product',
      header: 'Product',
      render: (_, record: any) => (
        <div className='max-w-[220px]'>
          <p className='line-clamp-2 text-sm font-medium'>{record.product?.name || 'Not assigned'}</p>
          {record.product?.slug ? (
            <p className='text-xs text-muted-foreground'>{record.product.slug}</p>
          ) : null}
        </div>
      ),
      width: 'w-56'
    },
    {
      key: 'rating',
      header: 'Rating',
      render: (_, record) => (
        <div className='flex items-center gap-2'>{renderStars(record.rating)}</div>
      ),
      width: 'w-32'
    },
    {
      key: 'feedback',
      header: 'Feedback',
      render: (_, record) => (
        <div className='max-w-md'>
          <p className='text-sm line-clamp-2'>{record.feedback}</p>
        </div>
      ),
      width: 'w-64'
    },
    {
      key: 'published',
      header: 'Status',
      render: (_, record) => (
        <Badge
          className={`px-2 py-1 text-xs font-normal border-0 text-white ${
            record.published ? 'bg-[#10B981]' : 'bg-[#F59E0B]'
          }`}
        >
          {record.published ? 'Published' : 'Pending'}
        </Badge>
      ),
      width: 'w-28'
    },
    {
      key: 'scheduledAt',
      header: 'Time Remaining',
      render: (value) => {
        return value ? (
          <CountdownTimer createdAt={value} />
        ) : (
          <span className='text-muted-foreground text-xs'>N/A</span>
        )
      },
      width: 'w-32'
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, record) => <ActionsCell feedback={record} mutate={mutate} />,
      width: 'w-24'
    }
  ]
}

// Export the default columns for backward compatibility
export const defaultFeedbackColumns = feedbackColumns()
