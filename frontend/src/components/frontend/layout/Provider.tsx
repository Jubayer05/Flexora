'use client'

import { trackVisitor } from '@/lib/visitorTracker'
import { useEffect } from 'react'
import CartHydrator from '@/components/checkout/CartHydrator'

export default function Provider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Track visitor on mount (once per session per day)
    trackVisitor()
  }, [])
  return (
    <div>
      <CartHydrator />
      {children}
    </div>
  )
}
