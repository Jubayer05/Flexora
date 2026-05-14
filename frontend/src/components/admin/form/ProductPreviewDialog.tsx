'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { type CreateProduct } from '@/lib/validations/schemas/product'
import useSerialStockStore from '@/services/state/serial-stock-state'
import { ExternalLink, Eye, Globe, Lock, Star, Tag } from 'lucide-react'

interface ProductPreviewDialogProps {
  data: CreateProduct & {
    discount: number
    discountMode?: 'amount' | 'percent'
    discountValue?: number
  }
  categories: Category[]
  children: React.ReactNode
}

export default function ProductPreviewDialog({
  data,
  categories,
  children
}: ProductPreviewDialogProps) {
  const { items: serialItems } = useSerialStockStore()

  // Find category name
  const categoryName = categories.find((cat) => cat.id === data.categoryId)?.name || 'Unknown'

  // Get non-empty serial items for display
  const validSerialItems = serialItems.filter(
    (item) => item.email.trim() || item.password.trim() || item.id.trim() || item.note.trim()
  )

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className='max-w-5xl! w-full max-h-[90vh] overflow-y-auto custom-scrollbar'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2 text-xl'>
            <Eye className='w-5 h-5' />
            Product Preview
          </DialogTitle>
        </DialogHeader>

        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          {/* Left Column - Product Details */}
          <div className='space-y-6'>
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <Tag className='w-4 h-4' />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='space-y-3'>
                  <div>
                    <p className='text-sm font-medium text-muted-foreground'>Product Name</p>
                    <p className='text-base font-semibold'>{data.name || 'Untitled Product'}</p>
                  </div>

                  <div className='grid grid-cols-2 gap-4'>
                    <div>
                      <p className='text-sm font-medium text-muted-foreground'>Category</p>
                      <Badge variant='secondary'>{categoryName}</Badge>
                    </div>
                    <div>
                      <p className='text-sm font-medium text-muted-foreground'>Type</p>
                      <Badge variant={data.type === 'SERIAL' ? 'default' : 'outline'}>
                        {data.type || 'Not Selected'}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <p className='text-sm font-medium text-muted-foreground'>Description</p>
                    <p className='text-sm text-muted-foreground p-2 rounded'>
                      {data.description || 'No description provided'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pricing */}
            <Card>
              <CardHeader>
                <CardTitle className='text-green-400'>Pricing</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <p className='text-sm font-medium text-green-300'>Current Price</p>
                    <p className='text-xl font-bold text-green-400'>
                      ${data.originalPrice - data.discount || 0}
                    </p>
                  </div>
                  <div>
                    <p className='text-sm font-medium text-green-300'>Original Price</p>
                    <p className='text-lg font-semibold text-green-300'>
                      ${data.originalPrice || 0}
                    </p>
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-4 mt-4'>
                  <div>
                    <p className='text-sm font-medium text-green-300'>Min Quantity</p>
                    <p className='font-semibold'>{data.minQuantity || 1}</p>
                  </div>
                  <div>
                    <p className='text-sm font-medium text-green-300'>Max Quantity</p>
                    <p className='font-semibold'>
                      {data.maxQuantity === 0 ? 'Stock based' : data.maxQuantity || 1000}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Status & Settings */}
            <Card>
              <CardHeader>
                <CardTitle className='text-blue-400'>Status & Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='flex flex-wrap gap-2'>
                  {data.isActive && (
                    <Badge className='bg-green-900/50 text-green-400 border-green-600'>
                      <span className='w-2 h-2 bg-green-500 rounded-full mr-1'></span>
                      Active
                    </Badge>
                  )}
                  {data.isPrivate && (
                    <Badge className='bg-orange-900/50 text-orange-400 border-orange-600'>
                      <Lock className='w-3 h-3 mr-1' />
                      Private
                    </Badge>
                  )}
                  {data.isFeatured && (
                    <Badge className='bg-yellow-900/50 text-yellow-400 border-yellow-600'>
                      <Star className='w-3 h-3 mr-1' />
                      Featured
                    </Badge>
                  )}
                </div>

                {data.isPrivate && data.privateUrl && (
                  <div className='mt-3'>
                    <p className='text-sm font-medium text-blue-300'>Private URL</p>
                    <div className='flex items-center gap-2 mt-1'>
                      <Globe className='w-4 h-4 text-blue-400' />
                      <a
                        href={data.privateUrl}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1'
                      >
                        {data.privateUrl}
                        <ExternalLink className='w-3 h-3' />
                      </a>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Additional Info */}
          <div className='space-y-6'>
            {/* Tags */}
            {data.tags && (
              <Card>
                <CardHeader>
                  <CardTitle className='text-purple-400'>Tags</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className='text-sm text-purple-300 p-2 rounded'>
                    {data.tags || 'No tags specified'}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Policy */}
            {data.meta?.policy && (
              <Card>
                <CardHeader>
                  <CardTitle>Buy/Return Policy</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className='text-sm text-muted-foreground p-2 rounded'>
                    {data.meta.policy || 'No policy specified'}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* SEO Information */}
            <Card>
              <CardHeader>
                <CardTitle className='text-indigo-400'>SEO Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='space-y-3'>
                  <div>
                    <p className='text-sm font-medium text-indigo-300'>Meta Title</p>
                    <p className='text-sm text-muted-foreground p-2 rounded'>
                      {data.seo?.title || 'No meta title set'}
                    </p>
                  </div>
                  <div>
                    <p className='text-sm font-medium text-indigo-300'>Meta Description</p>
                    <p className='text-sm text-muted-foreground p-2 rounded'>
                      {data.seo?.description || 'No meta description set'}
                    </p>
                  </div>
                  <div>
                    <p className='text-sm font-medium text-indigo-300'>Keywords</p>
                    <p className='text-sm text-muted-foreground p-2 rounded'>
                      {data.seo?.keywords || 'No keywords set'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Serial Stock Items - Only show if type is SERIAL */}
            {data.type === 'SERIAL' && (
              <Card>
                <CardHeader>
                  <CardTitle className='text-cyan-400'>
                    Serial Stock Items ({validSerialItems.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {validSerialItems.length > 0 ? (
                    <div className='space-y-2 max-h-48 overflow-y-auto'>
                      {validSerialItems.slice(0, 5).map((item) => (
                        <div key={item._id} className='p-3 rounded text-xs'>
                          <div className='grid grid-cols-2 gap-2'>
                            {item.id && (
                              <div>
                                <span className='font-medium text-cyan-400'>ID:</span>
                                <span className='ml-1 text-muted-foreground'>{item.id}</span>
                              </div>
                            )}
                            {item.email && (
                              <div>
                                <span className='font-medium text-cyan-400'>Email:</span>
                                <span className='ml-1 text-muted-foreground'>{item.email}</span>
                              </div>
                            )}
                            {item.password && (
                              <div>
                                <span className='font-medium text-cyan-400'>Password:</span>
                                <span className='ml-1 text-muted-foreground'>••••••••</span>
                              </div>
                            )}
                            {item.note && (
                              <div className='col-span-2'>
                                <span className='font-medium text-cyan-400'>Note:</span>
                                <span className='ml-1 text-muted-foreground'>{item.note}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {validSerialItems.length > 5 && (
                        <p className='text-center text-cyan-400 text-sm font-medium'>
                          ... and {validSerialItems.length - 5} more items
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className='text-cyan-300 text-sm p-3 rounded'>
                      No serial items have been added yet
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
