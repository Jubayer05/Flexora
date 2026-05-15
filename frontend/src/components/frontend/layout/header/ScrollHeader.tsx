'use client'

import { cn } from '@/lib/utils'
import { useCallback, useEffect, useRef, useState } from 'react'

type ScrollHeaderProps = {
  children: React.ReactNode
}

const MIN_SCROLL_TO_HIDE = 72

function getScrollY() {
  return window.scrollY || document.documentElement.scrollTop || 0
}

export default function ScrollHeader({ children }: ScrollHeaderProps) {
  const [visible, setVisible] = useState(true)
  const [headerHeight, setHeaderHeight] = useState(0)
  const headerRef = useRef<HTMLElement>(null)
  const lastScrollY = useRef(0)

  const show = useCallback(() => setVisible(true), [])
  const hide = useCallback(() => setVisible(false), [])

  useEffect(() => {
    const header = headerRef.current
    if (!header) return

    const syncHeight = () => setHeaderHeight(header.offsetHeight)
    syncHeight()

    const observer = new ResizeObserver(syncHeight)
    observer.observe(header)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    lastScrollY.current = getScrollY()

    const onScroll = () => {
      const currentY = getScrollY()

      if (currentY <= MIN_SCROLL_TO_HIDE) {
        show()
      } else if (currentY < lastScrollY.current) {
        show()
      } else if (currentY > lastScrollY.current) {
        hide()
      }

      lastScrollY.current = currentY
    }

    const onWheel = (event: WheelEvent) => {
      const currentY = getScrollY()

      if (currentY <= MIN_SCROLL_TO_HIDE) {
        show()
        return
      }

      if (event.deltaY < 0) {
        show()
      } else if (event.deltaY > 0) {
        hide()
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('wheel', onWheel, { passive: true })

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('wheel', onWheel)
    }
  }, [hide, show])

  return (
    <>
      <header
        ref={headerRef}
        className={cn(
          'fixed top-0 left-0 right-0 z-50 w-full overflow-x-hidden',
          'bg-surface-container-lowest/80 backdrop-blur-md',
          'border-b border-outline-variant shadow-xl',
          'transition-transform duration-300 ease-in-out will-change-transform',
          visible ? 'translate-y-0' : '-translate-y-full'
        )}
      >
        <div className='w-full px-4 md:px-8 lg:px-12 xl:px-20 py-4'>{children}</div>
      </header>
      <div aria-hidden style={{ height: headerHeight }} className='shrink-0' />
    </>
  )
}
