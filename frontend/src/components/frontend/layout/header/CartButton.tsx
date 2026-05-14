'use client'

import Link from 'next/link'
import { ShoppingCart } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/stores/cart-store'

export default function CartButton() {
  const count = useCartStore((s) => s.getCount())
  const hydrated = useCartStore((s) => s.hydrated)

  return (
    <Link href='/cart' className='relative shrink-0'>
      <Button variant='ghost' size='icon' className='relative !size-8 xl:!size-9'>
        <ShoppingCart className='h-5 w-5' />
        {hydrated && count > 0 && (
          <Badge className='top-0 right-0 absolute bg-red-500 hover:bg-red-600 p-0 rounded-full min-w-4 h-4 text-white text-xs'>
            {count > 9 ? '9+' : count}
          </Badge>
        )}
      </Button>
    </Link>
  )
}


