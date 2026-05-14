'use client'

import { Wrench } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const DEFAULT_MESSAGE =
  "We're currently performing maintenance. Please check back later."

export function MaintenanceWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isMaintenance, setIsMaintenance] = useState(false)
  const [maintenanceMessage, setMaintenanceMessage] = useState(DEFAULT_MESSAGE)
  const [checking, setChecking] = useState(true)

  const isAdminRoute = pathname?.startsWith('/admin')

  useEffect(() => {
    if (isAdminRoute) {
      setChecking(false)
      return
    }

    let cancelled = false
    const check = async () => {
      try {
        const res = await fetch(`/api/maintenance-status?t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            Pragma: 'no-cache'
          }
        })
        if (cancelled) return
        if (res.ok) {
          const data = await res.json()
          setIsMaintenance(Boolean(data.isMaintenanceMode))
          setMaintenanceMessage(
            data.maintenanceMessage?.trim() || DEFAULT_MESSAGE
          )
        }
      } catch {
        if (!cancelled) setIsMaintenance(false)
      } finally {
        if (!cancelled) setChecking(false)
      }
    }
    check()
    return () => {
      cancelled = true
    }
  }, [isAdminRoute])

  if (checking) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-background'>
        <div className='text-center'>
          <div className='mx-auto border-primary border-b-2 rounded-full w-10 h-10 animate-spin' />
          <p className='mt-3 text-muted-foreground'>Loading...</p>
        </div>
      </div>
    )
  }

  if (isMaintenance) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-background text-foreground relative overflow-hidden'>
        <div className='absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent' />

        <div className='text-center max-w-xl mx-auto px-6 py-12 relative z-10'>
          <div className='flex justify-center mb-6'>
            <div className='rounded-xl bg-card border border-border p-4'>
              <Wrench className='w-14 h-14 text-primary' />
            </div>
          </div>

          <h1 className='text-2xl md:text-3xl font-bold text-foreground mb-2'>
            Under maintenance
          </h1>
          <p className='text-muted-foreground mb-6'>
            We&apos;re working hard to improve your experience.
          </p>

          <div className='inline-flex items-center gap-2 px-4 py-2 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-sm font-medium mb-8'>
            <span className='w-2 h-2 rounded-full bg-current animate-pulse' />
            Maintenance in progress
          </div>

          <div className='rounded-xl border border-border bg-card/50 backdrop-blur-sm p-6 text-left'>
            <p className='text-muted-foreground leading-relaxed'>
              {maintenanceMessage}
            </p>
          </div>

          <p className='text-muted-foreground text-sm mt-10'>
            Thank you for your patience.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
