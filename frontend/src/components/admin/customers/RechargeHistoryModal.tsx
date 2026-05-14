'use client'

import { Pagination } from '@/components/common/Pagination'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import useAsync from '@/hooks/useAsync'
import type { PaginationData } from '@/hooks/useFilter'
import { useFilter } from '@/hooks/useFilter'
import { ArrowDownCircle, ArrowUpCircle, History } from 'lucide-react'

interface RechargeHistoryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User | null
}

interface BalanceTransaction {
  id: number
  type: string
  amount: number
  balanceBefore: number
  balanceAfter: number
  reference?: string | null
  description: string
  createdBy?: string | null
  createdAt: string
}

interface HistoryResponse {
  data?: {
    transactions: BalanceTransaction[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
      hasNext: boolean
      hasPrev: boolean
    }
  }
}

const formatDate = (date: string | Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date))
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

const getTypeBadge = (type: string, amount: number) => {
  const isCredit = amount >= 0
  const variant = isCredit ? 'default' : 'destructive'
  const label = type.replace(/_/g, ' ')
  return (
    <Badge variant={variant} className='gap-1'>
      {isCredit ? <ArrowUpCircle className='h-3 w-3' /> : <ArrowDownCircle className='h-3 w-3' />}
      {label}
    </Badge>
  )
}

export function RechargeHistoryModal({ open, onOpenChange, user }: RechargeHistoryModalProps) {
  const { page, limit } = useFilter(10)

  const { data, loading } = useAsync<HistoryResponse>(
    () =>
      open && user?.id
        ? `/admin/users/${user.id}/balance/history?page=${page || 1}&limit=${limit || 10}`
        : null,
    false,
    false
  )

  const transactions = data?.data?.transactions ?? []
  const rawPagination = data?.data?.pagination
  const paginationData: PaginationData | undefined = rawPagination
    ? {
        page: rawPagination.page,
        limit: rawPagination.limit,
        total: rawPagination.total,
        pages: rawPagination.totalPages,
        hasNext: rawPagination.hasNext,
        hasPrev: rawPagination.hasPrev
      }
    : undefined

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-[calc(100%-2rem)] sm:max-w-xl md:max-w-2xl lg:max-w-4xl xl:max-w-5xl max-h-[85dvh] sm:max-h-[90vh] flex flex-col'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <History className='h-5 w-5' />
            Recharge History
            {user && (
              <span className='font-normal text-muted-foreground'>
                — {user.firstName} {user.lastName} ({user.email})
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className='flex-1 overflow-y-auto min-h-0'>
          {loading ? (
            <div className='flex items-center justify-center py-12'>
              <div className='h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin' />
            </div>
          ) : transactions.length === 0 ? (
            <div className='py-12 text-center text-muted-foreground'>
              <History className='mx-auto h-12 w-12 opacity-50 mb-4' />
              <p>No balance transactions found.</p>
            </div>
          ) : (
            <div className='rounded-lg border border-border overflow-hidden'>
              <table className='w-full text-sm'>
                <thead>
                  <tr className='bg-muted/50 border-b border-border'>
                    <th className='px-4 py-3 text-left font-medium'>Date</th>
                    <th className='px-4 py-3 text-left font-medium'>Type</th>
                    <th className='px-4 py-3 text-right font-medium'>Amount</th>
                    <th className='px-4 py-3 text-right font-medium'>Before</th>
                    <th className='px-4 py-3 text-right font-medium'>After</th>
                    <th className='px-4 py-3 text-left font-medium'>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => {
                    const amount = Number(tx.amount)
                    const isCredit = amount >= 0
                    return (
                      <tr key={tx.id} className='border-b border-border last:border-0'>
                        <td className='px-4 py-3 whitespace-nowrap text-muted-foreground'>
                          {formatDate(tx.createdAt)}
                        </td>
                        <td className='px-4 py-3'>{getTypeBadge(tx.type, amount)}</td>
                        <td
                          className={`px-4 py-3 text-right font-medium ${
                            isCredit ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {isCredit ? '+' : ''}
                          {formatCurrency(amount)}
                        </td>
                        <td className='px-4 py-3 text-right text-muted-foreground'>
                          {formatCurrency(Number(tx.balanceBefore))}
                        </td>
                        <td className='px-4 py-3 text-right font-medium'>
                          {formatCurrency(Number(tx.balanceAfter))}
                        </td>
                        <td className='px-4 py-3 text-muted-foreground max-w-[200px] truncate'>
                          {tx.description || '-'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {paginationData && paginationData.pages > 1 && (
          <div className='border-t border-border pt-4'>
            <Pagination paginationData={paginationData} pageSizeOptions={[10, 20, 50]} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
