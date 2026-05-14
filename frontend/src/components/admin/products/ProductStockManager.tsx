'use client'

import CustomInput from '@/components/common/CustomInput'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import useAsync from '@/hooks/useAsync'
import { showError } from '@/lib/errMsg'
import requests from '@/services/network/http'
import { Copy, Plus, Shuffle, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { mutate as globalMutate } from 'swr'

type StockFormatType = 'NEWLINE' | 'CUSTOM_DELIMITER'
type StockField = 'id' | 'username' | 'email' | 'phone' | 'password' | 'note'

type ProductAccountRow = {
  id: number
  productId: number | null
  platform: string
  isUsed: boolean
  archived?: boolean
  createdAt?: string
  updatedAt?: string
  requiresOtp?: boolean
  hasPremium?: boolean
  meta?: Record<string, any>
}

type TelegramCredentialsResponse = {
  phone?: string
  email?: string
  username?: string
  password?: string
  sessionData?: string
}

const STOCK_FIELD_LABELS: Record<StockField, string> = {
  id: 'Social ID',
  username: 'Username',
  email: 'Email',
  phone: 'Phone',
  password: 'Password',
  note: 'Private Note'
}

const normalizeStockField = (value: string): StockField | null => {
  const normalized = value.trim().toLowerCase().replace(/[\s_-]+/g, '')

  switch (normalized) {
    case 'id':
    case 'socialid':
    case 'social':
      return 'id'
    case 'username':
    case 'user':
    case 'login':
      return 'username'
    case 'email':
    case 'mail':
      return 'email'
    case 'phone':
    case 'number':
    case 'phonenumber':
      return 'phone'
    case 'password':
    case 'pass':
    case 'pwd':
      return 'password'
    case 'note':
    case 'adminnote':
    case 'privatenote':
      return 'note'
    default:
      return null
  }
}

const stringifyTelegramCredentials = (credentials: TelegramCredentialsResponse) => {
  return [credentials.phone, credentials.email, credentials.username, credentials.password]
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean)
    .join(':')
}

export default function ProductStockManager({ product }: { product: Product }) {
  const fetchUrl = `/admin/telegram-accounts/product/${product.id}?includeUsed=true&nonce=${Date.now()}`
  const { data: accountsResponse, loading, mutate } = useAsync<{ data: ProductAccountRow[] }>(
    fetchUrl
  )

  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showBulkTakeDialog, setShowBulkTakeDialog] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [stockFormat, setStockFormat] = useState<StockFormatType>('NEWLINE')
  const [customDelimiter, setCustomDelimiter] = useState(',')
  const [fieldOrder, setFieldOrder] = useState('phone,password,username,note')
  const [bulkStockInput, setBulkStockInput] = useState('')
  const [bulkTakeQuantity, setBulkTakeQuantity] = useState(1)
  const [savingNotes, setSavingNotes] = useState<Record<number, boolean>>({})

  const accounts = Array.isArray(accountsResponse?.data) ? accountsResponse.data : []
  const filteredAccounts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return accounts

    return accounts.filter((account) => {
      const meta = account.meta || {}
      const haystack = [
        meta.phone,
        meta.email,
        meta.username,
        meta.notes,
        meta.adminNote
      ]
        .map((value) => (typeof value === 'string' ? value.toLowerCase() : ''))
        .join(' ')

      return haystack.includes(query)
    })
  }, [accounts, searchQuery])

  const availableAccounts = filteredAccounts.filter((account) => !account.isUsed && !account.archived)
  const availableStockCount = accounts.filter((account) => !account.isUsed && !account.archived).length
  const selectedAccounts = filteredAccounts.filter((account) => selectedIds.includes(account.id))
  const allFilteredSelected =
    filteredAccounts.length > 0 && filteredAccounts.every((account) => selectedIds.includes(account.id))

  const toggleSelection = (accountId: number) => {
    setSelectedIds((prev) =>
      prev.includes(accountId) ? prev.filter((id) => id !== accountId) : [...prev, accountId]
    )
  }

  const toggleSelectAllFiltered = () => {
    setSelectedIds((prev) => {
      const filteredIds = filteredAccounts.map((account) => account.id)
      if (allFilteredSelected) {
        return prev.filter((id) => !filteredIds.includes(id))
      }

      return Array.from(new Set([...prev, ...filteredIds]))
    })
  }

  const refreshStock = async () => {
    await mutate()
    await globalMutate(
      (key) => typeof key === 'string' && key.startsWith('/admin/products'),
      undefined,
      { revalidate: true }
    )
  }

  const handleAddStock = async () => {
    const parsedFields = fieldOrder
      .split(',')
      .map((field) => normalizeStockField(field))
      .filter((field): field is StockField => Boolean(field))

    if (parsedFields.length === 0) {
      toast.error('Set a valid field order such as phone,password,username,note')
      return
    }

    const lines = bulkStockInput.trim().split('\n').filter((line) => line.trim())
    if (lines.length === 0) {
      toast.error('Paste at least one stock line')
      return
    }

    const delimiter = stockFormat === 'NEWLINE' ? ':' : customDelimiter
    const accountsPayload = lines
      .map((line) => {
        const parts = line.split(delimiter).map((part) => part.trim())
        const credentials: Record<string, string> = {}

        parsedFields.forEach((field, index) => {
          const value = parts[index] || ''
          if (value) credentials[field] = value
        })

        if (!credentials.phone && !credentials.username && !credentials.email) {
          return null
        }

        const adminNote = credentials.note || ''

        return {
          credentials,
          isValid: true,
          requiresOtp: true,
          hasPremium: false,
          meta: adminNote ? { adminNote, phone: credentials.phone, username: credentials.username } : undefined
        }
      })
      .filter(Boolean)

    if (accountsPayload.length === 0) {
      toast.error('No valid Telegram stock lines were found')
      return
    }

    setIsSaving(true)
    try {
      const response = await requests.post<{ message?: string }>(`/admin/accounts/serial/bulk`, {
        productId: product.id,
        platform: 'TELEGRAM',
        accounts: accountsPayload
      })

      toast.success(response?.message || `Added ${accountsPayload.length} stock item(s)`)
      setShowAddDialog(false)
      setBulkStockInput('')
      await refreshStock()
    } catch (error) {
      showError(error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (account: ProductAccountRow) => {
    if (account.isUsed) {
      toast.error('Used stock cannot be deleted')
      return
    }

    const confirmed = window.confirm(`Delete stock item #${account.id}?`)
    if (!confirmed) return

    setIsDeletingId(account.id)
    try {
      await requests.delete(`/admin/telegram-accounts/${account.id}`)
      setSelectedIds((prev) => prev.filter((id) => id !== account.id))
      toast.success('Stock deleted successfully')
      await refreshStock()
    } catch (error) {
      showError(error)
    } finally {
      setIsDeletingId(null)
    }
  }

  const handleDeleteSelected = async () => {
    const deletableAccounts = selectedAccounts.filter((account) => !account.isUsed)

    if (deletableAccounts.length === 0) {
      toast.error('No unused selected stock items to delete')
      return
    }

    const confirmed = window.confirm(`Delete ${deletableAccounts.length} selected stock item(s)?`)
    if (!confirmed) return

    setIsBulkDeleting(true)
    try {
      await Promise.all(
        deletableAccounts.map((account) => requests.delete(`/admin/telegram-accounts/${account.id}`))
      )
      setSelectedIds((prev) => prev.filter((id) => !deletableAccounts.some((account) => account.id === id)))
      toast.success(`Deleted ${deletableAccounts.length} stock item(s)`)
      await refreshStock()
    } catch (error) {
      showError(error)
    } finally {
      setIsBulkDeleting(false)
    }
  }

  const fetchSelectedCredentials = async (accountsToCopy: ProductAccountRow[]) => {
    const credentialsList = await Promise.all(
      accountsToCopy.map(async (account) => {
        const response = await requests.get<{ data?: TelegramCredentialsResponse; phone?: string }>(
          `/admin/telegram-accounts/${account.id}/credentials`
        )
        const raw = (response as any)?.data ?? response
        return stringifyTelegramCredentials(raw)
      })
    )

    return credentialsList.filter(Boolean)
  }

  const handleCopySelected = async () => {
    if (selectedAccounts.length === 0) {
      toast.error('Select at least one stock item to copy')
      return
    }

    try {
      const lines = await fetchSelectedCredentials(selectedAccounts)
      if (lines.length === 0) {
        toast.error('No credentials available for the selected accounts')
        return
      }

      await navigator.clipboard.writeText(lines.join('\n'))
      toast.success(`Copied ${lines.length} stock item${lines.length > 1 ? 's' : ''}`)
    } catch (error) {
      showError(error)
    }
  }

  const handleBulkTake = async () => {
    if (bulkTakeQuantity < 1 || bulkTakeQuantity > availableAccounts.length) return

    const shuffled = [...availableAccounts].sort(() => 0.5 - Math.random())
    const takenAccounts = shuffled.slice(0, bulkTakeQuantity)

    try {
      const lines = await fetchSelectedCredentials(takenAccounts)
      if (lines.length === 0) {
        toast.error('No credentials available for the selected accounts')
        return
      }

      await navigator.clipboard.writeText(lines.join('\n'))
      setSelectedIds(takenAccounts.map((account) => account.id))
      setShowBulkTakeDialog(false)
      setBulkTakeQuantity(1)
      toast.success(`Copied ${lines.length} random stock item${lines.length > 1 ? 's' : ''}`)
    } catch (error) {
      showError(error)
    }
  }

  const handleNoteSave = async (accountId: number, note: string) => {
    setSavingNotes((prev) => ({ ...prev, [accountId]: true }))
    try {
      await requests.put(`/admin/telegram-accounts/${accountId}`, {
        meta: {
          adminNote: note
        }
      })
      await mutate()
      toast.success('Admin note updated')
    } catch (error) {
      showError(error)
    } finally {
      setSavingNotes((prev) => ({ ...prev, [accountId]: false }))
    }
  }

  return (
    <div className='space-y-6'>
      <div className='rounded-lg border border-border bg-card p-4'>
        <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
          <div>
            <h2 className='text-lg font-medium'>Telegram Stock</h2>
            <p className='text-sm text-muted-foreground'>
              Telegram stock is calculated from the linked accounts for {product.name}.
            </p>
          </div>

          <div className='flex flex-col gap-2 sm:items-end'>
            <p className='text-sm text-muted-foreground'>Available stock</p>
            <p className='text-2xl font-semibold'>{availableStockCount}</p>
            <Button type='button' onClick={() => setShowAddDialog(true)}>
              <Plus className='mr-2 h-4 w-4' />
              Add Stock
            </Button>
          </div>
        </div>

        <div className='mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
          <div className='flex flex-wrap gap-2'>
            <Button type='button' variant='outline' onClick={handleCopySelected} disabled={selectedAccounts.length === 0}>
              <Copy className='mr-2 h-4 w-4' />
              Copy Selected
            </Button>
            <Button
              type='button'
              variant='destructive'
              onClick={handleDeleteSelected}
              disabled={selectedAccounts.length === 0 || isBulkDeleting}
            >
              <Trash2 className='mr-2 h-4 w-4' />
              {isBulkDeleting ? 'Deleting...' : 'Delete Selected'}
            </Button>
            <Button
              type='button'
              variant='outline'
              onClick={() => setShowBulkTakeDialog(true)}
              disabled={availableAccounts.length === 0}
            >
              <Shuffle className='mr-2 h-4 w-4' />
              Bulk Take
            </Button>
          </div>

          <div className='w-full lg:w-80'>
            <CustomInput
              type='text'
              placeholder='Search stock'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className='overflow-x-auto rounded-lg border border-border'>
        <div className='min-w-[980px]'>
          <div className='grid grid-cols-[44px_160px_180px_130px_220px_120px_70px] gap-3 border-b border-border bg-card/50 px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground'>
            <div className='flex items-center justify-center'>
              <Checkbox checked={allFilteredSelected} onCheckedChange={toggleSelectAllFiltered} />
            </div>
            <div>Phone</div>
            <div>Username / Email</div>
            <div>Status</div>
            <div>Admin Note</div>
            <div>Created</div>
            <div>Delete</div>
          </div>

          {filteredAccounts.length === 0 ? (
            <div className='px-4 py-8 text-center text-sm text-muted-foreground'>
              {loading ? 'Loading stock...' : 'No stock found for this product.'}
            </div>
          ) : (
            filteredAccounts.map((account) => {
              const meta = account.meta || {}
              const usernameOrEmail = meta.username || meta.email || '-'
              const adminNote = meta.adminNote || ''

              return (
                <div
                  key={account.id}
                  className='grid grid-cols-[44px_160px_180px_130px_220px_120px_70px] gap-3 border-b border-border px-4 py-3 last:border-b-0'
                >
                  <div className='flex items-center justify-center'>
                    <Checkbox
                      checked={selectedIds.includes(account.id)}
                      onCheckedChange={() => toggleSelection(account.id)}
                    />
                  </div>

                  <div className='min-w-0'>
                    <CustomInput
                      size='small'
                      type='text'
                      defaultValue={meta.phone || '-'}
                      disabled
                      inputClassName='text-sm!'
                    />
                  </div>

                  <div className='min-w-0'>
                    <CustomInput
                      size='small'
                      type='text'
                      defaultValue={usernameOrEmail}
                      disabled
                      inputClassName='text-sm!'
                    />
                  </div>

                  <div className='flex items-center text-sm'>
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        account.isUsed ? 'bg-orange-500/20 text-orange-400' : 'bg-emerald-500/20 text-emerald-400'
                      }`}
                    >
                      {account.isUsed ? 'Used' : 'Available'}
                    </span>
                  </div>

                  <div className='min-w-0'>
                    <CustomInput
                      size='small'
                      type='text'
                      defaultValue={adminNote}
                      onBlur={(e) => handleNoteSave(account.id, e.target.value)}
                      placeholder='Admin note only'
                      disabled={Boolean(savingNotes[account.id])}
                      inputClassName='text-sm!'
                    />
                  </div>

                  <div className='flex items-center text-sm text-muted-foreground'>
                    {account.createdAt
                      ? new Date(account.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })
                      : '-'}
                  </div>

                  <div className='flex items-center justify-center'>
                    <Button
                      type='button'
                      size='icon'
                      variant='ghost'
                      className='text-red-500 hover:text-red-400'
                      disabled={account.isUsed || isDeletingId === account.id}
                      onClick={() => handleDelete(account)}
                    >
                      <Trash2 className='h-4 w-4' />
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>Add Stock</DialogTitle>
          </DialogHeader>
          <div className='space-y-4'>
            <CustomInput
              label='Field Order'
              type='text'
              placeholder='phone,password,username,note'
              value={fieldOrder}
              onChange={(e) => setFieldOrder(e.target.value)}
              helperText={`Supported fields: ${Object.keys(STOCK_FIELD_LABELS).join(', ')}`}
            />

            <CustomInput
              label='Format Type'
              type='select'
              value={stockFormat}
              onValueChange={(value) => setStockFormat(value as StockFormatType)}
              options={[
                { value: 'NEWLINE', label: 'Colon-delimited per line' },
                { value: 'CUSTOM_DELIMITER', label: 'Custom delimiter' }
              ]}
            />

            {stockFormat === 'CUSTOM_DELIMITER' && (
              <CustomInput
                label='Delimiter'
                type='text'
                value={customDelimiter}
                onChange={(e) => setCustomDelimiter(e.target.value)}
                placeholder=','
              />
            )}

            <div className='space-y-2'>
              <Label>Paste Stock</Label>
              <textarea
                className='min-h-48 w-full rounded-md border border-input bg-background px-3 py-2 text-sm'
                value={bulkStockInput}
                onChange={(e) => setBulkStockInput(e.target.value)}
                placeholder='phone:password:username:private note'
              />
            </div>

            <div className='flex justify-end gap-3'>
              <Button type='button' variant='outline' onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button type='button' onClick={handleAddStock} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Add Stock'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showBulkTakeDialog} onOpenChange={setShowBulkTakeDialog}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle>Bulk Take</DialogTitle>
          </DialogHeader>
          <div className='space-y-4'>
            <CustomInput
              label='Quantity'
              type='number'
              min={1}
              max={availableAccounts.length}
              value={bulkTakeQuantity}
              onChange={(e) => setBulkTakeQuantity(Number(e.target.value))}
              placeholder={`Max: ${availableAccounts.length}`}
            />
            <p className='text-xs text-muted-foreground'>
              Randomly copies the selected quantity from available Telegram stock.
            </p>

            <div className='flex justify-end gap-3'>
              <Button type='button' variant='outline' onClick={() => setShowBulkTakeDialog(false)}>
                Cancel
              </Button>
              <Button
                type='button'
                onClick={handleBulkTake}
                disabled={bulkTakeQuantity < 1 || bulkTakeQuantity > availableAccounts.length}
              >
                Copy Random Stock
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
