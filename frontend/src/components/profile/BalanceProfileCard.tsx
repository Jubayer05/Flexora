'use client'

import { WalletTopupPanel } from '@/components/profile/WalletTopupPanel'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import useAsync from '@/hooks/useAsync'
import { useState } from 'react'

interface BalanceProfileCardProps {
  disabled?: boolean
}

export function BalanceProfileCard({ disabled = false }: BalanceProfileCardProps) {
  const [open, setOpen] = useState(false)
  const { data: balanceData } = useAsync<any>(() => '/customer/balance', false)
  const balance = balanceData?.data?.balance ?? 0

  return (
    <>
      <div className='mb-6 rounded-xl border border-border bg-card/70 p-6 shadow-sm backdrop-blur-sm'>
        <div className='mb-4 space-y-1'>
          <p className='text-sm font-medium text-muted-foreground'>Your Wallet Balance</p>
          <p className='text-3xl font-semibold text-primary sm:text-4xl'>
            ${Number(balance).toFixed(2)}
          </p>
        </div>

        <Button type='button' disabled={disabled} onClick={() => setOpen(true)} className='w-full'>
          + Add Balance
        </Button>

        <div className='mt-4 flex flex-wrap gap-2 border-t border-border/60 pt-4 text-[11px]'>
          <div className='inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 font-semibold text-primary'>
            Instant payment methods
          </div>
          <div className='inline-flex items-center rounded-full bg-muted px-2.5 py-1 font-semibold text-muted-foreground'>
            Admin-added active methods only
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-4xl'>
          <DialogHeader>
            <DialogTitle>Add Balance</DialogTitle>
            <DialogDescription>
              Choose from your active payment methods and top up your wallet instantly.
            </DialogDescription>
          </DialogHeader>

          <WalletTopupPanel mode='modal' />
        </DialogContent>
      </Dialog>
    </>
  )
}
