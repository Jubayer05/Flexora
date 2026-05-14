'use client'

import MotionLoader from '@/components/common/MotionLoader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import useAsync from '@/hooks/useAsync'
import requests from '@/services/network/http'
import { renderStars } from '@/utils/renderStarts'
import { CheckCircle2, Package, Star } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

type ReviewSummaryResponse = {
  success: boolean
  data: {
    totalPurchasedProducts: number
    pendingReviewsCount: number
    submittedReviewsCount: number
    pendingReviews: Array<{
      productId: number
      orderId: number
      orderNumber: string
      purchasedAt: string
      quantity: number
      total: string | number
      product: {
        id: number
        name: string
        slug?: string | null
        thumbnail?: string | null
        category?: {
          id: number
          name: string
        } | null
      } | null
    }>
    submittedReviews: Array<{
      id: number
      name: string
      feedback: string
      rating: number
      published: boolean
      createdAt: string
      product?: {
        id: number
        name: string
        slug?: string | null
      } | null
    }>
  }
}

export default function UserReviewsPage() {
  const { data, loading, mutate } = useAsync<ReviewSummaryResponse>(
    '/customer/feedbacks/summary',
    false,
    false
  )
  const [activeProductId, setActiveProductId] = useState<number | null>(null)
  const [rating, setRating] = useState(5)
  const [feedback, setFeedback] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const summary = data?.data
  const pendingReviews = summary?.pendingReviews || []
  const submittedReviews = summary?.submittedReviews || []

  const activePendingReview = useMemo(
    () => pendingReviews.find((item) => item.productId === activeProductId) || null,
    [activeProductId, pendingReviews]
  )

  const resetForm = () => {
    setActiveProductId(null)
    setRating(5)
    setFeedback('')
  }

  const handleSubmit = async () => {
    if (!activePendingReview) return
    if (feedback.trim().length < 10) {
      toast.error('Feedback must be at least 10 characters long')
      return
    }

    setSubmitting(true)
    try {
      await requests.post('/customer/feedbacks', {
        productId: activePendingReview.productId,
        rating,
        feedback: feedback.trim()
      })

      toast.success('Review submitted successfully. It will be published after admin approval.')
      resetForm()
      await mutate()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to submit review')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center py-12'>
        <MotionLoader size='lg' variant='dots' />
      </div>
    )
  }

  return (
    <div className='mx-auto max-w-6xl space-y-6'>
      <div className='space-y-1'>
        <h1 className='text-2xl font-semibold text-card-foreground'>Product Reviews</h1>
        <p className='text-sm text-muted-foreground'>
          Leave feedback for each purchased product and manage your submitted reviews.
        </p>
      </div>

      <div className='grid gap-4 md:grid-cols-3'>
        <Card className='border-border bg-card'>
          <CardContent className='p-5'>
            <p className='text-sm text-muted-foreground'>Purchased Products</p>
            <p className='mt-2 text-3xl font-semibold text-card-foreground'>
              {summary?.totalPurchasedProducts || 0}
            </p>
          </CardContent>
        </Card>
        <Card className='border-border bg-card'>
          <CardContent className='p-5'>
            <p className='text-sm text-muted-foreground'>Remaining Reviews</p>
            <p className='mt-2 text-3xl font-semibold text-primary'>
              {summary?.pendingReviewsCount || 0}
            </p>
          </CardContent>
        </Card>
        <Card className='border-border bg-card'>
          <CardContent className='p-5'>
            <p className='text-sm text-muted-foreground'>Submitted Reviews</p>
            <p className='mt-2 text-3xl font-semibold text-card-foreground'>
              {summary?.submittedReviewsCount || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className='border-border bg-card'>
        <CardHeader>
          <CardTitle>Pending Reviews</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          {pendingReviews.length > 0 ? (
            pendingReviews.map((item) => (
              <div key={item.productId} className='rounded-lg border border-border bg-muted/20 p-4'>
                <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
                  <div className='space-y-1'>
                    <div className='flex items-center gap-2'>
                      <Package className='h-4 w-4 text-primary' />
                      <p className='font-medium text-card-foreground'>{item.product?.name || 'Product'}</p>
                    </div>
                    <p className='text-sm text-muted-foreground'>
                      Order #{item.orderNumber} • {item.product?.category?.name || 'Uncategorized'}
                    </p>
                    <p className='text-sm text-muted-foreground'>
                      Purchased on{' '}
                      {new Date(item.purchasedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                  </div>

                  <div className='flex flex-col gap-2 sm:flex-row'>
                    {item.product?.slug ? (
                      <Button asChild variant='outline'>
                        <Link href={`/product/${item.product.slug}`}>Open Product</Link>
                      </Button>
                    ) : null}
                    <Button onClick={() => setActiveProductId(item.productId)}>
                      Leave Review
                    </Button>
                  </div>
                </div>

                {activeProductId === item.productId ? (
                  <div className='mt-5 space-y-4 rounded-lg border border-border bg-background p-4'>
                    <div className='space-y-2'>
                      <p className='text-sm font-medium text-card-foreground'>Your rating</p>
                      <div className='flex flex-wrap gap-2'>
                        {[1, 2, 3, 4, 5].map((value) => (
                          <Button
                            key={value}
                            type='button'
                            variant={rating === value ? 'default' : 'outline'}
                            onClick={() => setRating(value)}
                            className='min-w-12'
                          >
                            <Star className='mr-1 h-4 w-4' />
                            {value}
                          </Button>
                        ))}
                      </div>
                      <div>{renderStars(rating, 18)}</div>
                    </div>

                    <div className='space-y-2'>
                      <p className='text-sm font-medium text-card-foreground'>Your feedback</p>
                      <Textarea
                        value={feedback}
                        onChange={(event) => setFeedback(event.target.value)}
                        placeholder='Share your experience with this product'
                        rows={5}
                      />
                    </div>

                    <div className='flex flex-col gap-2 sm:flex-row sm:justify-end'>
                      <Button variant='outline' onClick={resetForm} disabled={submitting}>
                        Cancel
                      </Button>
                      <Button onClick={handleSubmit} disabled={submitting}>
                        {submitting ? 'Submitting...' : 'Submit Review'}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <div className='rounded-lg border border-dashed border-border p-8 text-center'>
              <CheckCircle2 className='mx-auto h-10 w-10 text-primary' />
              <p className='mt-4 text-lg font-medium text-card-foreground'>All caught up</p>
              <p className='mt-2 text-sm text-muted-foreground'>
                You have no remaining product reviews to leave right now.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className='border-border bg-card'>
        <CardHeader>
          <CardTitle>Submitted Reviews</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          {submittedReviews.length > 0 ? (
            submittedReviews.map((item) => (
              <div key={item.id} className='rounded-lg border border-border bg-muted/20 p-4'>
                <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                  <div className='space-y-1'>
                    <p className='font-medium text-card-foreground'>{item.product?.name || 'Product review'}</p>
                    <div>{renderStars(Number(item.rating || 0), 16)}</div>
                    <p className='text-sm leading-6 text-muted-foreground'>{item.feedback}</p>
                  </div>
                  <div className='space-y-1 text-sm text-muted-foreground sm:text-right'>
                    <p>
                      {new Date(item.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                    <p>{item.published ? 'Published' : 'Pending approval'}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className='text-sm text-muted-foreground'>You have not submitted any product reviews yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
