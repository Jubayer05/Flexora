'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Download, ExternalLink, Eye, X, Copy, CheckCircle2 } from 'lucide-react'
import { getImgUrl } from '@/lib/get-image-url'
import Image from 'next/image'
import { toast } from 'sonner'

interface ProofViewerProps {
  screenshotUrl: string
  verificationCode?: string
  orderNumber?: string
  transferId?: number
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function ProofViewer({
  screenshotUrl,
  verificationCode,
  orderNumber,
  transferId,
  isOpen,
  onOpenChange
}: ProofViewerProps) {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)
  const resolvedScreenshotUrl = getImgUrl(screenshotUrl)

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = resolvedScreenshotUrl
    link.download = `proof-${orderNumber || transferId || Date.now()}.png`
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Proof downloaded successfully')
  }

  const handleCopyCode = async () => {
    if (!verificationCode) return

    try {
      await navigator.clipboard.writeText(verificationCode)
      setCodeCopied(true)
      toast.success('Verification code copied to clipboard')
      setTimeout(() => setCodeCopied(false), 2000)
    } catch (error) {
      toast.error('Failed to copy code')
    }
  }

  const handleViewFullImage = () => {
    window.open(resolvedScreenshotUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className='sm:max-w-4xl max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>Transfer Proof</DialogTitle>
            <DialogDescription>
              {orderNumber && `Order: ${orderNumber}`}
              {transferId && `Transfer ID: ${transferId}`}
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4'>
            {/* Verification Code */}
            {verificationCode && (
              <div className='rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 space-y-2'>
                <div className='flex items-center justify-between'>
                  <Label className='text-sm font-semibold text-blue-600 dark:text-blue-400'>
                    Verification Code
                  </Label>
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={handleCopyCode}
                    className='h-8'
                  >
                    {codeCopied ? (
                      <>
                        <CheckCircle2 className='h-3 w-3 mr-1' />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className='h-3 w-3 mr-1' />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <div className='font-mono text-lg tracking-widest text-center bg-background/50 p-3 rounded border'>
                  {verificationCode}
                </div>
                <p className='text-xs text-muted-foreground text-center'>
                  Save this code for your records. You may need it to verify the transfer.
                </p>
              </div>
            )}

            {/* Screenshot Preview */}
            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <Label className='text-sm font-semibold'>Screenshot Proof</Label>
                <div className='flex gap-2'>
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() => setIsLightboxOpen(true)}
                  >
                    <Eye className='h-4 w-4 mr-1' />
                    View Full
                  </Button>
                  <Button size='sm' variant='outline' onClick={handleDownload}>
                    <Download className='h-4 w-4 mr-1' />
                    Download
                  </Button>
                  <Button size='sm' variant='outline' onClick={handleViewFullImage}>
                    <ExternalLink className='h-4 w-4 mr-1' />
                    Open
                  </Button>
                </div>
              </div>

              <div className='border rounded-lg overflow-hidden bg-muted/20'>
                <div className='relative w-full aspect-video cursor-pointer' onClick={() => setIsLightboxOpen(true)}>
                  <Image
                    src={resolvedScreenshotUrl}
                    alt='Transfer proof screenshot'
                    fill
                    className='object-contain'
                    sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
                  />
                </div>
              </div>

              <p className='text-xs text-muted-foreground text-center'>
                Click on the image to view in full screen
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lightbox Modal */}
      <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
        <DialogContent className='sm:max-w-6xl max-w-[95vw] max-h-[95vh] p-0 bg-black/95'>
          <div className='relative w-full h-full min-h-[60vh] flex items-center justify-center'>
            <Button
              variant='ghost'
              size='icon'
              className='absolute top-4 right-4 z-10 text-white hover:bg-white/20'
              onClick={() => setIsLightboxOpen(false)}
            >
              <X className='h-6 w-6' />
            </Button>
            <div className='relative w-full h-full flex items-center justify-center p-4'>
              <Image
                src={resolvedScreenshotUrl}
                alt='Transfer proof screenshot - Full view'
                width={1200}
                height={800}
                className='max-w-full max-h-[85vh] object-contain'
                unoptimized
              />
            </div>
            <div className='absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2'>
              <Button
                size='sm'
                variant='secondary'
                onClick={handleDownload}
                className='bg-white/90 hover:bg-white'
              >
                <Download className='h-4 w-4 mr-1' />
                Download
              </Button>
              <Button
                size='sm'
                variant='secondary'
                onClick={handleViewFullImage}
                className='bg-white/90 hover:bg-white'
              >
                <ExternalLink className='h-4 w-4 mr-1' />
                Open in New Tab
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

