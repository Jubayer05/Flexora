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
import { AlertTriangle, LucideIcon } from 'lucide-react'
import { useState } from 'react'
import CustomInput from './CustomInput'

interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (inputData?: Record<string, any>) => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive'
  isLoading?: boolean
  icon?: LucideIcon
  showInput?: boolean
  contentClassName?: string
  inputConfig?: {
    name: string
    label: string
    placeholder: string
    type?: 'text' | 'textarea'
    required?: boolean
  }
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  isLoading = false,
  icon: Icon = AlertTriangle,
  showInput = false,
  inputConfig,
  contentClassName
}: ConfirmationModalProps) {
  const [inputValue, setInputValue] = useState('')

  const handleConfirm = () => {
    const inputData = showInput && inputConfig ? { [inputConfig.name]: inputValue } : undefined
    onConfirm(inputData)
  }

  const handleClose = () => {
    setInputValue('')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={contentClassName ?? 'font-manrope bg-card border-border max-w-xs!'}>
        <DialogHeader className='flex justify-center items-center gap-4 text-center!'>
          <div className='flex justify-center'>
            <div
              className={`rounded-full p-3 ${
                variant === 'destructive'
                  ? 'bg-destructive/10 text-destructive'
                  : 'bg-primary/10 text-primary'
              }`}
            >
              <Icon className='w-10 h-10' />
            </div>
          </div>
          <DialogTitle className='text-card-foreground text-lg'>{title}</DialogTitle>
          <DialogDescription className='text-muted-foreground text-sm'>
            {description}
          </DialogDescription>
          {showInput && inputConfig && (
            <CustomInput
              name={inputConfig.name}
              label={inputConfig.label}
              placeholder={inputConfig.placeholder}
              type={inputConfig.type || 'text'}
              className='mt-4 w-full'
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
          )}
        </DialogHeader>

        <DialogFooter className='flex gap-3 mt-6'>
          <Button
            variant='outline'
            onClick={handleClose}
            disabled={isLoading}
            className='flex-1 bg-transparent hover:bg-accent border-border text-card-foreground'
          >
            {cancelText}
          </Button>
          <Button
            variant={variant}
            onClick={handleConfirm}
            disabled={isLoading || (showInput && inputConfig?.required && !inputValue.trim())}
            className={`flex-1 font-semibold ${
              variant === 'destructive'
                ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
                : 'bg-primary hover:bg-primary/90 text-primary-foreground'
            }`}
          >
            {isLoading ? 'Processing...' : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
