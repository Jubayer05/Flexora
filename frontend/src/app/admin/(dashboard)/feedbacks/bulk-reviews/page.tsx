'use client'

import { Suspense, useMemo, useState } from 'react'

import { CustomTable } from '@/components/admin/common/data-table'
import { feedbackColumns } from '@/components/admin/feedbacks/feedback-columns'
import { Pagination } from '@/components/common/Pagination'
import { Typography } from '@/components/common/typography'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import useAsync from '@/hooks/useAsync'
import { useFilter } from '@/hooks/useFilter'
import { showError } from '@/lib/errMsg'
import requests from '@/services/network/http'
import { CalendarClock, Plus, X } from 'lucide-react'
import { toast } from 'sonner'

const BULK_SOURCE = 'BULK_GENERATED' as const

type ProductOption = {
  id: number
  name: string
  slug?: string | null
}

function parseBulkEntries(input: string, standardCreatedAt?: string) {
  return input
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name = '', rating = '', feedback = '', createdAt = ''] = line.split('|').map((part) => part.trim())

      if (!name || !rating || !feedback) {
        throw new Error('Each line must follow: Name | Rating | Comment | Timestamp(optional)')
      }

      const numericRating = Number(rating)
      if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
        throw new Error(`Invalid rating "${rating}" for entry "${line}"`)
      }

      return {
        name,
        rating: numericRating,
        feedback,
        ...(standardCreatedAt || createdAt ? { createdAt: standardCreatedAt || createdAt } : {})
      }
    })
}

function BulkReviewsList() {
  const { page, limit } = useFilter(20)
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [entriesInput, setEntriesInput] = useState('')
  const [standardCreatedAt, setStandardCreatedAt] = useState('')

  const { data, loading, mutate } = useAsync<FeedbackResponse>(() => {
    const params = new URLSearchParams()
    params.set('source', BULK_SOURCE)
    if (page) params.set('page', String(page))
    if (limit) params.set('limit', String(limit))
    return `/admin/feedbacks?${params.toString()}`
  }, false, true, true, 10000)

  const { data: productsData, loading: productsLoading } = useAsync<any>(
    '/admin/products?limit=100',
    false,
    false,
    true
  )

  const productOptions: ProductOption[] = useMemo(() => {
    const products = productsData?.data?.products
    return Array.isArray(products)
      ? products.map((product: any) => ({
          id: Number(product.id),
          name: String(product.name || `Product #${product.id}`),
          slug: product.slug
        }))
      : []
  }, [productsData])

  const selectedProducts = useMemo(() => {
    const selected = new Set(selectedProductIds.map(String))
    return productOptions.filter((product) => selected.has(String(product.id)))
  }, [productOptions, selectedProductIds])

  const availableProducts = useMemo(() => {
    const selected = new Set(selectedProductIds.map(String))
    return productOptions.filter((product) => !selected.has(String(product.id)))
  }, [productOptions, selectedProductIds])

  const feedbacks = data?.data?.feedbacks ?? []
  const pagination = data?.data?.pagination
  const currentPage = pagination?.page ?? page
  const total = pagination?.total ?? 0
  const totalPages = pagination?.pages ?? 1
  const hasPrev = currentPage > 1
  const hasNext = (pagination?.hasNext ?? false) || currentPage < totalPages

  const parsedPreviewCount = useMemo(() => {
    return entriesInput
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean).length
  }, [entriesInput])

  const addSelectedProduct = () => {
    if (!selectedProductId) return
    if (selectedProductIds.includes(selectedProductId)) return
    if (selectedProductIds.length >= 10) {
      toast.error('You can assign reviews to up to 10 products at a time')
      return
    }

    setSelectedProductIds((prev) => [...prev, selectedProductId])
    setSelectedProductId('')
  }

  const removeSelectedProduct = (productId: string) => {
    setSelectedProductIds((prev) => prev.filter((id) => id !== productId))
  }

  const onBulkAssignSubmit = async () => {
    if (selectedProductIds.length === 0) {
      toast.error('Select at least one product')
      return
    }

    if (selectedProductIds.length > 10) {
      toast.error('You can assign reviews to up to 10 products at a time')
      return
    }

    if (!entriesInput.trim()) {
      toast.error('Enter at least one review entry')
      return
    }

    setIsProcessing(true)
    try {
      const entries = parseBulkEntries(entriesInput, standardCreatedAt)

      await requests.post('/admin/feedbacks/bulk-assign', {
        productIds: selectedProductIds.map((id) => Number(id)),
        entries
      })

      toast.success(`Successfully assigned ${entries.length} review entries`)
      setEntriesInput('')
      setSelectedProductIds([])
      setSelectedProductId('')
      setStandardCreatedAt('')
      mutate()
    } catch (error) {
      showError(error)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className='mx-auto w-full overflow-x-hidden'>
      <Card className='mb-10 w-full border-0'>
        <CardHeader>
          <CardTitle>Bulk Review Upload</CardTitle>
          <Typography variant='body2' className='text-sm text-muted-foreground'>
            Select up to 10 products, then upload review lines in this format:
            <br />
            <span className='font-medium'>
              Name | Rating | Comment | Timestamp(optional)
            </span>
          </Typography>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-3'>
            <label className='block text-sm font-medium text-foreground'>Assign To Products</label>
            <div className='flex flex-col gap-2 sm:flex-row'>
              <select
                value={selectedProductId}
                onChange={(event) => setSelectedProductId(event.target.value)}
                disabled={isProcessing || productsLoading || availableProducts.length === 0}
                className='h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60'
              >
                <option value=''>
                  {productsLoading
                    ? 'Loading products...'
                    : availableProducts.length
                      ? 'Select product'
                      : 'All loaded products selected'}
                </option>
                {availableProducts.map((product) => (
                  <option key={product.id} value={String(product.id)}>
                    {product.name}
                  </option>
                ))}
              </select>
              <Button
                type='button'
                onClick={addSelectedProduct}
                disabled={isProcessing || !selectedProductId}
                className='gap-2'
              >
                <Plus className='h-4 w-4' />
                Add Product
              </Button>
            </div>

            {selectedProducts.length > 0 ? (
              <div className='rounded-lg border border-border bg-muted/20 p-3'>
                <div className='mb-2 flex items-center justify-between gap-2'>
                  <p className='text-sm font-medium text-card-foreground'>
                    Selected Products ({selectedProducts.length}/10)
                  </p>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    onClick={() => setSelectedProductIds([])}
                    disabled={isProcessing}
                  >
                    Clear
                  </Button>
                </div>
                <div className='flex flex-wrap gap-2'>
                  {selectedProducts.map((product) => (
                    <Badge
                      key={product.id}
                      variant='secondary'
                      className='gap-2 px-3 py-1.5 text-sm'
                    >
                      {product.name}
                      <button
                        type='button'
                        onClick={() => removeSelectedProduct(String(product.id))}
                        disabled={isProcessing}
                        className='rounded-full hover:text-destructive disabled:cursor-not-allowed'
                        aria-label={`Remove ${product.name}`}
                      >
                        <X className='h-3.5 w-3.5' />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <p className='text-xs text-muted-foreground'>
                Add each product once. Selected products are removed from the dropdown.
              </p>
            )}
          </div>

          <div className='space-y-2'>
            <label className='flex items-center gap-2 text-sm font-medium text-foreground'>
              <CalendarClock className='h-4 w-4 text-primary' />
              Standard Review Timer
            </label>
            <Input
              type='datetime-local'
              value={standardCreatedAt}
              onChange={(event) => setStandardCreatedAt(event.target.value)}
              disabled={isProcessing}
            />
            <p className='text-xs text-muted-foreground'>
              Optional. If set, the same date and time is applied to every pasted review.
            </p>
          </div>

          <div className='space-y-2'>
            <label className='block text-sm font-medium text-foreground'>Review Entries</label>
            <Textarea
              value={entriesInput}
              onChange={(event) => setEntriesInput(event.target.value)}
              rows={12}
              disabled={isProcessing}
              placeholder={`John Doe | 5 | Great service and fast delivery! | 2026-04-01 10:30:00\nJane Smith | 4.5 | Good quality product and smooth process\nAlex | 5 | Excellent support and delivery`}
            />
            <p className='text-xs text-muted-foreground'>
              {parsedPreviewCount} entr{parsedPreviewCount === 1 ? 'y' : 'ies'} ready for assignment.
              Reviews are distributed across selected products in sequence.
              {standardCreatedAt ? ' The standard timer will be applied to all entries.' : ''}
            </p>
          </div>

          <div className='flex justify-center gap-4 sm:justify-end'>
            <Button
              type='button'
              variant='outline'
              onClick={() => {
                setEntriesInput('')
                setSelectedProductIds([])
                setSelectedProductId('')
                setStandardCreatedAt('')
              }}
              disabled={isProcessing}
            >
              Reset
            </Button>
            <Button type='button' onClick={onBulkAssignSubmit} disabled={isProcessing}>
              {isProcessing ? 'Assigning...' : 'Assign Reviews'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <CustomTable
        columns={feedbackColumns(mutate)}
        data={feedbacks}
        getRowId={(row: Feedback, index: number) => row?.id ?? index}
        emptyMessage={loading ? 'Loading bulk reviews...' : 'No bulk-generated reviews yet.'}
        className={loading ? 'opacity-50 pointer-events-none' : ''}
      />

      <Pagination
        paginationData={{
          page: currentPage,
          limit: pagination?.limit ?? limit,
          total,
          pages: totalPages,
          hasNext,
          hasPrev
        }}
        pageSizeOptions={[10, 20, 50, 100]}
      />
    </div>
  )
}

export default function BulkReviewsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BulkReviewsList />
    </Suspense>
  )
}
