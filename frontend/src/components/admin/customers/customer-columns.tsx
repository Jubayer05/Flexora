'use client'

import { Ban, Check, Mail, Pencil, Trash2, User, UserX, X } from 'lucide-react'
import { useState } from 'react'

import { ActionsDropdown } from '@/components/admin/common/ActionsDropdown'
import CustomImage from '@/components/common/CustomImage'
import { RechargeHistoryModal } from '@/components/admin/customers/RechargeHistoryModal'
import { ViewPurchasesModal } from '@/components/admin/customers/ViewPurchasesModal'
import CustomerForm from '@/components/admin/form/Customer'
import ManageFundsForm from '@/components/admin/form/ManageFundsForm'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useConfirmationModal } from '@/hooks/useConfirmationModal'
import { showError } from '@/lib/errMsg'
import requests from '@/services/network/http'
import { toast } from 'sonner'
import { CustomerActionType, getCustomerActions } from './customerActions'

// Custom table column type
export interface TableColumn<T = any> {
  key: string
  header: string | React.ReactNode
  render?: (value: any, data: T, index: number) => React.ReactNode
  width?: string
  className?: string
}

const EditableNotes = ({
  value,
  customerId,
  onClose
}: {
  value: string | null
  customerId: number
  onClose?: () => void
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value || '')
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const readyData = {
        id: customerId,
        note: editValue
      }

      await requests.put(`/admin/customers/${customerId}`, readyData)

      toast.success(`Customer notes updated successfully`)
      // Close modal and reset form
      onClose?.()
    } catch (error) {
      showError(error)
    } finally {
      setIsSaving(false)
      setIsEditing(false)
    }
  }

  const handleCancel = () => {
    setEditValue(value || '')
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className='flex items-center gap-1 max-w-48 animate-in duration-200 fade-in-0'>
        <Input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className='bg-background border-border focus:border-ring h-7 text-foreground placeholder:text-muted-foreground text-xs'
          placeholder='Add notes...'
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave()
            if (e.key === 'Escape') handleCancel()
          }}
        />
        <Button
          variant='ghost'
          size='sm'
          className={`p-1 w-6 h-6 shrink-0 transition-colors ${
            isSaving
              ? 'text-blue-400 hover:text-blue-300'
              : 'text-green-400 hover:text-green-300 hover:bg-green-500/10'
          }`}
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <div className='border-2 border-current border-t-transparent rounded-full w-3 h-3 animate-spin' />
          ) : (
            <Check size={12} />
          )}
          <span className='sr-only'>Save notes</span>
        </Button>
        <Button
          variant='ghost'
          size='sm'
          className='hover:bg-red-500/10 p-1 w-6 h-6 text-red-400 hover:text-red-300 shrink-0'
          onClick={handleCancel}
          disabled={isSaving}
        >
          <X size={12} />
          <span className='sr-only'>Cancel edit</span>
        </Button>
      </div>
    )
  }

  return (
    <div className='group flex items-center gap-2 max-w-48'>
      <span className='flex-1 font-normal text-foreground truncate'>{value ?? '-'}</span>
      <Button
        variant='ghost'
        size='sm'
        className='hover:bg-muted opacity-0 group-hover:opacity-100 p-1 w-6 h-6 text-muted-foreground hover:text-foreground transition-all duration-200 shrink-0'
        onClick={() => setIsEditing(true)}
      >
        <Pencil size={12} />
        <span className='sr-only'>Edit notes</span>
      </Button>
    </div>
  )
}

const SendMailButton = ({ data }: { data: User }) => {
  const isSyntheticGuest = (data as any)?.customerListSource === 'guest-order'
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)
  const [emailData, setEmailData] = useState({ subject: '', body: '' })
  const [isSendingEmail, setIsSendingEmail] = useState(false)

  const handleSendEmail = async () => {
    if (!emailData.body.trim()) {
      toast.error('Email body is required')
      return
    }

    setIsSendingEmail(true)
    try {
      await requests.post(`/admin/users/${data.id}/send-email`, {
        subject: emailData.subject.trim() || 'Message from UHQ Account',
        body: emailData.body.trim()
      })
      toast.success('Email sent successfully')
      setEmailDialogOpen(false)
      setEmailData({ subject: '', body: '' })
    } catch (error) {
      showError(error)
    } finally {
      setIsSendingEmail(false)
    }
  }

  const handleEmailDialogClose = () => {
    setEmailDialogOpen(false)
    setEmailData({ subject: '', body: '' })
  }

  return (
    <>
      {isSyntheticGuest ? (
        <span className='text-muted-foreground'>-</span>
      ) : (
        <Button
          variant='ghost'
          size='sm'
          className='hover:bg-muted p-0 w-8 h-8 text-muted-foreground hover:text-foreground'
          onClick={() => setEmailDialogOpen(true)}
        >
          <Mail className='w-4 h-4' />
          <span className='sr-only'>Send mail</span>
        </Button>
      )}

      {/* Send Email Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={handleEmailDialogClose}>
        <DialogContent className='max-w-lg'>
          <DialogHeader>
            <DialogTitle>Send Email to {data.firstName || data.email}</DialogTitle>
          </DialogHeader>
          <div className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='email-subject'>Subject (Optional)</Label>
              <Input
                id='email-subject'
                placeholder='Enter email subject...'
                value={emailData.subject}
                onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='email-body'>
                Message <span className='text-red-500'>*</span>
              </Label>
              <Textarea
                id='email-body'
                placeholder='Enter your message...'
                value={emailData.body}
                onChange={(e) => setEmailData({ ...emailData, body: e.target.value })}
                rows={8}
                className='resize-none'
              />
            </div>
            <div className='flex justify-end gap-2'>
              <Button variant='outline' onClick={handleEmailDialogClose} disabled={isSendingEmail}>
                Cancel
              </Button>
              <Button onClick={handleSendEmail} disabled={isSendingEmail || !emailData.body.trim()}>
                {isSendingEmail ? (
                  <>
                    <div className='border-2 border-current border-t-transparent rounded-full w-4 h-4 animate-spin mr-2' />
                    Sending...
                  </>
                ) : (
                  'Send Email'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

const ActionsCell = ({ data, mutate }: { data: User; mutate?: () => void }) => {
  const [currentDialog, setCurrentDialog] = useState<{
    type: 'edit' | 'manage-funds'
    isOpen: boolean
  }>({ type: 'edit', isOpen: false })

  const [viewPurchasesOpen, setViewPurchasesOpen] = useState(false)
  const [rechargeHistoryOpen, setRechargeHistoryOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  // Define action configurations with onClick handlers for confirmation modals
  const actionConfigs = {
    delete: {
      title: 'Delete Customer',
      description: 'Are you sure you want to delete this customer? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'destructive' as const,
      icon: Trash2,
      showInput: false,
      inputConfig: undefined,
      onClick: async (customer: User) => {
        try {
          await requests.delete(`/admin/customers/${customer?.id}`)
          toast.success('Customer deleted successfully')
          mutate?.()
        } catch (error) {
          showError(error)
          throw error // Re-throw to prevent modal from closing
        }
      }
    },
    ban: {
      title: 'Ban Customer',
      description:
        'Are you sure you want to ban this customer? They will no longer be able to access the platform.',
      confirmText: 'Ban',
      variant: 'destructive' as const,
      icon: Ban,
      showInput: true,
      inputConfig: {
        name: 'reason',
        label: 'Ban Reason',
        placeholder: 'Please describe ban reason',
        type: 'textarea' as const,
        required: true
      },
      onClick: async (customer: User, inputData?: Record<string, any>) => {
        try {
          await requests.post(`/admin/customers/${customer?.id}/ban`, {
            reason: inputData?.reason || ''
          })
          toast.success('Customer banned successfully')
          mutate?.()
        } catch (error) {
          showError(error)
          throw error
        }
      }
    },
    unban: {
      title: 'Unban Customer',
      description:
        'Are you sure you want to unban this customer? They will regain access to the platform.',
      confirmText: 'Unban',
      variant: 'default' as const,
      icon: UserX,
      showInput: false,
      inputConfig: undefined,
      onClick: async (customer: User) => {
        try {
          await requests.post(`/admin/customers/${customer?.id}/unban`, {})
          toast.success('Customer unbanned successfully')
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
    inputConfig: currentAction ? actionConfigs[currentAction.type].inputConfig : undefined,
    contentClassName: 'font-manrope bg-card border-border sm:max-w-2xl max-h-[90vh] overflow-y-auto'
  })

  // Unified action handler
  const handleCustomerAction = (actionType: CustomerActionType, customer: User) => {
    if (actionType === 'edit' || actionType === 'manage-funds') {
      // Open dialog for form-based actions
      setCurrentDialog({ type: actionType, isOpen: true })
    } else if (actionType === 'view-purchases') {
      setSelectedUser(customer)
      setViewPurchasesOpen(true)
    } else if (actionType === 'recharge-history') {
      setSelectedUser(customer)
      setRechargeHistoryOpen(true)
    } else if (actionType === 'delete' || actionType === 'ban' || actionType === 'unban') {
      // Open confirmation modal for destructive actions
      const config = actionConfigs[actionType as keyof typeof actionConfigs]
      setCurrentAction({ type: actionType as keyof typeof actionConfigs })
      actionModal.openModal(async (inputData) => {
        await config.onClick(customer, inputData)
        setCurrentAction(null)
      })
    }
  }

  const handleDialogSuccess = () => {
    mutate?.() // Refresh the data
    setCurrentDialog({ type: 'edit', isOpen: false })
  }

  const handleDialogClose = () => {
    setCurrentDialog({ type: 'edit', isOpen: false })
  }

  // Render the appropriate form component based on dialog type
  const renderDialogContent = () => {
    const { type } = currentDialog
    const commonProps = {
      customer: data,
      onClose: handleDialogClose,
      onSuccess: handleDialogSuccess
    }

    switch (type) {
      case 'edit':
        return <CustomerForm {...commonProps} />
      case 'manage-funds':
        return <ManageFundsForm {...commonProps} />
      default:
        return <CustomerForm {...commonProps} />
    }
  }

  // Get dialog title based on type
  const getDialogTitle = () => {
    switch (currentDialog.type) {
      case 'edit':
        return 'Edit Customer'
      case 'manage-funds':
        return 'Manage Funds'
      default:
        return 'Customer Action'
    }
  }

  return (
    <>
      <ActionsDropdown
        data={data}
        actions={getCustomerActions(data, mutate, handleCustomerAction)}
      />
      <actionModal.ModalComponent />

      {/* Unified Dialog for all form-based actions */}
      <Dialog open={currentDialog.isOpen} onOpenChange={handleDialogClose}>
        <DialogContent className='sm:max-w-3xl md:max-w-4xl lg:max-w-5xl   xl:max-w-6xl max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>{getDialogTitle()}</DialogTitle>
          </DialogHeader>
          {renderDialogContent()}
        </DialogContent>
      </Dialog>

      {/* View Purchases Modal */}
      <ViewPurchasesModal
        open={viewPurchasesOpen}
        onOpenChange={setViewPurchasesOpen}
        user={selectedUser}
      />

      {/* Recharge History Modal */}
      <RechargeHistoryModal
        open={rechargeHistoryOpen}
        onOpenChange={setRechargeHistoryOpen}
        user={selectedUser}
      />
    </>
  )
}

// Customer columns function that accepts mutate callback
export const createCustomerColumns = (mutate?: () => void): TableColumn<User>[] => {
  const getVersionedPhotoUrl = (record: User) => {
    const photoUrl = (record as any).photoUrl
    if (!photoUrl) return ''

    const updatedAt = (record as any).updatedAt
    if (!updatedAt) return photoUrl

    const separator = photoUrl.includes('?') ? '&' : '?'
    return `${photoUrl}${separator}v=${encodeURIComponent(updatedAt)}`
  }

  return [
    {
      key: 'photo',
      header: '',
      render: (_, record) => {
        const photoUrl = getVersionedPhotoUrl(record)

        return (
          <div className='w-8 h-8 rounded-full overflow-hidden bg-muted border border-border flex items-center justify-center flex-shrink-0'>
            {photoUrl ? (
              <CustomImage
                src={photoUrl}
                alt={[record.firstName, record.lastName].filter(Boolean).join(' ') || record.email}
                width={32}
                height={32}
                className='w-full h-full object-cover'
                unoptimized
              />
            ) : (
              <User className='w-4 h-4 text-muted-foreground' />
            )}
          </div>
        )
      },
      width: 'w-12'
    },
    {
      key: 'name',
      header: 'Name',
      render: (_, record) => (
        <div className='flex items-center gap-2'>
          <span>{[record.firstName, record.lastName].filter(Boolean).join(' ') || record.email}</span>
          {record.isGuest && (
            <Badge variant='secondary' className='text-[10px] uppercase tracking-wide'>
              Guest
            </Badge>
          )}
        </div>
      ),
      width: 'w-40'
    },
    {
      key: 'email',
      header: 'Email',
      render: (value) => <span>{value ?? '-'}</span>,
      width: 'w-56'
    },
    {
      key: 'country',
      header: 'Country',
      render: (value) => (
        <span className='block max-w-32 font-normal text-foreground truncate'>{value ?? '-'}</span>
      ),
      width: 'w-32'
    },
    {
      key: 'note',
      header: 'Tags/Notes',
      render: (value, record) => (
        <EditableNotes value={value} onClose={mutate} customerId={record.id} />
      ),
      width: 'w-48'
    },
    {
      key: 'lastLoginAt',
      header: 'Last Login',
      render: (value) => {
        if (!value) {
          return <span className='text-muted-foreground'>-</span>
        }
        const date = new Date(value)
        if (Number.isNaN(date.getTime())) {
          return <span className='text-muted-foreground'>-</span>
        }
        return (
          <div>
            <div>
              {date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
            </div>
            <div className='text-muted-foreground text-xs'>
              {date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>
        )
      },
      width: 'w-32'
    },
    {
      key: 'ip',
      header: 'IP',
      render: (_, record) => (
        <span className='font-mono font-normal text-foreground text-xs'>
          {record.lastLoginIp ?? '-'}
        </span>
      ),
      width: 'w-32'
    },
    {
      key: 'device',
      header: 'Device',
      render: (_, record) => {
        const device = record.lastLoginDevice ?? '-'
        if (device === '-') {
          return <span className='block max-w-32 font-normal text-foreground truncate'>{device}</span>
        }
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className='block max-w-32 font-normal text-foreground truncate cursor-help'>
                  {device}
                </span>
              </TooltipTrigger>
              <TooltipContent className='max-w-md break-words'>
                <p className='text-xs'>{device}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      },
      width: 'w-32'
    },
    {
      key: 'totalSpent',
      header: 'totalSpent',
      render: (value) => (
        <span className='block max-w-32 font-normal text-foreground truncate'>{value ?? '-'}</span>
      ),
      width: 'w-32'
    },
    {
      key: 'balance',
      header: 'Balance',
      render: (value) => (
        <span className='block max-w-32 font-semibold text-foreground tracking-wide'>
          ${value ?? '0'}
        </span>
      ),
      width: 'w-32'
    },
    {
      key: 'isBanned',
      header: 'Status',
      render: (_, record) => (
        <Badge
          className={`
          px-2 py-1 text-xs font-normal border-0 
          ${record.isBanned ? 'bg-[#EF4444] text-black' : 'bg-[#10B981] text-black'}
        `}
        >
          {record.isBanned ? <Ban /> : <Check />}
          {record.isBanned ? 'Banned' : 'Active'}
        </Badge>
      ),

      width: 'w-28'
    },
    {
      key: 'sendMail',
      header: 'Send Mail',
      render: (_, record) => <SendMailButton data={record} />,
      width: 'w-24'
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
export const customerColumns = createCustomerColumns()
