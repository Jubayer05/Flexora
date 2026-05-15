'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Copy, Loader2, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface TelegramCodeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderId: number
  orderNumber: string
}

export default TelegramCodeDialog

export function TelegramCodeDialog({
  open,
  onOpenChange,
  orderId,
  orderNumber
}: TelegramCodeDialogProps) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Code copied to clipboard')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-surface-container-low border-outline-variant">
        <DialogHeader>
          <DialogTitle className="text-on-surface">Telegram Verification Code</DialogTitle>
          <DialogDescription className="text-on-surface-variant">
            Order #{orderNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-md py-4">
          <div className="text-center py-8">
            {loading ? (
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            ) : code ? (
              <div className="space-y-4">
                <CheckCircle2 className="w-8 h-8 text-primary mx-auto" />
                <div className="bg-surface-container rounded-lg p-md">
                  <p className="font-data-lg text-data-lg text-on-surface text-center">{code}</p>
                </div>
                <Button
                  variant="outline"
                  onClick={handleCopy}
                  className="w-full border-outline-variant hover:bg-surface-container"
                >
                  <Copy className="size-4 mr-2" />
                  {copied ? 'Copied!' : 'Copy Code'}
                </Button>
              </div>
            ) : (
              <p className="text-on-surface-variant">No code available</p>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}