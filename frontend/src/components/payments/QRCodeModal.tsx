/**
 * QR Code Scanner Component for Crypto Payments
 * Allows customers to scan QR codes with crypto wallet
 * 
 * Usage:
 * <QRCodeModal
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   address="0xA3CCC73f0002d5D45F00fd1D6a8b1F1E1a23613e"
 *   amount="0.5"
 *   currency="USDC"
 * />
 */

'use client'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface QRCodeModalProps {
  isOpen: boolean
  onClose: () => void
  address: string
  amount?: string
  currency?: string
  network?: string
  qrCodeUrl?: string
}

export default function QRCodeModal({
  isOpen,
  onClose,
  address,
  amount = '0.5',
  currency = 'USDC',
  network = 'POLYGON',
  qrCodeUrl
}: QRCodeModalProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(address)
    setCopied(true)
    toast.success('Wallet address copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  // Generate QR code URL using external service
  const generateQRUrl = () => {
    if (qrCodeUrl) return qrCodeUrl
    // Use qr-server API to generate QR code
    const walletUri = `ethereum:${address}@137?value=${amount}`
    return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(walletUri)}`
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>
            Send {currency} Payment
          </DialogTitle>
          <DialogDescription>
            Scan with your crypto wallet ({network} network)
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4 py-4'>
          {/* Amount Display */}
          <div className='text-center'>
            <div className='text-sm text-muted-foreground mb-1'>Amount</div>
            <div className='text-3xl font-bold'>
              {amount} {currency}
            </div>
          </div>

          {/* QR Code Section */}
          <div className='flex justify-center'>
            <div className='bg-white p-4 rounded-lg border-2 border-border'>
              <img
                src={generateQRUrl()}
                alt='Payment QR Code'
                width={250}
                height={250}
                className='w-62.5 h-62.5 object-contain'
              />
            </div>
          </div>

          {/* Instructions */}
          <div className='bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm'>
            <div className='font-semibold text-blue-900 dark:text-blue-100 mb-2'>How to scan:</div>
            <ol className='list-decimal list-inside space-y-1 text-blue-800 dark:text-blue-200 text-xs'>
              <li>Open your crypto wallet (MetaMask, Trust Wallet, etc.)</li>
              <li>Look for "Scan QR" or camera icon</li>
              <li>Point camera at QR code</li>
              <li>Wallet will auto-fill address and amount</li>
              <li>Review and confirm transaction</li>
            </ol>
          </div>

          {/* Wallet Address */}
          <div className='bg-muted/50 p-3 rounded-lg'>
            <div className='text-xs text-muted-foreground mb-1'>Wallet Address ({network})</div>
            <div className='flex items-center justify-between gap-2'>
              <div className='flex-1 break-all font-mono text-xs font-semibold'>{address}</div>
              <Button
                variant='outline'
                size='sm'
                onClick={handleCopy}
                className='shrink-0'
              >
                {copied ? (
                  <Check className='h-4 w-4 text-green-500' />
                ) : (
                  <Copy className='h-4 w-4' />
                )}
              </Button>
            </div>
          </div>

          {/* Supported Wallets */}
          <div className='bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm'>
            <div className='font-semibold text-amber-900 dark:text-amber-100 mb-2'>Supported Wallets:</div>
            <div className='grid grid-cols-2 gap-2 text-amber-800 dark:text-amber-200 text-xs'>
              <div>✓ MetaMask</div>
              <div>✓ Trust Wallet</div>
              <div>✓ Coinbase Wallet</div>
              <div>✓ Phantom</div>
              <div>✓ Ledger Live</div>
              <div>✓ Argent</div>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <Button onClick={onClose} className='w-full'>
          Done
        </Button>
      </DialogContent>
    </Dialog>
  )
}
