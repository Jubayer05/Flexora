'use client'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Crown } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

export type PremiumDuration = '1-month' | '3-month' | '6-month' | '12-month'
export type PremiumSelection = {
  slot: number
  enabled: boolean
  duration: PremiumDuration | null
}

interface PremiumUpsellProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (selections: PremiumSelection[]) => void
  accountCount: number
}

const durationOptions: Array<{ value: PremiumDuration; label: string; months: number }> = [
  { value: '1-month', label: '1 Month', months: 1 },
  { value: '3-month', label: '3 Months', months: 3 },
  { value: '6-month', label: '6 Months', months: 6 },
  { value: '12-month', label: '12 Months', months: 12 }
]

export function PremiumUpsell({ isOpen, onClose, onConfirm, accountCount }: PremiumUpsellProps) {
  const [selections, setSelections] = useState<PremiumSelection[]>([])

  useEffect(() => {
    const nextSelections = Array.from({ length: Math.max(1, accountCount) }, (_, index) => ({
      slot: index,
      enabled: false,
      duration: null
    }))
    setSelections(nextSelections)
  }, [accountCount, isOpen])

  const selectedCount = useMemo(
    () => selections.filter((selection) => selection.enabled && selection.duration).length,
    [selections]
  )

  const handleSkip = () => {
    onConfirm([])
    setSelections([])
  }

  const handleConfirm = () => {
    onConfirm(selections.filter((selection) => selection.enabled && selection.duration))
    setSelections([])
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='bg-background border-white/20 text-white sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Crown className='h-5 w-5 text-yellow-500' />
            Add Telegram Premium?
          </DialogTitle>
          <DialogDescription className='text-white/70'>
            Select which Telegram account{accountCount > 1 ? 's' : ''} should receive Premium and choose the month for each one.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4 py-4'>
          <div className='space-y-3'>
            {selections.map((selection, index) => (
              <div key={selection.slot} className='rounded-lg border border-white/20 bg-white/5 p-3 space-y-3'>
                <div className='flex items-center justify-between gap-3'>
                  <div className='space-y-1'>
                    <Label className='cursor-pointer font-medium text-white'>
                      Account {index + 1}
                    </Label>
                    <p className='text-xs text-white/60'>
                      Choose whether Premium should be added to this account.
                    </p>
                  </div>
                  <Button
                    type='button'
                    size='sm'
                    variant={selection.enabled ? 'default' : 'outline'}
                    className={selection.enabled ? 'bg-blue-500 hover:bg-blue-600' : 'border-white/20 text-white hover:bg-white/10'}
                    onClick={() =>
                      setSelections((current) =>
                        current.map((item) =>
                          item.slot === selection.slot
                            ? { ...item, enabled: !item.enabled, duration: !item.enabled ? item.duration : null }
                            : item
                        )
                      )
                    }
                  >
                    {selection.enabled ? 'Premium Added' : 'Add Premium'}
                  </Button>
                </div>

                {selection.enabled && (
                  <div className='space-y-2'>
                    <Label className='text-white/80'>Which month would you like?</Label>
                    <select
                      className='flex h-10 w-full rounded-md border border-white/20 bg-background px-3 py-2 text-sm text-white'
                      value={selection.duration ?? ''}
                      onChange={(event) =>
                        setSelections((current) =>
                          current.map((item) =>
                            item.slot === selection.slot
                              ? { ...item, duration: event.target.value as PremiumDuration }
                              : item
                          )
                        )
                      }
                    >
                      <option value='' disabled>
                        Select duration
                      </option>
                      {durationOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className='bg-blue-500/10 border border-blue-500/20 rounded-lg p-3'>
            <p className='text-sm text-white/80'>
              <strong>Note:</strong> Premium will be activated for the selected account{selectedCount === 1 ? '' : 's'} after payment is completed.
            </p>
          </div>
        </div>

        <DialogFooter className='flex gap-2'>
          <Button variant='outline' onClick={handleSkip} className='bg-background border-white/20 text-white hover:bg-white/10'>
            Skip
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selections.some((selection) => selection.enabled && !selection.duration)}
            className='bg-blue-500 hover:bg-blue-600 text-white'
          >
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

