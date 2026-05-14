'use client'

import { useEffect } from 'react'
import { useCartStore } from '@/stores/cart-store'

export default function CartHydrator() {
  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        await (useCartStore as any).persist?.rehydrate?.()
      } finally {
        if (cancelled) return
        useCartStore.getState().hydrate()
        await useCartStore.getState().init()
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  return null
}


