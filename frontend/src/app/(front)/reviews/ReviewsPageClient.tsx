'use client'

import { Container } from '@/components/common/container'
import MotionLoader from '@/components/common/MotionLoader'
import { Section } from '@/components/common/section'
import { Typography } from '@/components/common/typography'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import useAsync from '@/hooks/useAsync'
import { renderStars } from '@/utils/renderStarts'
import { Search, Star } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'

type PublicReviewsResponse = {
  success: boolean
  data: {
    feedbacks: Array<{
      id: number
      name: string
      feedback: string
      rating: number | string
      createdAt: string
      product?: {
        id: number
        name: string
        slug?: string | null
      } | null
    }>
    pagination: {
      total: number
      page: number
      limit: number
      pages: number
      hasNext: boolean
      hasPrev: boolean
    }
  }
}

const PAGE_SIZE = 24

export default function ReviewsPageClient() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [rating, setRating] = useState('all')

  const query = useMemo(() => {
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('limit', String(PAGE_SIZE))
    params.set('sortBy', 'createdAt')
    params.set('sortOrder', 'desc')
    if (search.trim()) params.set('search', search.trim())
    if (rating !== 'all') params.set('rating', rating)
    return params.toString()
  }, [page, rating, search])

  const { data, loading, validating } = useAsync<PublicReviewsResponse>(
    `/feedbacks?${query}`,
    false,
    true,
    true,
    10000
  )

  const reviews = data?.data?.feedbacks ?? []
  const pagination = data?.data?.pagination
  const total = pagination?.total ?? 0

  const resetPage = (next: () => void) => {
    setPage(1)
    next()
  }

  return (
    <Section variant='xl' className='py-8 sm:py-12'>
      <Container>
        <div className='mx-auto max-w-6xl space-y-6'>
          <div className='space-y-2 text-center'>
            <Badge variant='secondary' className='gap-1.5'>
              <Star className='h-3.5 w-3.5 text-primary' />
              Customer Reviews
            </Badge>
            <Typography variant='h2' as='h1' weight='bold'>
              What buyers are saying
            </Typography>
            <p className='mx-auto max-w-2xl text-sm text-muted-foreground sm:text-base'>
              Browse recent feedback from customers who purchased accounts, files, services, and digital products from UHQ Accounts.
            </p>
          </div>

          <Card className='border-border bg-card'>
            <CardContent className='flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between'>
              <div className='relative flex-1'>
                <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                <Input
                  value={search}
                  onChange={(event) => resetPage(() => setSearch(event.target.value))}
                  placeholder='Search by product, name, or feedback'
                  className='pl-9'
                />
              </div>
              <select
                value={rating}
                onChange={(event) => resetPage(() => setRating(event.target.value))}
                className='h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring'
              >
                <option value='all'>All ratings</option>
                <option value='5'>5 stars</option>
                <option value='4'>4 stars</option>
                <option value='3'>3 stars</option>
                <option value='2'>2 stars</option>
                <option value='1'>1 star</option>
              </select>
              <div className='text-sm text-muted-foreground'>
                {validating && !loading ? 'Refreshing...' : `${total} review${total === 1 ? '' : 's'}`}
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <div className='flex justify-center py-16'>
              <MotionLoader size='lg' variant='dots' />
            </div>
          ) : reviews.length > 0 ? (
            <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3'>
              {reviews.map((review) => (
                <Card key={review.id} className='border-border bg-card'>
                  <CardContent className='flex h-full flex-col gap-4 p-5'>
                    <div className='flex items-start justify-between gap-3'>
                      <div>
                        <p className='font-semibold text-card-foreground'>{review.name}</p>
                        <p className='text-xs text-muted-foreground'>
                          {new Date(review.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                      <div className='shrink-0'>{renderStars(Number(review.rating || 0), 15)}</div>
                    </div>

                    <p className='flex-1 text-sm leading-6 text-muted-foreground'>{review.feedback}</p>

                    {review.product ? (
                      <div className='rounded-md border border-border bg-muted/30 px-3 py-2 text-sm'>
                        {review.product.slug ? (
                          <Link
                            href={`/product/${review.product.slug}`}
                            className='font-medium text-primary hover:underline'
                          >
                            {review.product.name}
                          </Link>
                        ) : (
                          <span className='font-medium text-card-foreground'>
                            {review.product.name}
                          </span>
                        )}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className='border-dashed'>
              <CardContent className='p-10 text-center text-sm text-muted-foreground'>
                No reviews match your filters yet. Try a different search or rating.
              </CardContent>
            </Card>
          )}

          {pagination && pagination.pages > 1 ? (
            <div className='flex items-center justify-center gap-3'>
              <Button
                type='button'
                variant='outline'
                disabled={!pagination.hasPrev}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </Button>
              <span className='text-sm text-muted-foreground'>
                Page {pagination.page} of {pagination.pages}
              </span>
              <Button
                type='button'
                variant='outline'
                disabled={!pagination.hasNext}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </Button>
            </div>
          ) : null}
        </div>
      </Container>
    </Section>
  )
}
