'use client'
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'

import { ActionsDropdown } from '@/components/admin/common/ActionsDropdown'
import TransferProductForm from '@/components/admin/form/TransferProduct'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import useAsync from '@/hooks/useAsync'
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

const ActionsCell = ({ data, mutate }: { data: any; mutate?: () => void }) => {
  const [currentDialog, setCurrentDialog] = useState<{
    type: 'edit' | 'view'
    isOpen: boolean
  }>({ type: 'edit', isOpen: false })
  const rowToDeleteRef = useRef<any>(null)

  // Fetch categories for the form
  const { data: categoriesData } = useAsync<{ data: { categories: Category[] } }>('/categories')
  const categories = categoriesData?.data?.categories || []

  // Define action configurations
  const actionConfigs = {
    delete: {
      title: 'Delete Channel/Group',
      description:
        'Are you sure you want to delete this channel/group item? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'destructive' as const,
      icon: Trash2,
      showInput: false,
      inputConfig: undefined,
      onClick: async () => {
        const row = rowToDeleteRef.current
        if (!row?.id) return
        try {
          await requests.delete(`/admin/transfer-products/${row.id}`)
          toast.success('Transfer product deleted successfully')
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
  const handleAction = async (action: string, transferProduct: any) => {
    switch (action) {
      case 'edit':
        setCurrentDialog({ type: 'edit', isOpen: true })
        break
      case 'view':
        setCurrentDialog({ type: 'view', isOpen: true })
        break
      case 'delete':
        if (actionConfigs.delete) {
          rowToDeleteRef.current = transferProduct
          setCurrentAction({ type: 'delete' })
          actionModal.openModal(actionConfigs.delete.onClick)
        }
        break
      default:
        console.log(`Action ${action} not implemented yet.`)
    }
  }

  const handleDialogClose = () => {
    setCurrentDialog({ type: 'edit', isOpen: false })
  }

  // Define actions for dropdown
  const actions = [
    {
      type: 'action' as const,
      label: 'Edit',
      icon: Pencil,
      onClick: () => handleAction('edit', data)
    },
    {
      type: 'action' as const,
      label: 'View',
      icon: Eye,
      onClick: () => handleAction('view', data)
    },
    {
      type: 'action' as const,
      label: 'Delete',
      icon: Trash2,
      onClick: () => handleAction('delete', data),
      className: 'text-red-600 focus:text-red-600'
    }
  ]

  // Get dialog title based on type
  const getDialogTitle = () => {
    switch (currentDialog.type) {
      case 'edit':
        return 'Edit Channel/Group'
      case 'view':
        return 'View Channel/Group'
      default:
        return 'Channel/Group'
    }
  }

  // Render dialog content
  const renderDialogContent = () => {
    if (currentDialog.type === 'view') {
      const assignedGroupsChannels = Array.isArray(data?.meta?.assignedGroupsChannels)
        ? data.meta.assignedGroupsChannels
        : []
      const soldGroupsChannels = Array.isArray(data?.meta?.soldGroupsChannels)
        ? data.meta.soldGroupsChannels
        : []

      return (
        <div className='space-y-4'>
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <p className='text-sm text-muted-foreground'>Product Name</p>
              <p className='font-medium'>{data?.name || 'N/A'}</p>
            </div>
            <div>
              <p className='text-sm text-muted-foreground'>SKU</p>
              <p className='font-medium'>{data?.sku || 'N/A'}</p>
            </div>
            <div>
              <p className='text-sm text-muted-foreground'>Price</p>
              <p className='font-medium'>${data?.price || 0}</p>
            </div>
            <div>
              <p className='text-sm text-muted-foreground'>Stock</p>
              <p className='font-medium'>{data?.stockCount || 0}</p>
            </div>
            <div>
              <p className='text-sm text-muted-foreground'>Telegram URL</p>
              <p className='font-medium'>{data?.telegramUrl || 'N/A'}</p>
            </div>
            <div>
              <p className='text-sm text-muted-foreground'>Transfer Type</p>
              <p className='font-medium capitalize'>{data?.meta?.transferType || 'N/A'}</p>
            </div>
            <div>
              <p className='text-sm text-muted-foreground'>Bot Added</p>
              <p className='font-medium'>{data?.meta?.botAdded ? 'Yes' : 'No'}</p>
            </div>
            <div>
              <p className='text-sm text-muted-foreground'>Admin Phone</p>
              <p className='font-medium'>{data?.meta?.adminPhone || 'N/A'}</p>
            </div>
            <div>
              <p className='text-sm text-muted-foreground'>Original Owner</p>
              <p className='font-medium'>{data?.meta?.originalOwner || 'N/A'}</p>
            </div>
            <div>
              <p className='text-sm text-muted-foreground'>Members</p>
              <p className='font-medium'>{data?.meta?.members || 'N/A'}</p>
            </div>
            <div>
              <p className='text-sm text-muted-foreground'>Year Created</p>
              <p className='font-medium'>{data?.meta?.yearCreated || 'N/A'}</p>
            </div>
            <div>
              <p className='text-sm text-muted-foreground'>Status</p>
              <Badge
                className={`
                  px-2 py-1 text-xs font-normal border-0 text-white
                  ${data?.isActive ? 'bg-[#10B981]' : 'bg-[#EF4444]'}
                `}
              >
                {data?.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
          <div className='space-y-4'>
            <div className='rounded-lg border border-white/10 bg-background/40 p-4 space-y-3'>
              <div>
                <p className='text-sm text-muted-foreground'>Assigned Channels/Groups</p>
                <p className='font-medium'>{assignedGroupsChannels.length}</p>
              </div>
              {assignedGroupsChannels.length > 0 ? (
                <div className='space-y-2 max-h-56 overflow-y-auto'>
                  {assignedGroupsChannels.map((item: any) => (
                    <div
                      key={item.url}
                      className='rounded-md border border-white/10 bg-background/50 p-3'
                    >
                      <div className='flex items-center gap-2 mb-1 flex-wrap'>
                        <Badge variant='outline'>
                          {String(item.type || 'group').toUpperCase()}
                        </Badge>
                        {item.name ? <span className='font-medium'>{item.name}</span> : null}
                      </div>
                      <p className='text-sm break-all'>{item.url}</p>
                      {item.username ? (
                        <p className='text-xs text-muted-foreground mt-1'>
                          Username: {item.username}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className='text-sm text-muted-foreground'>No assigned URLs yet.</p>
              )}
            </div>

            <div className='rounded-lg border border-white/10 bg-background/40 p-4 space-y-3'>
              <div>
                <p className='text-sm text-muted-foreground'>Sold Channels/Groups</p>
                <p className='font-medium'>{soldGroupsChannels.length}</p>
              </div>
              {soldGroupsChannels.length > 0 ? (
                <div className='space-y-2 max-h-56 overflow-y-auto'>
                  {soldGroupsChannels.map((item: any) => (
                    <div
                      key={item.url}
                      className='rounded-md border border-white/10 bg-background/50 p-3'
                    >
                      <div className='flex items-center gap-2 mb-1 flex-wrap'>
                        <Badge variant='outline'>
                          {String(item.type || 'group').toUpperCase()}
                        </Badge>
                        {item.name ? <span className='font-medium'>{item.name}</span> : null}
                      </div>
                      <p className='text-sm break-all'>{item.url}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className='text-sm text-muted-foreground'>No sold URLs yet.</p>
              )}
            </div>
          </div>
        </div>
      )
    }

    return (
      <TransferProductForm
        initialData={data}
        categories={categories}
        onSuccessAction={() => {
          handleDialogClose()
          mutate?.()
        }}
      />
    )
  }

  return (
    <>
      <div className='flex items-center gap-2'>
        <button
          type='button'
          className='inline-flex items-center justify-center rounded-lg border border-white/10 bg-primary/85 hover:bg-primary hover:scale-[1.03] h-10 w-10 text-white transition-all'
          onClick={() => handleAction('edit', data)}
          title='Manage item'
        >
          <Plus className='w-4 h-4' />
        </button>
        <ActionsDropdown data={data} actions={actions} />
      </div>
      <actionModal.ModalComponent />

      {/* Dialog for Edit/View */}
      <Dialog open={currentDialog.isOpen} onOpenChange={handleDialogClose}>
        <DialogContent
          className={`max-h-[90vh] overflow-y-auto custom-scrollbar sm:max-w-3xl md:max-w-4xl lg:max-w-5xl ${
            currentDialog.type === 'edit' ? 'max-w-[min(95vw,90rem)]' : 'max-w-[min(92vw,72rem)]'
          }`}
        >
          <DialogHeader>
            <DialogTitle>{getDialogTitle()}</DialogTitle>
          </DialogHeader>
          {renderDialogContent()}
        </DialogContent>
      </Dialog>
    </>
  )
}

// Transfer product columns function
export const transferProductColumns = (mutate?: () => void): TableColumn<any>[] => {
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
      key: 'name',
      header: 'Name',
      render: (_, record) => (
        <div className='flex flex-col'>
          <div className='font-medium'>{record.name || 'N/A'}</div>
          <div className='flex gap-2 text-muted text-xs'>
            <span>SKU: {record.sku || 'N/A'}</span>
          </div>
        </div>
      ),
      width: 'w-40'
    },
    {
      key: 'stockCount',
      header: 'Stock',
      render: (value) => value ?? 0,
      width: 'w-32'
    },
    {
      key: 'price',
      header: 'Price',
      render: (value) => <span>${value || 0}</span>,
      width: 'w-32'
    },
    {
      key: 'soldCount',
      header: 'Sold',
      render: (value) => value ?? 0,
      width: 'w-32'
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (_, record) => (
        <Badge
          className={`
          px-2 py-1 text-xs font-normal border-0 text-white
          ${record.isActive ? 'bg-[#10B981]' : 'bg-[#EF4444]'}
        `}
        >
          {record.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
      width: 'w-28'
    },
    {
      key: 'revenue',
      header: 'Revenue',
      render: (_, record) => <span>${(record?.price || 0) * (record?.soldCount || 0)}</span>,
      width: 'w-32'
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, data) => <ActionsCell data={data} mutate={mutate} />,
      width: 'w-20'
    }
  ]
}

// Export the default columns for backward compatibility
export const defaultTransferProductColumns = transferProductColumns()
