'use client'

import { Suspense, useMemo, useState } from 'react'

import { CustomTable } from '@/components/admin/common/data-table'
import { AddTelegramAccountModal } from '@/components/admin/telegram/AddTelegramAccountModal'
import { TelegramProductAssignmentTable } from '@/components/admin/telegram/TelegramProductAssignmentTable'
import { telegramAccountColumns } from '@/components/admin/telegram/telegram-account-columns'
import { CustomSelect } from '@/components/common/CustomSelect'
import PageHeader from '@/components/common/PageHeader'
import { Pagination } from '@/components/common/Pagination'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import useAsync from '@/hooks/useAsync'
import { useFilter } from '@/hooks/useFilter'
import { RefreshCw, Plus } from 'lucide-react'

type ManageSessionResponse = {
  success: boolean
  sessions: Array<{
    phoneNumber: string
    isAuthorized: boolean
    username?: string | null
    firstName?: string | null
    createdAt: string
    updatedAt: string
  }>
  total: number
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value))

function ManageTelegramAccountList() {
  const { search, page, limit, setFilter } = useFilter(10)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null)
  const [selectedProductName, setSelectedProductName] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'INVALID'>('ALL')
  const [assignmentFilter, setAssignmentFilter] = useState<'ALL' | 'ASSIGNED' | 'UNASSIGNED'>(
    'ALL'
  )

  const { data, loading, mutate } = useAsync<{ data: TelegramAccountListResponse }>(
    () =>
      '/admin/telegram-accounts' +
      `?page=${page || 1}` +
      `&limit=${limit || 10}` +
      (selectedProductId ? `&productId=${selectedProductId}` : '') +
      (assignmentFilter === 'UNASSIGNED' ? '&unassigned=true' : '') +
      (statusFilter === 'AVAILABLE'
        ? '&isValid=true'
        : statusFilter === 'INVALID'
          ? '&isValid=false'
          : '')
  )
  const {
    data: sessionsData,
    loading: sessionsLoading,
    mutate: mutateSessions
  } = useAsync<ManageSessionResponse>(() => '/admin/telegram-sessions/sessions')

  const accounts = data?.data?.accounts || []
  const sessions = sessionsData?.sessions || []

  const filteredAccounts = useMemo(() => {
    return accounts.filter((account) => {
      const matchesSearch =
        !search ||
        account.phone?.toLowerCase().includes(search.toLowerCase()) ||
        account.usedByOrder?.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
        account.product?.name?.toLowerCase().includes(search.toLowerCase())

      const matchesAssignment =
        assignmentFilter === 'ALL'
          ? true
          : assignmentFilter === 'ASSIGNED'
            ? !!account.product
            : !account.product

      return matchesSearch && matchesAssignment
    })
  }, [accounts, assignmentFilter, search])

  const columns = useMemo(
    () => telegramAccountColumns(mutate).filter((column) => column.key !== 'select'),
    [mutate]
  )
  const sessionColumns = useMemo(
    () => [
      {
        key: 'phoneNumber',
        header: 'Phone Number',
        render: (value: string) => <div className='font-medium'>+{value}</div>
      },
      {
        key: 'isAuthorized',
        header: 'Session',
        render: (value: boolean) => (
          <Badge variant={value ? 'default' : 'destructive'}>
            {value ? 'Authorized' : 'Pending'}
          </Badge>
        )
      },
      {
        key: 'username',
        header: 'Username',
        render: (value: string | null, row: ManageSessionResponse['sessions'][0]) => (
          <div className='text-sm text-muted-foreground'>
            {value || row.firstName || 'N/A'}
          </div>
        )
      },
      {
        key: 'createdAt',
        header: 'Created At',
        render: (value: string) => <div className='text-sm text-muted-foreground'>{formatDate(value)}</div>
      },
      {
        key: 'updatedAt',
        header: 'Last Updated',
        render: (value: string) => <div className='text-sm text-muted-foreground'>{formatDate(value)}</div>
      }
    ],
    []
  )

  return (
    <div className='w-full max-w-full min-w-0 overflow-x-hidden space-y-6'>
      <PageHeader
        title='Telegram Accounts'
        subTitle='Manage Telegram account stock, product assignment, proxy settings, and session actions.'
        extra={
          <div className='flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between'>
            <div className='flex flex-col gap-3 min-[480px]:flex-row sm:flex-wrap'>
              <Input
                placeholder='Search by phone, order ID, or product...'
                value={search || ''}
                onChange={(e) => setFilter('search', e.target.value)}
                className='w-full bg-background border-border text-foreground sm:w-72'
              />

              <CustomSelect
                placeholder='Filter by status'
                value={statusFilter}
                onChange={(value) => setStatusFilter(value as 'ALL' | 'AVAILABLE' | 'INVALID')}
                showSearch={false}
                staticOptions={[
                  { title: 'All Statuses', label: 'All Statuses', value: 'ALL' },
                  { title: 'Available', label: 'Available', value: 'AVAILABLE' },
                  { title: 'Invalid', label: 'Invalid', value: 'INVALID' }
                ]}
                className='w-full bg-background border-border text-foreground sm:w-48'
              />

              <CustomSelect
                placeholder='Assignment'
                value={assignmentFilter}
                onChange={(value) =>
                  setAssignmentFilter(value as 'ALL' | 'ASSIGNED' | 'UNASSIGNED')
                }
                showSearch={false}
                staticOptions={[
                  { title: 'All Accounts', label: 'All Accounts', value: 'ALL' },
                  { title: 'Assigned', label: 'Assigned', value: 'ASSIGNED' },
                  { title: 'Unassigned', label: 'Unassigned', value: 'UNASSIGNED' }
                ]}
                className='w-full bg-background border-border text-foreground sm:w-48'
              />
            </div>

            <div className='flex flex-wrap gap-2'>
              <Button
                variant='outline'
                onClick={() => {
                  mutate()
                  mutateSessions()
                }}
                disabled={loading}
                className='bg-background border-border text-foreground hover:bg-muted'
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>

              <Button onClick={() => setIsAddModalOpen(true)} disabled={!selectedProductId}>
                <Plus className='mr-2 h-4 w-4' />
                Add Account
              </Button>
            </div>
          </div>
        }
      />

      <div className='rounded-lg border border-primary/15 bg-primary/5 p-4 text-sm text-muted-foreground'>
        This page restores Telegram account management for active stock. Use it to add new accounts,
        edit details, change proxy, kick sessions, re-login, archive invalid entries, or move
        accounts between Telegram products.
      </div>

      <TelegramProductAssignmentTable
        selectedProductId={selectedProductId}
        onProductClick={(product) => {
          setSelectedProductId(product.id)
          setSelectedProductName(product.name)
        }}
        onAddAccount={(product) => {
          setSelectedProductId(product.id)
          setSelectedProductName(product.name)
          setIsAddModalOpen(true)
        }}
      />

      <div className='space-y-3'>
        <div>
          <h2 className='text-xl font-semibold text-foreground'>Existing Telegram Sessions</h2>
          <p className='text-sm text-muted-foreground'>
            Previously added Telegram session files are shown here so you can verify what already
            exists before creating new accounts.
          </p>
        </div>

        <CustomTable
          columns={sessionColumns}
          data={sessions}
          getRowId={(row: ManageSessionResponse['sessions'][0]) => row.phoneNumber}
          emptyMessage={
            sessionsLoading ? 'Loading Telegram sessions...' : 'No Telegram sessions found.'
          }
          className={sessionsLoading ? 'opacity-50 pointer-events-none' : ''}
        />
      </div>

      <div className='flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h2 className='text-xl font-semibold text-foreground'>
            {selectedProductId
              ? `Numbers for ${selectedProductName || `Product #${selectedProductId}`}`
              : 'All Telegram Numbers'}
          </h2>
          <p className='text-sm text-muted-foreground'>
            {selectedProductId
              ? 'Manage, edit, move, or mark sold for all numbers linked to the selected Telegram auto-delivery item.'
              : 'Select an item above to view and manage all numbers assigned to that Telegram product.'}
          </p>
        </div>

        <div className='flex flex-wrap gap-2'>
          {selectedProductId ? (
            <>
              <Button variant='outline' onClick={() => setIsAddModalOpen(true)}>
                <Plus className='mr-2 h-4 w-4' />
                Add Number
              </Button>
              <Button
                variant='ghost'
                onClick={() => {
                  setSelectedProductId(null)
                  setSelectedProductName('')
                }}
              >
                Show All
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <CustomTable
        columns={columns}
        data={filteredAccounts}
        getRowId={(row: TelegramAccountResponse) => row.id}
        emptyMessage={
          loading
            ? 'Loading Telegram accounts...'
            : 'No Telegram accounts found. Add a new account to restore Telegram account management.'
        }
        className={loading ? 'opacity-50 pointer-events-none' : ''}
      />

      {data?.data?.pagination && (
        <div className='mt-6'>
          <Pagination paginationData={data.data.pagination} pageSizeOptions={[10, 20, 30, 50]} />
        </div>
      )}

      <AddTelegramAccountModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        initialProductId={selectedProductId}
        initialProductName={selectedProductName}
        onSuccess={() => {
          mutate()
          setIsAddModalOpen(false)
        }}
      />
    </div>
  )
}

export default function ManageTelegramAccountsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ManageTelegramAccountList />
    </Suspense>
  )
}
