'use client'

import { useEffect, useState } from 'react'

/**
 * Returns true only after the component has mounted (i.e. in the browser after hydration).
 * Stays false during SSR and the first client render to avoid server/client text mismatch
 * when rendering dynamic, client-only data (cookies, SWR, Date.now(), etc.) inside
 * components like Badge that would otherwise cause "Hydration failed because the server
 * rendered text didn't match the client".
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])
  return mounted
}
