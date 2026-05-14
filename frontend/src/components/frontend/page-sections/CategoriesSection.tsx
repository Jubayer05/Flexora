'use client'
import CategoryCard from '@/components/card/CategoryCard'
import { Container } from '@/components/common/container'
import { Section } from '@/components/common/section'
import { Skeleton } from '@/components/ui/skeleton'
import useAsync from '@/hooks/useAsync'
import { SectionHeader } from './SectionHeader'

interface CategoriesSectionProps {
  heading?: string
  subheading?: string
  apiEndpoint?: string
  dataPath?: string
  variant?: string
  limit?: number
  columns?: number
  layout?: 'grid' | 'carousel'
}

export function CategoriesSection({
  heading,
  subheading,
  apiEndpoint,
  limit = 8,
  columns = 7
}: CategoriesSectionProps) {
  const { data, loading } = useAsync<any>(
    () => (apiEndpoint ? apiEndpoint + (limit ? `?limit=${limit}` : '') : null),
    true
  )

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
        ) : data?.data?.categories.length > 0 ? (
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns} gap-6`}>
            {data?.data?.categories.map((category: any, idx: number) => (
              <CategoryCard key={category.id || idx} category={category} />
            ))}
          </div>
        ) : (
          <div className='py-12 text-muted-foreground text-center'>No categories available</div>
        )}
      </Container>
    </Section>
  )
}
