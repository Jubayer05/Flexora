'use client'

import dynamic from 'next/dynamic'

const CartButton = dynamic(() => import('./CartButton'), { ssr: false })

export default function CartButtonDynamic() {
  return <CartButton />
}


