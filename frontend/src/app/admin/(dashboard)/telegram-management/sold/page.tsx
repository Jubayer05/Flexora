'use client'

import { Suspense, useState } from 'react'

import { CustomTable } from '@/components/admin/common/data-table'
import { telegramAccountColumns } from '@/components/admin/telegram/telegram-account-columns'
import { AddTelegramAccountModal } from '@/components/admin/telegram/AddTelegramAccountModal'
import { CustomSelect } from '@/components/common/CustomSelect'
import PageHeader from '@/components/common/PageHeader'
import { Pagination } from '@/components/common/Pagination'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import useAsync from '@/hooks/useAsync'
import { useFilter } from '@/hooks/useFilter'
import { showError } from '@/lib/errMsg'
import requests from '@/services/network/http'
import { RefreshCw, Image as ImageIcon, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'

function SoldTelegramAccountList() {
  const { search, page, limit, filters, setFilter, clearFilters } = useFilter(10)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [premiumFilter, setPremiumFilter] = useState<'ALL' | 'PREMIUM' | 'NON_PREMIUM'>('ALL')
  const [screenshotViewer, setScreenshotViewer] = useState<{ open: boolean; url: string | null }>({
    open: false,
    url: null
  })

  const { data, loading, mutate } = useAsync<{ data: TelegramAccountListResponse }>(
    () =>
      '/admin/telegram-accounts' +
      `?page=${page || 1}` +
      `&limit=${limit || 10}` +
      `&includeCredentials=true` +
      `&isUsed=true` + // Only show sold accounts
      (search ? `&search=${search}` : '') +
      (filters.status ? `&status=${filters.status}` : '')
  )

  // Filter accounts by Premium status
  const filteredAccounts = data?.data?.accounts?.filter((account) => {
    if (premiumFilter === 'ALL') return true
    
    const order = account.usedByOrder
    if (!order) return premiumFilter === 'NON_PREMIUM'
    
    // Check if order product type is Premium
    const isPremium = order.product?.type && 
      ['PREMIUM_1M', 'PREMIUM_3M', 'PREMIUM_6M', 'PREMIUM_12M'].includes(order.product.type)
    
    if (premiumFilter === 'PREMIUM') return isPremium
    if (premiumFilter === 'NON_PREMIUM') return !isPremium
    return true
  }) || []

  return (
    <div className='w-full max-w-full min-w-0 overflow-x-hidden'>
      {/* Header */}
      <PageHeader
        title='Sold Telegram Accounts'
        subTitle='View and manage sold Telegram accounts with order details'
        extra={
          <div className='flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 sm:gap-4 mb-4 sm:mb-6 min-w-0'>
            <div className='flex flex-col min-[480px]:flex-row flex-wrap sm:items-end gap-3 sm:gap-4 min-w-0'>
              {/* Search */}
              <div className='space-y-2'>
                <Input
                  placeholder='Search by phone number or order ID...'
                  value={search || ''}
                  onChange={(e) => setFilter('search', e.target.value)}
                  className='bg-background border-border w-full sm:w-64 text-foreground'
                />
              </div>

              {/* Premium Filter */}
              <div className='space-y-2'>
                <CustomSelect
                  placeholder='Filter by Premium'
                  value={premiumFilter}
                  onChange={(value) => setPremiumFilter(value as 'ALL' | 'PREMIUM' | 'NON_PREMIUM')}
                  showSearch={false}
                  staticOptions={[
                    {
                      title: 'All Orders',
                      label: 'All Orders',
                      value: 'ALL'
                    },
                    {
                      title: 'Premium Orders',
                      label: 'Premium Orders',
                      value: 'PREMIUM'
                    },
                    {
                      title: 'Non-Premium Orders',
                      label: 'Non-Premium Orders',
                      value: 'NON_PREMIUM'
                    }
                  ]}
                  className='bg-background border-border w-full sm:w-48 text-foreground'
                />
              </div>
            </div>

            <div className='flex gap-2'>
              <Button
                variant='outline'
                onClick={() => mutate()}
                disabled={loading}
                className='bg-background border-border text-foreground hover:bg-muted'
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        }
      />

      {/* Info Banner */}
      <div className='mb-4 sm:mb-6 p-3 sm:p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg min-w-0'>
        <p className='text-sm text-yellow-500'>
          <strong>Note:</strong> This page shows only accounts that have been sold (marked as used).
          Accounts are automatically moved here when they are assigned to orders.
        </p>
      </div>

      {/* Table */}
      <CustomTable
        columns={telegramAccountColumns(mutate)}
        data={filteredAccounts}
        getRowId={(row: TelegramAccountResponse) => row.id}
        emptyMessage={
          loading
            ? 'Loading sold accounts...'
            : premiumFilter !== 'ALL'
            ? `No ${premiumFilter === 'PREMIUM' ? 'Premium' : 'Non-Premium'} orders found.`
            : 'No sold Telegram accounts found. Accounts will appear here once they are sold.'
        }
        className={loading ? 'opacity-50 pointer-events-none' : ''}
      />

      {/* Screenshot Proof Viewer Dialog */}
      <Dialog open={screenshotViewer.open} onOpenChange={(open) => setScreenshotViewer({ open, url: null })}>
        <DialogContent className='max-w-4xl max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>Screenshot Proof</DialogTitle>
            <DialogDescription>Transfer proof screenshot for this account</DialogDescription>
          </DialogHeader>
          {screenshotViewer.url && (
            <div className='space-y-4'>
              <div className='relative bg-black rounded-lg overflow-hidden'>
                <img
                  src={screenshotViewer.url}
                  alt='Transfer proof'
                  className='w-full h-auto'
                />
              </div>
              <div className='flex justify-end gap-2'>
                <Button
                  variant='outline'
                  onClick={() => {
                    if (screenshotViewer.url) {
                      window.open(screenshotViewer.url, '_blank')
                    }
                  }}
                >
                  <ExternalLink className='h-4 w-4 mr-2' />
                  Open Full Size
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Pagination */}
      {data?.data?.pagination && (
        <div className='mt-6'>
         <Pagination paginationData={data.data.pagination} pageSizeOptions={[10, 20, 30, 50]} />
        </div>
      )}

      {/* Add Account Modal */}
      <AddTelegramAccountModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSuccess={() => {
          mutate()
          setIsAddModalOpen(false)
        }}
      />
    </div>
  )
}

export default function SoldAccountsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SoldTelegramAccountList />
    </Suspense>
  )
}

