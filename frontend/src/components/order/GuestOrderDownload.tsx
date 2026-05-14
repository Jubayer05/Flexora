import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import requests from '@/services/network/http'
import { useState } from 'react'
import { toast } from 'sonner'
import { Download, Loader2, FileText, FileSpreadsheet, FileJson, AlertCircle } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { isFileProductType, isPremiumProductType } from '@/lib/deliveryTypes'

interface GuestOrderDownloadProps {
  orderId: number
  email: string
  productType?: string
}

type DownloadFormat = 'txt' | 'excel' | 'json'

export default function GuestOrderDownload({ orderId, email, productType }: GuestOrderDownloadProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [format, setFormat] = useState<DownloadFormat>('txt')
  const [isDownloading, setIsDownloading] = useState(false)
  const isFileProduct = isFileProductType(productType)
  const isPremiumProduct = isPremiumProductType(productType)
  const supportsJsonDownload = !isFileProduct && !isPremiumProduct

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      const response = await requests.get('/customer/orders/guest/download', {
        params: {
          orderId,
          email,
          format
        },
        responseType: 'blob'
      })

      // Create blob and download
      const contentType =
        format === 'json'
          ? 'application/json'
          : format === 'excel'
            ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            : 'text/plain'

      const blob = new Blob([response], { type: contentType })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Order_${orderId}.${format === 'excel' ? 'csv' : format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success(`Order downloaded as ${format.toUpperCase()}`)
      setIsOpen(false)
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Failed to download as ${format.toUpperCase()}`)
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div>
      <Button onClick={() => setIsOpen(!isOpen)} variant='outline' size='sm'>
        <Download className='w-4 h-4 mr-2' />
        Download Options
      </Button>

      {isOpen && (
        <div className='mt-4 p-6 border border-white/20 rounded-lg bg-slate-900 space-y-4'>
          {isFileProduct ? (
            <div className='p-4 rounded-lg border border-blue-900/30 bg-blue-950/20 text-sm text-blue-100'>
              File products use direct download links in the delivery details. TXT, Excel, and JSON
              exports are hidden for file-only orders.
            </div>
          ) : isPremiumProduct ? (
            <div className='p-4 rounded-lg border border-purple-900/30 bg-purple-950/20 text-sm text-purple-100'>
              Premium products do not require TXT, Excel, or JSON exports. Check the delivery status
              for the activation result.
            </div>
          ) : (
          <div>
            <h4 className='font-semibold mb-3 text-white'>Choose Download Format</h4>

            <Tabs value={format} onValueChange={(v) => setFormat(v as DownloadFormat)}>
              <TabsList className={`grid w-full ${supportsJsonDownload ? 'grid-cols-3' : 'grid-cols-2'}`}>
                <TabsTrigger value='txt' className='flex items-center gap-2'>
                  <FileText className='w-4 h-4' />
                  TXT
                </TabsTrigger>
                <TabsTrigger value='excel' className='flex items-center gap-2'>
                  <FileSpreadsheet className='w-4 h-4' />
                  Excel
                </TabsTrigger>
                {supportsJsonDownload && (
                  <TabsTrigger value='json' className='flex items-center gap-2'>
                    <FileJson className='w-4 h-4' />
                    JSON
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value='txt' className='mt-4 space-y-3'>
                <p className='text-sm text-white/60'>
                  Download as plain text file. Perfect for reading account details and credentials.
                </p>
                <div className='p-3 rounded-lg border border-yellow-900/30 bg-yellow-950/20 flex gap-3'>
                  <AlertCircle className='h-4 w-4 text-yellow-400 shrink-0 mt-0.5' />
                  <div className='text-sm text-yellow-200'>
                    Keep this file secure. It contains sensitive account information.
                  </div>
                </div>
              </TabsContent>

              <TabsContent value='excel' className='mt-4 space-y-3'>
                <p className='text-sm text-white/60'>
                  Download as Excel spreadsheet. Great for organizing and managing account
                  information.
                </p>
                <div className='p-3 rounded-lg border border-yellow-900/30 bg-yellow-950/20 flex gap-3'>
                  <AlertCircle className='h-4 w-4 text-yellow-400 shrink-0 mt-0.5' />
                  <div className='text-sm text-yellow-200'>
                    Spreadsheet includes formatted columns for easy viewing and management.
                  </div>
                </div>
              </TabsContent>

              {supportsJsonDownload && (
                <TabsContent value='json' className='mt-4 space-y-3'>
                  <p className='text-sm text-white/60'>
                    Download as JSON data format. Ideal for developers and automated systems.
                  </p>
                  <div className='p-3 rounded-lg border border-yellow-900/30 bg-yellow-950/20 flex gap-3'>
                    <AlertCircle className='h-4 w-4 text-yellow-400 shrink-0 mt-0.5' />
                    <div className='text-sm text-yellow-200'>
                      JSON format includes complete order and account data for integration.
                    </div>
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </div>
          )}

          <div className='flex gap-3'>
            {!isFileProduct && !isPremiumProduct && (
            <Button onClick={handleDownload} disabled={isDownloading} className='flex-1'>
              {isDownloading ? (
                <>
                  <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className='w-4 h-4 mr-2' />
                  Download as {format.toUpperCase()}
                </>
              )}
            </Button>
            )}
            <Button
              onClick={() => setIsOpen(false)}
              variant='outline'
              disabled={isDownloading}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
