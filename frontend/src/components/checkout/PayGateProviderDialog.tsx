'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export const PAYGATE_MULTI_PROVIDER_CODE = '__paygate_multi_provider__'

export const resolvePayGateProviderCode = (code?: string): string | undefined => {
  if (!code || code === PAYGATE_MULTI_PROVIDER_CODE) return undefined
  return code
}

export type PayGateProviderOption = {
  code: string
  name: string
  type: 'card' | 'crypto' | 'bank'
  method: string
  isActive: boolean
  regions?: string[]
  minAmount?: number
  maxAmount?: number
  feePercent?: number
  description?: string
}

type PayGateProviderDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  providers: PayGateProviderOption[]
  selectedProviderCode: string
  onSelectProvider: (code: string) => void
  onConfirm: () => void
  amount?: number
  loading?: boolean
  continueLabel?: string
}

export default function PayGateProviderDialog({
  open,
  onOpenChange,
  providers,
  selectedProviderCode,
  onSelectProvider,
  onConfirm,
  amount,
  loading = false,
  continueLabel = 'Continue'
}: PayGateProviderDialogProps) {
  const hasSelectedProvider =
    selectedProviderCode === PAYGATE_MULTI_PROVIDER_CODE ||
    providers.some((provider) => provider.code === selectedProviderCode)

  const disableContinue = loading || !hasSelectedProvider

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-3xl'>
        <DialogHeader>
          <DialogTitle>Select Payment Provider</DialogTitle>
          <DialogDescription>Choose how you want to pay with PayGate.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className='py-6 text-sm text-muted-foreground'>Loading providers...</div>
        ) : (
          <div className='space-y-3'>
            <div className='text-sm font-semibold'>Card Payments</div>

            <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
              <button
                type='button'
                onClick={() => onSelectProvider(PAYGATE_MULTI_PROVIDER_CODE)}
                className={cn(
                  'rounded-lg border p-4 text-left transition-all',
                  selectedProviderCode === PAYGATE_MULTI_PROVIDER_CODE
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50 hover:bg-muted/30'
                )}
              >
                <div className='font-semibold'>Multi Provider (Recommended)</div>
                <div className='mt-1 text-sm text-muted-foreground'>
                  Automatically selects the best payment provider for your region
                </div>
              </button>

            {providers.map((provider) => {
              const isDisabled = 
                typeof provider.minAmount === 'number' && 
                typeof amount === 'number' && 
                amount < provider.minAmount

              return (
                <button
                  key={provider.code}
                  type='button'
                  onClick={() => !isDisabled && onSelectProvider(provider.code)}
                  disabled={isDisabled}
                  className={cn(
                    'rounded-lg border p-4 text-left transition-all',
                    isDisabled && 'cursor-not-allowed opacity-60',
                    !isDisabled && selectedProviderCode === provider.code
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50 hover:bg-muted/30',
                    isDisabled && 'hover:border-border hover:bg-transparent'
                  )}
                >
                  <div className={cn('font-semibold', isDisabled && 'text-red-500')}>
                    {provider.name}
                  </div>
                  <div className='mt-1 text-xs text-muted-foreground uppercase'>
                    {provider.type} • {provider.method}
                  </div>
                  {provider.regions && provider.regions.length > 0 && (
                    <div className='mt-1 text-xs text-muted-foreground'>
                      {provider.regions.slice(0, 3).join(', ')}
                    </div>
                  )}
                  {typeof provider.minAmount === 'number' && (
                    <div className={cn(
                      'mt-2 text-sm',
                      isDisabled ? 'text-red-500' : 'text-primary'
                    )}>
                      Min: ${provider.minAmount.toFixed(2)}
                    </div>
                  )}
                </button>
              )
            })}
            </div>

            {providers.length === 0 && (
              <div className='text-sm text-muted-foreground'>
                No active provider list from API. You can continue with Multi Provider.
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Back
          </Button>
          <Button onClick={onConfirm} disabled={disableContinue}>
            {continueLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
