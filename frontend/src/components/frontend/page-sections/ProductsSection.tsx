'use client'
import ProductCard from '@/components/card/ProductCard'
import { Container } from '@/components/common/container'
import { Section } from '@/components/common/section'
import { Skeleton } from '@/components/ui/skeleton'
import useAsync from '@/hooks/useAsync'
import { SectionHeader } from './SectionHeader'

interface ProductsSectionProps {
  heading?: string
  subheading?: string
  apiEndpoint?: string
  dataPath?: string
  variant?: string
  limit?: number
  columns?: number
  layout?: 'grid' | 'carousel'
}

export function ProductsSection({
  heading,
  subheading,
  apiEndpoint,
  variant = 'default',
  limit = 8,
  columns = 4
}: ProductsSectionProps) {
  const { data, loading } = useAsync<any>(
    () => (apiEndpoint ? apiEndpoint + (limit ? `&limit=${limit}` : '') : null),
    true
  )

  // Extract products from the API response
  // const extractDataByPath = (obj: any, path: string): any[] => {
  //   if (!obj || !path) return []
  //   const keys = path.split('.')
  //   let result = obj
  //   for (const key of keys) {
  //     result = result?.[key]
  //     if (!result) return []
  //   }
  //   return Array.isArray(result) ? result : []
  // }

  // const products = dataPath ? extractDataByPath(data, dataPath) : data?.data?.products || []
  return (
    <Section variant='xl'>
      <Container>
        <SectionHeader heading={heading} subheading={subheading} />

        {loading ? (
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns} gap-6`}>
            {Array.from({ length: limit }).map((_, idx) => (
              <div key={idx} className='space-y-4'>
                <Skeleton className='w-full aspect-square' />
                <Skeleton className='w-3/4 h-4' />
                <Skeleton className='w-1/2 h-4' />
              </div>
            ))}
          </div>
        ) : data?.data?.products.length > 0 ? (
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns} gap-6`}>
            {data?.data?.products.map((product: any, idx: number) => (
              <ProductCard key={product.id || idx} product={product} variant={variant as any} />
            ))}
          </div>
        ) : (
          <div className='py-12 text-muted-foreground text-center'>No products available</div>
        )}
      </Container>
    </Section>
  )
}
