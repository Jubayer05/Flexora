'use client'

import { Button } from '@/components/ui/button'
import requests from '@/services/network/http'
import {
  Download,
  FileText,
  FileSpreadsheet,
  FileJson,
  Loader2,
  AlertCircle,
  Info,
  Shield,
  CheckCircle2
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { isFileProductType, isPremiumProductType } from '@/lib/deliveryTypes'

interface MultiFormatDownloadProps {
  orderId: number
  orderNumber?: string
  email?: string
  isAuthenticated?: boolean
  productType?: string
}

type DownloadFormat = 'txt' | 'excel' | 'json'

const formatConfig = {
  txt: {
    icon: FileText,
    label: 'TXT',
    name: 'Text File',
    description: 'Plain text format. Perfect for reading account details and credentials.',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    hoverColor: 'hover:bg-blue-100 dark:hover:bg-blue-950/40'
  },
  excel: {
    icon: FileSpreadsheet,
    label: 'Excel',
    name: 'Excel Spreadsheet',
    description: 'Spreadsheet format. Great for organizing and managing account information.',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-950/20',
    borderColor: 'border-green-200 dark:border-green-800',
    hoverColor: 'hover:bg-green-100 dark:hover:bg-green-950/40'
  },
  json: {
    icon: FileJson,
    label: 'JSON',
    name: 'JSON Data',
    description: 'Data format. Ideal for developers and automated systems.',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/20',
    borderColor: 'border-amber-200 dark:border-amber-800',
    hoverColor: 'hover:bg-amber-100 dark:hover:bg-amber-950/40'
  }
}

export default function MultiFormatDownload({
  orderId,
  orderNumber,
  email,
  isAuthenticated = false,
  productType
}: MultiFormatDownloadProps) {
  const [format, setFormat] = useState<DownloadFormat>('txt')
  const [isDownloading, setIsDownloading] = useState(false)
  const isFileProduct = isFileProductType(productType)
  const isPremiumProduct = isPremiumProductType(productType)
  const supportsJsonDownload = !isFileProduct
  const availableFormats = (supportsJsonDownload
    ? (Object.keys(formatConfig) as DownloadFormat[])
    : (['txt', 'excel'] as DownloadFormat[]))

  if (isFileProduct) {
    return (
      <div className='rounded-lg border border-blue-500/30 bg-blue-50 p-4 text-sm text-blue-900 dark:bg-blue-950/20 dark:text-blue-100'>
        File products are delivered with direct download links in the delivered content section. TXT,
        Excel, and JSON exports are hidden for file-only orders.
      </div>
    )
  }

  if (isPremiumProduct) {
    return (
      <div className='rounded-lg border border-purple-500/30 bg-purple-50 p-4 text-sm text-purple-900 dark:bg-purple-950/20 dark:text-purple-100'>
        Premium products do not require credential exports. Check the delivery status box for the
        activation result.
      </div>
    )
  }

  const downloadOrder = async (downloadFormat: DownloadFormat) => {
    setIsDownloading(true)
    try {
      let response

      // Use guest download endpoint - works for both authenticated and guest users
      // For authenticated users, backend can get email from token
      // For guests, email must be provided
      if (!isAuthenticated && !email) {
        toast.error('Email is required for guest downloads')
        return
      }

      response = await requests.get('/customer/orders/guest/download', {
        params: {
          orderId,
          email: email || '', // Will be ignored for authenticated users
          format: downloadFormat
        },
        responseType: 'blob'
      })

      // Create blob and download
      const contentType =
        downloadFormat === 'json'
          ? 'application/json'
          : downloadFormat === 'excel'
            ? 'text/csv'
            : 'text/plain'

      const blob = response instanceof Blob ? response : new Blob([response], { type: contentType })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Order_${orderNumber || orderId}.${downloadFormat === 'excel' ? 'csv' : downloadFormat}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success(`Order downloaded as ${downloadFormat.toUpperCase()}`)
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || `Failed to download as ${downloadFormat.toUpperCase()}`
      )
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className='space-y-6'>
        {/* Format Selection */}
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
          {availableFormats.map((fmt) => {
            const config = formatConfig[fmt]
            const Icon = config.icon
            const isSelected = format === fmt

            return (
              <button
                key={fmt}
                onClick={() => setFormat(fmt)}
                disabled={isDownloading}
                className={cn(
                  'relative p-4 rounded-xl border-2 transition-all duration-200 text-left',
                  'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                  isSelected
                    ? `${config.bgColor} ${config.borderColor} border-2 shadow-md`
                    : 'bg-background border-border hover:border-muted-foreground/50',
                  isDownloading && 'opacity-50 cursor-not-allowed'
                )}
              >
                {isSelected && (
                  <div className='absolute top-2 right-2'>
                    <CheckCircle2 className={cn('w-5 h-5', config.color)} />
                  </div>
                )}
                <div className='flex items-start gap-3'>
                  <div
                    className={cn(
                      'p-2.5 rounded-lg',
                      isSelected ? config.bgColor : 'bg-muted'
                    )}
                  >
                    <Icon className={cn('w-5 h-5', isSelected ? config.color : 'text-muted-foreground')} />
                  </div>
                  <div className='flex-1 min-w-0'>
                    <div className={cn('font-semibold text-sm mb-1', isSelected ? config.color : 'text-foreground')}>
                      {config.name}
                    </div>
                    <div className='text-xs text-muted-foreground line-clamp-2'>
                      {config.description}
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Security Notice */}
        <div className='space-y-3'>
          <div className='flex items-start gap-3 p-4 rounded-lg border border-yellow-500/30 bg-yellow-50 dark:bg-yellow-950/20'>
            <Shield className='w-5 h-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5' />
            <div className='flex-1'>
              <p className='text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-1'>
                Security Notice
              </p>
              <p className='text-sm text-yellow-800 dark:text-yellow-200'>
                Keep this file secure. It contains sensitive account information. Do not share it with unauthorized persons.
              </p>
            </div>
          </div>

          <div className='flex items-start gap-3 p-4 rounded-lg border border-blue-500/30 bg-blue-50 dark:bg-blue-950/20'>
            <Info className='w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5' />
            <div className='flex-1'>
              <p className='text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1'>
                Session Expired?
              </p>
              <p className='text-sm text-blue-800 dark:text-blue-200'>
                If you see "session expired" error, try logging in by phone using the number and password from this file. Contact support for backup codes if needed.
              </p>
            </div>
          </div>
        </div>

        {/* Download Button */}
        <Button
          onClick={() => downloadOrder(format)}
          disabled={isDownloading || (!isAuthenticated && !email)}
          size='lg'
          className='w-full h-12 text-base font-semibold shadow-md hover:shadow-lg transition-all'
        >
          {isDownloading ? (
            <>
              <Loader2 className='w-5 h-5 mr-2 animate-spin' />
              Downloading {formatConfig[format].name}...
            </>
          ) : (
            <>
              <Download className='w-5 h-5 mr-2' />
              Download as {formatConfig[format].name}
            </>
          )}
        </Button>
    </div>
  )
}

