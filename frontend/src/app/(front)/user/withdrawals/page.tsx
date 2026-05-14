'use client'

import MotionLoader from '@/components/common/MotionLoader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import useAsync from '@/hooks/useAsync'
import { cn } from '@/lib/utils'
import requests from '@/services/network/http'
import { format } from 'date-fns'
import { ChevronLeft, ChevronRight, DollarSign, Plus, Wallet } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

type WithdrawalStatus = 'PENDING' | 'DONE'

interface Withdrawal {
  id: number
  userId: number
  amount: number
  method: string
  status: WithdrawalStatus
  meta?: Record<string, any>
  createdAt: string
  updatedAt: string
}

interface WithdrawalResponse {
  success: boolean
  data: Withdrawal[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
    hasNext: boolean
    hasPrev: boolean
  }
  message: string
}

interface BalanceResponse {
  success: boolean
  data: {
    balance: number
    totalAdded: number
    totalDeducted: number
    totalTransactions: number
  }
  message: string
}

export default function WithdrawalsPage() {
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('')

  const { data: balanceData, loading: balanceLoading } = useAsync<BalanceResponse>(
    () => '/customer/balance'
  )

  const {
    data: withdrawalsData,
    loading: withdrawalsLoading,
    mutate: refetchWithdrawals
  } = useAsync<WithdrawalResponse>(() => `/customer/withdrawals?page=${page}&limit=${limit}`)

  const balance = balanceData?.data?.balance || 0
  const withdrawals = withdrawalsData?.data || []
  const pagination = withdrawalsData?.pagination

  const handleNextPage = () => {
    if (pagination?.hasNext) {
      setPage((prev) => prev + 1)
    }
  }

  const handlePrevPage = () => {
    if (pagination?.hasPrev) {
      setPage((prev) => prev - 1)
    }
  }

  const getStatusColor = (status: WithdrawalStatus) => {
    switch (status) {
      case 'PENDING':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
      case 'DONE':
        return 'text-green-600 dark:text-green-400 bg-green-500/10 border-green-500/20'
      default:
        return 'text-muted-foreground bg-muted border-border'
    }
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        return 'N/A'
      }
      return format(date, 'MMM dd, yyyy HH:mm')
    } catch {
      return 'N/A'
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!amount || !method) {
      toast.error('Please fill in all required fields')
      return
    }

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum < 1) {
      toast.error('Minimum withdrawal amount is $1')
      return
    }

    if (amountNum > balance) {
      toast.error('Insufficient balance')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await requests.post<{ success: boolean; message: string }>(
        '/customer/withdrawals',
        {
          amount: amountNum,
          method
        }
      )

      if (response.success) {
        toast.success(response.message || 'Withdrawal request created successfully')
        setIsCreateModalOpen(false)
        // Reset form
        setAmount('')
        setMethod('')
        // Refetch data
        refetchWithdrawals()
      } else {
        toast.error(response.message || 'Failed to create withdrawal request')
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to create withdrawal request')
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderMetaInfo = (meta?: Record<string, any>) => {
    if (!meta || Object.keys(meta).length === 0) return <span className='text-card-foreground/60'>N/A</span>

    return (
      <div className='space-y-1 text-sm'>
        {Object.entries(meta).map(([key, value]) => (
          <div key={key}>
            <span className='text-card-foreground/60 capitalize'>{key.replace(/_/g, ' ')}: </span>
            <span className='text-card-foreground'>{String(value)}</span>
          </div>
        ))}
      </div>
    )
  }

  if (balanceLoading || withdrawalsLoading) {
    return (
      <div className='flex justify-center items-center py-12'>
        <MotionLoader size='lg' variant='dots' />
      </div>
    )
  }

  return (
    <div className='space-y-4 mx-auto max-w-6xl font-manrope'>
      {/* Header */}
      <div className='space-y-1'>
        <h1 className='text-card-foreground text-2xl font-semibold'>Withdrawals</h1>
        <p className='text-card-foreground/60 text-base'>Request and manage your balance withdrawals</p>
      </div>

      {/* Balance Card */}
      <Card className='bg-card backdrop-blur-sm border border-border'>
        <CardContent className='p-5'>
          <div className='flex items-center justify-between flex-wrap gap-4'>
            <div className='flex items-center gap-4'>
              <div className='bg-primary/10 p-3 rounded-lg border border-primary/20'>
                <Wallet className='h-5 w-5 text-primary' />
              </div>
              <div>
                <p className='text-card-foreground/60 text-sm mb-1'>Available Balance</p>
                <p className='text-primary text-2xl font-bold'>${balance.toFixed(2)}</p>
              </div>
            </div>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className='bg-primary hover:bg-primary/90 text-card-foreground'
              disabled={balance < 1}
            >
              <Plus className='h-4 w-4 mr-2' />
              Request Withdrawal
            </Button>
          </div>
          {balance < 1 && (
            <p className='text-yellow-400 text-sm mt-4'>⚠ Minimum withdrawal amount is $1.00</p>
          )}
        </CardContent>
      </Card>

      {/* Withdrawals Table */}
      <Card className='bg-card backdrop-blur-sm border border-border'>
        {withdrawals.length === 0 ? (
          <CardContent className='text-center py-12 px-4'>
            <DollarSign className='h-12 w-12 text-card-foreground/30 mx-auto mb-4' />
            <p className='text-card-foreground/60 text-lg font-medium mb-2'>No withdrawal requests yet</p>
            <p className='text-card-foreground/60 text-sm mb-4'>
              Create your first withdrawal request to transfer your balance
            </p>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className='bg-primary hover:bg-primary/90 text-card-foreground'
              disabled={balance < 1}
            >
              <Plus className='h-4 w-4 mr-2' />
              Create Request
            </Button>
          </CardContent>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {withdrawals.map((withdrawal) => (
                  <TableRow key={withdrawal.id}>
                    <TableCell>
                      <span className='text-primary font-medium'>#{withdrawal.id}</span>
                    </TableCell>

                    <TableCell>
                      <span className='font-semibold text-primary'>
                        ${parseFloat(withdrawal.amount.toString()).toFixed(2)}
                      </span>
                    </TableCell>

                    <TableCell>
                      <span className='text-card-foreground'>{withdrawal.method}</span>
                    </TableCell>

                    <TableCell>
                      <span
                        className={cn(
                          'inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium border',
                          getStatusColor(withdrawal.status)
                        )}
                      >
                        {withdrawal.status}
                      </span>
                    </TableCell>

                    <TableCell className='max-w-xs'>{renderMetaInfo(withdrawal.meta)}</TableCell>

                    <TableCell className='text-card-foreground/60'>
                      {formatDate(withdrawal.createdAt)}
                    </TableCell>

                    <TableCell className='text-card-foreground/60'>
                      {formatDate(withdrawal.updatedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className='flex justify-between items-center p-4 border-t border-border'>
                <div className='text-sm text-card-foreground/60'>
                  Showing {withdrawals.length} of {pagination.total} withdrawals
                </div>

                <div className='flex items-center gap-2'>
                  <Button
                    variant='outline'
                    size='icon'
                    onClick={handlePrevPage}
                    disabled={!pagination.hasPrev}
                    className='border-border text-card-foreground hover:bg-muted'
                  >
                    <ChevronLeft className='h-4 w-4' />
                  </Button>

                  <div className='text-sm text-card-foreground/60 px-3'>
                    Page {pagination.page} of {pagination.pages}
                  </div>

                  <Button
                    variant='outline'
                    size='icon'
                    onClick={handleNextPage}
                    disabled={!pagination.hasNext}
                    className='border-border text-card-foreground hover:bg-muted'
                  >
                    <ChevronRight className='h-4 w-4' />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Create Withdrawal Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className='sm:max-w-[500px] bg-card border-border'>
          <DialogHeader>
            <DialogTitle className='text-card-foreground text-xl font-semibold'>
              Request Withdrawal
            </DialogTitle>
            <DialogDescription className='text-card-foreground/60 text-sm'>
              Create a new withdrawal request. Minimum amount is $1.00
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='amount' className='text-card-foreground/60 text-sm'>
                Amount <span className='text-red-400'>*</span>
              </Label>
              <div className='relative'>
                <DollarSign className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-card-foreground/60' />
                <Input
                  id='amount'
                  type='number'
                  step='0.01'
                  min='1'
                  max={balance}
                  placeholder='0.00'
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className='pl-9 bg-muted/50 border-border text-card-foreground placeholder:text-card-foreground/40'
                  required
                />
              </div>
              <p className='text-card-foreground/60 text-xs'>Available balance: ${balance.toFixed(2)}</p>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='method' className='text-card-foreground/60 text-sm'>
                Payment Method <span className='text-red-400'>*</span>
              </Label>
              <Input
                id='method'
                type='text'
                placeholder='e.g., Binance, Bank Transfer, PayPal, Crypto Wallet'
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className='bg-muted/50 border-border text-card-foreground placeholder:text-card-foreground/40'
                required
              />
              <p className='text-card-foreground/60 text-xs'>Enter your preferred withdrawal method</p>
            </div>

            <div className='flex justify-end gap-3 pt-4'>
              <Button
                type='button'
                variant='outline'
                onClick={() => setIsCreateModalOpen(false)}
                disabled={isSubmitting}
                className='border-border text-card-foreground hover:bg-muted'
              >
                Cancel
              </Button>
              <Button
                type='submit'
                disabled={isSubmitting}
                className='bg-primary hover:bg-primary/90 text-card-foreground'
              >
                {isSubmitting ? 'Creating...' : 'Create Request'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
