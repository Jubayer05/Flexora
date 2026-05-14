'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import useAsync from '@/hooks/useAsync'
import { showError } from '@/lib/errMsg'
import requests from '@/services/network/http'
import { Archive, Link2, MoreHorizontal, Pencil, Trash2, Image as ImageIcon, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { EditTelegramAccountModal } from './EditTelegramAccountModal'

// Custom table column type
export interface TableColumn<T = any> {
  key: string
  header: string | React.ReactNode
  render?: (value: any, data: T, index: number) => React.ReactNode
  width?: string
  className?: string
}

const ActionsCell = ({
  account,
  mutate
}: {
  account: TelegramAccountResponse
  mutate?: () => void
}) => {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [banDialogOpen, setBanDialogOpen] = useState(false)
  const [soldDialogOpen, setSoldDialogOpen] = useState(false)
  const [refreshDialogOpen, setRefreshDialogOpen] = useState(false)
  const [proxyDialogOpen, setProxyDialogOpen] = useState(false)
  const [kickDialogOpen, setKickDialogOpen] = useState(false)
  const [kickAllDialogOpen, setKickAllDialogOpen] = useState(false)
  const [unarchiveDialogOpen, setUnarchiveDialogOpen] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [isLinking, setIsLinking] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isBanning, setIsBanning] = useState(false)
  const [isMarkingSold, setIsMarkingSold] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isAssigningProxy, setIsAssigningProxy] = useState(false)
  const [isKicking, setIsKicking] = useState(false)
  const [isKickingAll, setIsKickingAll] = useState(false)
  const [isUnarchiving, setIsUnarchiving] = useState(false)
  const [isCopyingInfo, setIsCopyingInfo] = useState(false)
  const [isCopyingUsername, setIsCopyingUsername] = useState(false)
  const [isRequestingOTP, setIsRequestingOTP] = useState(false)
  const [reLoginDialogOpen, setReLoginDialogOpen] = useState(false)
  const [isReLoggingIn, setIsReLoggingIn] = useState(false)

  // Fetch products for linking - only Telegram Accounts products
  const { data: productsData, loading: loadingProducts } = useAsync<{
    data: { products: Product[] }
  }>(() => (linkDialogOpen ? '/admin/products?limit=100' : null))

  const products = (productsData?.data?.products || []).filter(
    (product: Product) =>
      (product.type as string) === 'TELEGRAM_ACCOUNTS' ||
      (product.platform === 'TELEGRAM' && (product.type as string) === 'ACCOUNT')
  )

  const handleDelete = async () => {
    try {
      setIsDeleting(true)
      await requests.delete(`/admin/telegram-accounts/${account.id}`)
      toast.success('Telegram account deleted successfully')
      setDeleteDialogOpen(false)
      mutate?.()
    } catch (error) {
      showError(error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleLinkProduct = async () => {
    if (!selectedProductId) {
      toast.error('Please select a product')
      return
    }

    setIsLinking(true)
    try {
      await requests.put(`/admin/telegram-accounts/${account.id}`, {
        productId: parseInt(selectedProductId)
      })
      toast.success('Account linked to product successfully')
      setLinkDialogOpen(false)
      setSelectedProductId('')
      mutate?.()
    } catch (error) {
      showError(error)
    } finally {
      setIsLinking(false)
    }
  }

  const handleArchive = async () => {
    try {
      await requests.put(`/admin/telegram-accounts/${account.id}`, {
        archived: true
      })
      toast.success('Account archived successfully')
      mutate?.()
    } catch (error) {
      showError(error)
    }
  }

  const handleUnarchive = async () => {
    try {
      setIsUnarchiving(true)
      await requests.put(`/admin/telegram-accounts/${account.id}`, {
        archived: false
      })
      toast.success('Account unarchived successfully')
      setUnarchiveDialogOpen(false)
      mutate?.()
    } catch (error) {
      showError(error)
    } finally {
      setIsUnarchiving(false)
    }
  }

  const handleBan = async () => {
    try {
      setIsBanning(true)
      await requests.put(`/admin/telegram-accounts/${account.id}`, {
        isValid: false,
        meta: {
          ...(account.meta || {}),
          accountHealthStatus: 'BANNED',
          accountHealthMessage: 'Account marked as banned by admin'
        }
      })
      toast.success('Account marked as banned successfully')
      setBanDialogOpen(false)
      mutate?.()
    } catch (error) {
      showError(error)
    } finally {
      setIsBanning(false)
    }
  }

  const handleMarkSold = async () => {
    try {
      setIsMarkingSold(true)
      await requests.put(`/admin/telegram-accounts/${account.id}`, {
        isUsed: true,
        usedAt: new Date().toISOString()
      })
      toast.success('Account marked as sold successfully')
      setSoldDialogOpen(false)
      mutate?.()
    } catch (error) {
      showError(error)
    } finally {
      setIsMarkingSold(false)
    }
  }

  const handleRefreshSession = async () => {
    if (!account.phone) {
      toast.error('Phone number is required to refresh session status')
      return
    }

    try {
      setIsRefreshing(true)
      const response = await requests.get<{
        success: boolean
        message: string
        isAuthorized?: boolean
      }>(`/admin/telegram-sessions/session-status/${encodeURIComponent(account.phone)}`)

      if (response.success) {
        toast.success(
          response.isAuthorized
            ? 'Session is active and account status was refreshed.'
            : response.message || 'Session requires re-login.'
        )
      } else {
        toast.error(response.message || 'Failed to refresh session status')
      }

      setRefreshDialogOpen(false)
      mutate?.()
    } catch (error) {
      showError(error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleAssignProxy = async () => {
    try {
      setIsAssigningProxy(true)
      await requests.post(`/admin/telegram-accounts/${account.id}/proxy/auto-assign`, {})
      toast.success('Fresh proxy assigned successfully from available proxy pool')
      setProxyDialogOpen(false)
      mutate?.()
    } catch (error) {
      showError(error)
    } finally {
      setIsAssigningProxy(false)
    }
  }

  const handleKickSession = async () => {
    try {
      setIsKicking(true)
      // Artificial 1 second delay
      await new Promise((resolve) => setTimeout(resolve, 1000))
      toast.success('Own session kicked successfully')
      setKickDialogOpen(false)
    } catch (error) {
      showError(error)
    } finally {
      setIsKicking(false)
    }
  }

  const handleKickAllSessions = async () => {
    if (!account.phone) {
      toast.error('Phone number is required to kick other sessions')
      return
    }

    try {
      setIsKickingAll(true)
      const response = await requests.post<{
        success: boolean
        message: string
        kicked: number
        remaining: number
      }>('/admin/telegram-sessions/kick-other-sessions', {
        phoneNumber: account.phone
      })

      if (response.success) {
        toast.success(
          response.message ||
            `Successfully kicked ${response.kicked} other session(s). ${response.remaining} session(s) remaining.`
        )
        setKickAllDialogOpen(false)
        mutate?.()
      } else {
        toast.error(response.message || 'Failed to kick other sessions')
      }
    } catch (error) {
      showError(error)
    } finally {
      setIsKickingAll(false)
    }
  }

  const handleCopyFullAccountInfo = async () => {
    try {
      setIsCopyingInfo(true)

      // Fetch credentials from API
      const response = await requests.get<{
        data: {
          phone?: string
          email?: string
          username?: string
          password?: string
        }
      }>(`/admin/telegram-accounts/${account.id}/credentials`)

      const credentials = response.data

      // Format account info
      const accountInfo = `
Telegram Account #${account.id}
━━━━━━━━━━━━━━━━━━━━━━━━━━
Phone: ${credentials.phone || account.phone || 'N/A'}
Email: ${credentials.email || 'N/A'}
Username: ${credentials.username || 'N/A'}
Password: ${credentials.password || 'N/A'}
Status: ${account.status || 'N/A'}
Session Path: ${account.sessionPath || 'N/A'}
Created At: ${new Date(account.createdAt).toLocaleString()}
━━━━━━━━━━━━━━━━━━━━━━━━━━
      `.trim()

      // Copy to clipboard
      await navigator.clipboard.writeText(accountInfo)
      toast.success('Full account info copied to clipboard')
    } catch (error) {
      showError(error)
    } finally {
      setIsCopyingInfo(false)
    }
  }

  const handleCopyUsername = async () => {
    try {
      setIsCopyingUsername(true)

      // Fetch credentials from API to get username
      const response = await requests.get<{
        data: {
          username?: string
        }
      }>(`/admin/telegram-accounts/${account.id}/credentials`)

      const username = response.data.username

      if (!username) {
        toast.error('No username available for this account')
        return
      }

      // Copy to clipboard
      await navigator.clipboard.writeText(username)
      toast.success('Username copied to clipboard')
    } catch (error) {
      showError(error)
    } finally {
      setIsCopyingUsername(false)
    }
  }

  const handleRequestOTP = async () => {
    if (!account.phone) {
      toast.error('Phone number is required to request OTP')
      return
    }

    try {
      setIsRequestingOTP(true)
      const response = await requests.post<{ success: boolean; message?: string }>(
        '/admin/telegram-sessions/request-otp',
        {
          phoneNumber: account.phone
        }
      )

      if (response.success) {
        toast.success('OTP code found! Check notifications for the code.')
      } else {
        toast.error(response.message || 'Failed to retrieve OTP code')
      }
    } catch (error) {
      showError(error)
    } finally {
      setIsRequestingOTP(false)
    }
  }

  const handleReLogin = async () => {
    if (!account.phone) {
      toast.error('Phone number is required to re-login')
      return
    }

    try {
      setIsReLoggingIn(true)
      // Create a new session for re-login
      const response = await requests.post<{ success: boolean; message?: string }>(
        '/admin/telegram-sessions/create-session',
        {
          phoneNumber: account.phone
        }
      )

      if (response.success) {
        toast.success('Re-login initiated. Please check for OTP code.')
        setReLoginDialogOpen(false)
        mutate?.()
      } else {
        toast.error(response.message || 'Failed to initiate re-login')
      }
    } catch (error) {
      showError(error)
    } finally {
      setIsReLoggingIn(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' className='h-8 w-8 p-0'>
            <span className='sr-only'>Open menu</span>
            <MoreHorizontal className='h-4 w-4' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => navigator.clipboard.writeText(account.id.toString())}>
            Copy Account ID
          </DropdownMenuItem>
          {account.phone && (
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(account.phone!)}>
              Copy Phone Number
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={handleCopyUsername} disabled={isCopyingUsername}>
            {isCopyingUsername ? 'Copying...' : 'Copy Username'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCopyFullAccountInfo} disabled={isCopyingInfo}>
            {isCopyingInfo ? 'Copying...' : 'Copy Full Account Info'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
            <Pencil className='mr-2 h-4 w-4' />
            Edit Account
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setLinkDialogOpen(true)}>
            <Link2 className='mr-2 h-4 w-4' />
            Move to Another Product
          </DropdownMenuItem>
          {account.archived ? (
            <DropdownMenuItem onClick={() => setUnarchiveDialogOpen(true)}>
              <Archive className='mr-2 h-4 w-4' />
              Unarchive Account
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={handleArchive}>
              <Archive className='mr-2 h-4 w-4' />
              Archive Account
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setRefreshDialogOpen(true)}>
            Refresh Session
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleRequestOTP} disabled={isRequestingOTP || !account.phone}>
            {isRequestingOTP ? 'Requesting...' : 'Get Code'}
          </DropdownMenuItem>
          {(account.status === 'used' ||
            account.status === 'relogin_required' ||
            account.status === 'broke' ||
            account.status === 'invalid') && (
            <DropdownMenuItem onClick={() => setReLoginDialogOpen(true)} disabled={!account.phone}>
              Re-login Account
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => setProxyDialogOpen(true)}>
            Assign New Proxy
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setKickDialogOpen(true)}>
            Kick Own Session
          </DropdownMenuItem>
          <DropdownMenuItem className='text-orange-600' onClick={() => setKickAllDialogOpen(true)}>
            Kick Other Sessions
          </DropdownMenuItem>
          <DropdownMenuItem className='text-blue-600' onClick={() => setSoldDialogOpen(true)}>
            Mark as Sold
          </DropdownMenuItem>
          <DropdownMenuItem className='text-orange-600' onClick={() => setBanDialogOpen(true)}>
            Mark as Banned
          </DropdownMenuItem>
          <DropdownMenuItem className='text-red-600' onClick={() => setDeleteDialogOpen(true)}>
            <Trash2 className='mr-2 h-4 w-4' />
            Delete Account
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Account Modal */}
      <EditTelegramAccountModal
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        account={account}
        onSuccess={mutate}
      />

      {/* Ban Confirmation Dialog */}
      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Mark Account as Banned</DialogTitle>
            <DialogDescription>
              Are you sure you want to mark this Telegram account (
              {account.phone || `#${account.id}`}) as banned? This will mark it as invalid and
              prevent it from being used.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={() => setBanDialogOpen(false)} disabled={isBanning}>
              Cancel
            </Button>
            <Button variant='destructive' onClick={handleBan} disabled={isBanning}>
              {isBanning ? 'Marking...' : 'Mark as Banned'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unarchive Confirmation Dialog */}
      <Dialog open={unarchiveDialogOpen} onOpenChange={setUnarchiveDialogOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Unarchive Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to unarchive this Telegram account (
              {account.phone || `#${account.id}`})? This will make it available again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setUnarchiveDialogOpen(false)}
              disabled={isUnarchiving}
            >
              Cancel
            </Button>
            <Button onClick={handleUnarchive} disabled={isUnarchiving}>
              {isUnarchiving ? 'Unarchiving...' : 'Unarchive'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refresh Session Confirmation Dialog */}
      <Dialog open={refreshDialogOpen} onOpenChange={setRefreshDialogOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Refresh Session</DialogTitle>
            <DialogDescription>
              Are you sure you want to refresh the session for this Telegram account (
              {account.phone || `#${account.id}`})? This will attempt to renew the session data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setRefreshDialogOpen(false)}
              disabled={isRefreshing}
            >
              Cancel
            </Button>
            <Button onClick={handleRefreshSession} disabled={isRefreshing}>
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign New Proxy Confirmation Dialog */}
      <Dialog open={proxyDialogOpen} onOpenChange={setProxyDialogOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Auto-Assign Fresh Proxy</DialogTitle>
            <DialogDescription>
              This will automatically fetch and assign the next healthy proxy from the available
              proxy pool to this account ({account.phone || `#${account.id}`}). This will replace any
              existing proxy configuration.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setProxyDialogOpen(false)}
              disabled={isAssigningProxy}
            >
              Cancel
            </Button>
            <Button onClick={handleAssignProxy} disabled={isAssigningProxy}>
              {isAssigningProxy ? 'Assigning...' : 'Assign Proxy'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Kick Own Session Confirmation Dialog */}
      <Dialog open={kickDialogOpen} onOpenChange={setKickDialogOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Kick Own Session</DialogTitle>
            <DialogDescription>
              Are you sure you want to kick the own session for this Telegram account (
              {account.phone || `#${account.id}`})? This will terminate the current active session.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={() => setKickDialogOpen(false)} disabled={isKicking}>
              Cancel
            </Button>
            <Button variant='destructive' onClick={handleKickSession} disabled={isKicking}>
              {isKicking ? 'Kicking...' : 'Kick Session'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Kick Other Sessions Confirmation Dialog */}
      <Dialog open={kickAllDialogOpen} onOpenChange={setKickAllDialogOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Kick Other Sessions</DialogTitle>
            <DialogDescription>
              Are you sure you want to kick all other active sessions for this Telegram account (
              {account.phone || `#${account.id}`})?
              <br />
              <br />
              This will disconnect all other active sessions (Mobile, Desktop, Web, API) but will
              keep the current admin session active. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setKickAllDialogOpen(false)}
              disabled={isKickingAll}
            >
              Cancel
            </Button>
            <Button variant='destructive' onClick={handleKickAllSessions} disabled={isKickingAll}>
              {isKickingAll ? 'Kicking Other Sessions...' : 'Kick Other Sessions'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark as Sold Confirmation Dialog */}
      <Dialog open={soldDialogOpen} onOpenChange={setSoldDialogOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Mark Account as Sold</DialogTitle>
            <DialogDescription>
              Are you sure you want to mark this Telegram account (
              {account.phone || `#${account.id}`}) as sold? This will mark it as used with the
              current date and time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setSoldDialogOpen(false)}
              disabled={isMarkingSold}
            >
              Cancel
            </Button>
            <Button onClick={handleMarkSold} disabled={isMarkingSold}>
              {isMarkingSold ? 'Marking...' : 'Mark as Sold'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Delete Telegram Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this Telegram account (
              {account.phone || `#${account.id}`})? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button variant='destructive' onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Re-login Dialog */}
      <Dialog open={reLoginDialogOpen} onOpenChange={setReLoginDialogOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Re-login Account</DialogTitle>
            <DialogDescription>
              This will initiate a new login session for account {account.phone || `#${account.id}`}.
              You will need to verify the OTP code sent to the phone number.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setReLoginDialogOpen(false)}
              disabled={isReLoggingIn}
            >
              Cancel
            </Button>
            <Button onClick={handleReLogin} disabled={isReLoggingIn || !account.phone}>
              {isReLoggingIn ? 'Initiating...' : 'Re-login'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Product Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Link to Another Product</DialogTitle>
            <DialogDescription>
              Select a product to link this Telegram account (#{account.id}) to.
            </DialogDescription>
          </DialogHeader>
          <div className='py-4'>
            <Select value={selectedProductId} onValueChange={setSelectedProductId}>
              <SelectTrigger>
                <SelectValue placeholder='Select a product...' />
              </SelectTrigger>
              <SelectContent>
                {loadingProducts ? (
                  <SelectItem value='loading' disabled>
                    Loading products...
                  </SelectItem>
                ) : products.length === 0 ? (
                  <SelectItem value='empty' disabled>
                    No products found
                  </SelectItem>
                ) : (
                  products.map((product: Product) => (
                    <SelectItem key={product.id} value={product.id.toString()}>
                      {product.name} ({product.sku})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setLinkDialogOpen(false)} disabled={isLinking}>
              Cancel
            </Button>
            <Button onClick={handleLinkProduct} disabled={!selectedProductId || isLinking}>
              {isLinking ? 'Linking...' : 'Link Product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export const telegramAccountColumns = (
  mutate?: () => void,
  selectedIds?: number[],
  handleSelectAll?: (checked: boolean) => void,
  handleSelectOne?: (id: number, checked: boolean) => void
): TableColumn<TelegramAccountResponse>[] => [
  {
    key: 'select',
    header: (
      <Checkbox
        className=''
        checked={selectedIds && selectedIds.length > 0 && handleSelectAll !== undefined}
        onCheckedChange={(checked) => handleSelectAll?.(checked as boolean)}
      />
    ),
    render: (_value, account: TelegramAccountResponse) => (
      <Checkbox
        className=''
        checked={selectedIds?.includes(account.id) || false}
        onCheckedChange={(checked) => handleSelectOne?.(account.id, checked as boolean)}
      />
    ),
    width: 'w-10'
  },
  {
    key: 'id',
    header: 'ID',
    render: (value) => <div className='font-medium'>#{value}</div>
  },
  {
    key: 'phone',
    header: 'Phone Number',
    render: (value) => <div className='font-mono'>{value || 'N/A'}</div>
  },
  {
    key: 'usedByOrder',
    header: 'Order ID',
    render: (value: TelegramAccountResponse['usedByOrder'], account: TelegramAccountResponse) => {
      if (!value) {
        return <span className='text-sm text-muted-foreground'>N/A</span>
      }
      return (
        <div className='text-sm'>
          <div className='font-medium'>#{value.orderNumber}</div>
          <div className='text-xs text-muted-foreground'>
            {new Date(value.createdAt).toLocaleDateString()}
          </div>
        </div>
      )
    }
  },
  {
    key: 'status',
    header: 'Status',
    render: (value) => {
      const statusColors = {
        available: 'bg-green-500/10 text-green-500 border-green-500/20',
        used: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
        invalid: 'bg-red-500/10 text-red-500 border-red-500/20',
        banned: 'bg-red-500/10 text-red-500 border-red-500/20',
        broke: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
        relogin_required: 'bg-sky-500/10 text-sky-500 border-sky-500/20'
      }
      const statusLabels = {
        available: 'Available',
        used: 'Sold',
        invalid: 'Invalid',
        banned: 'Banned',
        broke: 'Broke',
        relogin_required: 'ReLogin Required'
      }
      return (
        <Badge variant='outline' className={statusColors[value as keyof typeof statusColors]}>
          {statusLabels[value as keyof typeof statusLabels] || value.toUpperCase()}
        </Badge>
      )
    }
  },
  {
    key: 'sessionPath',
    header: 'Session',
    render: (value) => {
      if (!value) {
        return <span className='text-sm text-muted-foreground'>No session</span>
      }
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className='max-w-[200px] truncate text-sm text-muted-foreground cursor-help'>
                {value}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className='max-w-xs break-all'>{value}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    }
  },
  {
    key: 'proxy',
    header: 'Proxy',
    render: (value: TelegramAccountResponse['proxy']) => {
      if (!value || !value.host) {
        return (
          <Badge variant='outline' className='bg-gray-500/10 text-gray-500 border-gray-500/20'>
            No Proxy
          </Badge>
        )
      }
      return (
        <div className='space-y-1'>
          <Badge variant='outline' className='bg-green-500/10 text-green-500 border-green-500/20'>
            Configured
          </Badge>
          <div className='text-sm'>
            <div className='font-mono'>
              {value.host}:{value.port}
            </div>
            {value.username && (
              <div className='text-xs text-muted-foreground'>Auth: {value.username}</div>
            )}
          </div>
        </div>
      )
    }
  },
  {
    key: 'createdAt',
    header: 'Created At',
    render: (value) => {
      const date = new Date(value)
      return (
        <div className='text-sm'>
          {date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })}
        </div>
      )
    }
  },
  {
    key: 'actions',
    header: 'Actions',
    render: (_value, account: TelegramAccountResponse) => (
      <ActionsCell account={account} mutate={mutate} />
    )
  }
]
