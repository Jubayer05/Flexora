'use client'

import ProductCard from '@/components/card/ProductCard'
import { Section } from '@/components/common/section'
import { Typography } from '@/components/common/typography'
import ProductCardSkeleton from '@/components/frontend/shop/ProductCardSkeleton'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

type GroupProductsClientProps = {
  group: any
  products: any[]
}

export default function GroupProductsClient({ group, products: initialProducts }: GroupProductsClientProps) {
  const [products] = useState(initialProducts)

  return (
    <Section className='py-8'>
      <div className='mb-6'>
        <Link href='/shop'>
          <Button variant='ghost' className='gap-2 mb-4'>
            <ArrowLeft className='h-4 w-4' />
            Back to Shop
          </Button>
        </Link>
        <Typography variant='h1' as='h1' weight='bold' className='mb-2'>
          {group.name}
        </Typography>
        <Typography variant='body1' className='text-muted-foreground'>
          {products.length} product{products.length !== 1 ? 's' : ''} available
        </Typography>
      </div>

      {products.length > 0 ? (
        <div className='gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
          {products.map((product: any) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className='py-20 text-center'>
          <Typography variant='h3' className='mb-2'>
            No products found
          </Typography>
          <Typography variant='body1' className='mb-6 text-muted-foreground'>
            This group doesn&apos;t have any products yet.
          </Typography>
          <Link href='/shop'>
            <Button>Browse All Products</Button>
          </Link>
        </div>
      )}
    </Section>
  )
}














