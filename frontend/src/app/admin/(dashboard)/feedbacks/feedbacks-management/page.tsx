'use client'

import { Suspense, useMemo, useState } from 'react'

import FeedbackForm from '@/components/admin/form/FeedbackForm'
import PageHeader from '@/components/common/PageHeader'
import { Pagination } from '@/components/common/Pagination'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import useAsync from '@/hooks/useAsync'
import { useConfirmationModal } from '@/hooks/useConfirmationModal'
import { useFilter } from '@/hooks/useFilter'
import { showError } from '@/lib/errMsg'
import { cn } from '@/lib/utils'
import requests from '@/services/network/http'
import { renderStars } from '@/utils/renderStarts'
import { CheckCircle, Filter, Pencil, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'

type ApprovalFilter = 'all' | 'approved' | 'pending'
type SourceFilter = 'all' | 'CUSTOMER' | 'BULK_GENERATED' | 'MANUAL'
type ScheduleFilter = 'all' | 'current' | 'future'

const DEFAULT_FILTERS = {
  approval: 'all' as ApprovalFilter,
  type: 'all' as SourceFilter,
  schedule: 'all' as ScheduleFilter
}

function FeedbackList() {
  const { search, page, limit } = useFilter(10)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    params.set('page', String(page || 1))
    params.set('limit', String(limit || 10))
    if (search) params.set('search', search)
    if (filters.approval !== 'all') params.set('published', filters.approval === 'approved' ? 'true' : 'false')
    if (filters.type !== 'all') params.set('source', filters.type)
    if (filters.schedule !== 'all') params.set('schedule', filters.schedule)
    return params.toString()
  }, [page, limit, search, filters])

  const { data, loading, mutate } = useAsync<FeedbackResponse>(
    () => `/admin/feedbacks?${queryString}`,
    false,
    true,
    true,
    10000
  )

  const hasActiveFilters =
    filters.approval !== 'all' || filters.type !== 'all' || filters.schedule !== 'all'

  const updateFilter = (next: Partial<typeof filters>) => {
    setFilters((prev) => ({ ...prev, ...next }))
  }

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS)
  }

  const [viewItem, setViewItem] = useState<Feedback | null>(null)
  const [editItem, setEditItem] = useState<Feedback | null>(null)
  const [approvingItems, setApprovingItems] = useState<Set<number>>(new Set())

  const confirmModal = useConfirmationModal({
    title: 'Delete Feedback',
    description: 'Are you sure you want to delete this feedback? This action cannot be undone.',
    confirmText: 'Delete',
    cancelText: 'Cancel',
    variant: 'destructive',
    icon: Trash2
  })

  const handleDelete = async (item: Feedback) => {
    confirmModal.openModal(async () => {
      try {
        await requests.delete(`/admin/feedbacks/${item.id}`)
        toast.success('Feedback deleted successfully')
        mutate()
      } catch (error) {
        showError(error)
      }
    })
  }

  const handleApprove = async (item: Feedback) => {
    setApprovingItems((prev) => new Set(prev).add(item.id))
    try {
      await requests.put(`/admin/feedbacks/${item.id}`, { published: !item.published })
      toast.success('Feedback approved successfully')
      mutate()
    } catch (error) {
      showError(error)
    } finally {
      setApprovingItems((prev) => {
        const newSet = new Set(prev)
        newSet.delete(item.id)
        return newSet
      })
    }
  }

  return (
    <>
      {/* Header */}
      <PageHeader
        title='Review Management'
        subTitle='Manage customer feedbacks and reviews'
        extra={
          <div className='flex items-center gap-2'>
            <Button
              onClick={() => setShowFilters((s) => !s)}
              variant='outline'
              className={cn(
                'gap-1.5',
                hasActiveFilters &&
                  'bg-primary/10 text-primary border-primary/30 hover:bg-primary/20'
              )}
            >
              <Filter className='w-3.5 h-3.5' />
              Filter
              {hasActiveFilters && (
                <span className='ml-1 rounded-full bg-primary/20 border border-primary/30 px-2 py-0.5 text-[10px] font-medium'>
                  ON
                </span>
              )}
            </Button>
            <Button onClick={() => setCreateDialogOpen(true)} className='gap-2'>
              <Plus className='w-4 h-4' />
              Add Feedback
            </Button>
          </div>
        }
      />

      {/* Filter panel */}
      {showFilters && (
        <Card className='mb-4 border-border bg-card'>
          <CardContent className='p-4'>
            <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3'>
              <h4 className='font-medium text-sm sm:text-base text-card-foreground'>Filters</h4>
              <div className='flex gap-2'>
                <Button
                  type='button'
                  variant='secondary'
                  size='sm'
                  onClick={clearFilters}
                  disabled={!hasActiveFilters}
                  className='disabled:opacity-50'
                >
                  Clear filters
                </Button>
                <Button type='button' variant='outline' size='sm' onClick={() => setShowFilters(false)}>
                  Cancel
                </Button>
              </div>
            </div>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4'>
              <div>
                <Label className='text-muted-foreground text-xs sm:text-sm font-medium mb-1.5 block'>
                  Status
                </Label>
                <select
                  value={filters.approval}
                  onChange={(e) => updateFilter({ approval: e.target.value as ApprovalFilter })}
                  disabled={filters.schedule !== 'all'}
                  className={cn(
                    'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring',
                    filters.schedule !== 'all' && 'opacity-60 cursor-not-allowed'
                  )}
                >
                  <option value='all'>All reviews</option>
                  <option value='approved'>Approved</option>
                  <option value='pending'>Pending approval</option>
                </select>
                {filters.schedule !== 'all' && (
                  <p className='text-xs text-muted-foreground mt-1'>
                    Status is disabled when Schedule filter is active.
                  </p>
                )}
              </div>
              <div>
                <Label className='text-muted-foreground text-xs sm:text-sm font-medium mb-1.5 block'>
                  Customer / Bulk / Manual
                </Label>
                <select
                  value={filters.type}
                  onChange={(e) => updateFilter({ type: e.target.value as SourceFilter })}
                  className='w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring'
                >
                  <option value='all'>All</option>
                  <option value='CUSTOMER'>Customer</option>
                  <option value='BULK_GENERATED'>Bulk generated</option>
                  <option value='MANUAL'>Manual</option>
                </select>
              </div>
              <div>
                <Label className='text-muted-foreground text-xs sm:text-sm font-medium mb-1.5 block'>
                  Schedule
                </Label>
                <select
                  value={filters.schedule}
                  onChange={(e) => updateFilter({ schedule: e.target.value as ScheduleFilter })}
                  className='w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring'
                >
                  <option value='all'>All</option>
                  <option value='current'>Current (posted)</option>
                  <option value='future'>Future / Pending</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Card List */}
      <div className={`space-y-2 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
        {(data?.data?.feedbacks ?? []).length ? (
          (data?.data?.feedbacks ?? []).map((fb) => (
            <Card key={fb.id} className='w-full py-4 gap-3'>
              <CardHeader className='flex flex-row justify-between items-center gap-2 px-4'>
                <div className='flex items-center gap-2'>
                  <div className='flex justify-center items-center bg-gray-200 rounded-full h-9 w-9 shrink-0 overflow-hidden'>
                    <span
                      className='flex justify-center items-center w-full h-full font-semibold text-gray-700 text-sm'
                      style={{
                        backgroundColor: `hsl(${Math.floor(Math.random() * 360)}, 70%, 85%)`
                      }}
                    >
                      {fb?.name
                        ? fb?.name
                            .split(' ')
                            .map((w) => w.charAt(0).toUpperCase())
                            .slice(0, 2)
                            .join('')
                        : '?'}
                    </span>
                  </div>
                  <div>
                    <div className='font-semibold text-sm'>{fb.name}</div>
                    <span className='text-xs text-muted-foreground'>
                      {new Date(fb.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
                <Badge
                  className={cn(
                    'bg-green-500/20 px-2 py-0.5 border border-green-700 rounded-full font-medium text-green-500 text-xs',
                    { 'bg-yellow-500/20 text-yellow-400 border-yellow-600': !fb.published }
                  )}
                >
                  {fb.published ? 'Published' : 'Pending Approval'}
                </Badge>
              </CardHeader>
              <CardContent className='space-y-1.5 px-4 pb-3 pt-0'>
                <div className='flex items-center gap-1.5'>
                  {renderStars(fb.rating, 20)}
                  <span className='text-sm'>{fb.rating}/5</span>
                </div>
                <p className='text-xs text-muted-foreground'>
                  Product: {(fb as any).product?.name || 'Not assigned'}
                </p>
                <p className='text-muted-foreground text-sm leading-snug'>{fb.feedback}</p>
                <div className='flex items-center gap-1.5 pt-1'>
                  <div className='flex items-center gap-1.5'>
                    <Button
                      size='sm'
                      variant='ghost'
                      onClick={() => handleApprove(fb)}
                      disabled={approvingItems.has(fb.id)}
                      className={cn(
                        'h-7 gap-1 px-2 bg-red-500 hover:bg-red-600 text-white text-xs',
                        { 'bg-green-700 hover:bg-green-800': !fb?.published }
                      )}
                    >
                      {fb?.published ? (
                        <X className='w-3.5 h-3.5' />
                      ) : (
                        <CheckCircle className='w-3.5 h-3.5' />
                      )}{' '}
                      {approvingItems.has(fb.id)
                        ? 'Processing...'
                        : fb?.published
                          ? 'Reject'
                          : 'Approve'}
                    </Button>
                    <Button
                      size='sm'
                      variant='ghost'
                      onClick={() => setEditItem(fb)}
                      className='h-7 gap-1 px-2 bg-blue-500 hover:bg-blue-600 text-white text-xs'
                    >
                      <Pencil className='w-3.5 h-3.5' /> Edit
                    </Button>
                    <Button
                      size='sm'
                      variant='ghost'
                      onClick={() => handleDelete(fb)}
                      className='h-7 gap-1 px-2 bg-red-500 hover:bg-red-600 text-white text-xs'
                    >
                      <Trash2 className='w-3.5 h-3.5' /> Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className='text-muted-foreground text-sm'>
            {loading ? 'Loading feedbacks...' : 'No feedbacks found.'}
          </div>
        )}
      </div>

      {/* Pagination */}
      <Pagination paginationData={data?.data?.pagination} pageSizeOptions={[5, 10, 20, 50]} />

      {/* Create Feedback Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>Add Feedback</DialogTitle>
            <DialogDescription>Create a new customer feedback.</DialogDescription>
          </DialogHeader>
          <div className='py-4'>
            <FeedbackForm
              onSuccess={() => {
                setCreateDialogOpen(false)
                mutate()
              }}
              onCancel={() => setCreateDialogOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewItem} onOpenChange={(open) => !open && setViewItem(null)}>
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>Feedback Details</DialogTitle>
            <DialogDescription>View complete feedback information.</DialogDescription>
          </DialogHeader>
          {viewItem && (
            <div className='space-y-4 py-4'>
              <div>
                <Label className='text-muted-foreground text-sm'>Customer Name</Label>
                <p className='mt-1 font-medium'>{viewItem.name}</p>
              </div>
              <div>
                <Label className='text-muted-foreground text-sm'>Rating</Label>
                <div className='mt-1'>{renderStars(viewItem.rating)}</div>
              </div>
              <div>
                <Label className='text-muted-foreground text-sm'>Feedback</Label>
                <p className='mt-1 text-sm leading-relaxed'>{viewItem.feedback}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>Edit Feedback</DialogTitle>
            <DialogDescription>Update the feedback details.</DialogDescription>
          </DialogHeader>
          {editItem && (
            <div className='py-4'>
              <FeedbackForm
                feedback={editItem}
                onSuccess={() => {
                  setEditItem(null)
                  mutate()
                }}
                onCancel={() => setEditItem(null)}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Fake Feedback Dialog */}

      {/* Delete confirmation modal component mount */}
      <confirmModal.ModalComponent />
    </>
  )
}

export default function FeedBackManagement() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <FeedbackList />
    </Suspense>
  )
}
