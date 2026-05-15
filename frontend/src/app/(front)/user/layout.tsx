'use client'

import UserSidebar from '@/components/frontend/user/UserSidebar'
import { UserBreadcrumbs } from '@/components/frontend/user/UserBreadcrumbs'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { useMounted } from '@/hooks/useMounted'
import useAsync from '@/hooks/useAsync'
import { clearSession } from '@/services/api/authUtils'
import Cookies from 'js-cookie'
import { usePathname, useRouter } from 'next/navigation'
import React, { useEffect, useMemo, useState } from 'react'

export default function FrontLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  const mounted = useMounted()
  const router = useRouter()
  const pathname = usePathname()
  const token = mounted ? Cookies.get('token') : null
  const userCookie = mounted ? Cookies.get('user') ?? '{}' : '{}'
  const [guestSession, setGuestSession] = useState<{ email: string } | null>(null)
  const [guestSessionChecked, setGuestSessionChecked] = useState(false)

  const cookieUserData = useMemo(() => {
    try {
      return JSON.parse(userCookie)
    } catch {
      return null
    }
  }, [userCookie])

  const {
    data: profileResponse,
    loading,
    error
  } = useAsync<{ success: boolean; data: User }>(() => (token ? '/customer/profile' : null), false, false)
  const { data: reviewSummary } = useAsync<{ success: boolean; data: { pendingReviewsCount: number } }>(
    () => (token ? '/customer/feedbacks/summary' : null),
    false,
    false
  )
  const [showReviewReminder, setShowReviewReminder] = useState(false)

  useEffect(() => {
    if (!mounted) return

    if (token) {
      setGuestSession(null)
      setGuestSessionChecked(true)
      return
    }

    const cookieGuestToken = Cookies.get('guestAccessToken') || ''
    const cookieGuestEmail = Cookies.get('guestAccessEmail') || ''
    const storageGuestToken = sessionStorage.getItem('guestAccessToken') || ''
    const storageGuestEmail =
      sessionStorage.getItem('guestVerifiedEmail') || sessionStorage.getItem('guestOrderEmail')
    const guestToken = cookieGuestToken || storageGuestToken
    const guestEmail = cookieGuestEmail || storageGuestEmail || ''

    if (guestToken && guestEmail) {
      sessionStorage.setItem('guestAccessToken', guestToken)
      sessionStorage.setItem('guestVerifiedEmail', guestEmail)
      sessionStorage.setItem('guestOrderEmail', guestEmail)
      setGuestSession({ email: guestEmail })
      setGuestSessionChecked(true)
      return
    }

    setGuestSession(null)
    setGuestSessionChecked(true)
  }, [mounted, token])

  const profileUser = profileResponse?.data || null
  const isGuestSession = !token && !!guestSession
  const resolvedUser =
    profileUser ||
    (!isGuestSession ? cookieUserData : null) ||
    (guestSession
      ? {
          email: guestSession.email,
          firstName: 'Guest',
          username: 'Guest',
          isGuest: true
        }
      : null)

  useEffect(() => {
    if (!mounted) return

    if (!token && !guestSessionChecked) {
      return
    }

    if (!token && !guestSession) {
      router.replace('/login')
      return
    }

    if (guestSession) {
      return
    }

    if (profileUser) {
      Cookies.set('user', JSON.stringify(profileUser))
      return
    }

    if (!loading && (error || !resolvedUser)) {
      clearSession()
    }
  }, [mounted, token, guestSession, guestSessionChecked, profileUser, loading, error, resolvedUser, router])

  useEffect(() => {
    if (!mounted || token || !guestSession) return

    const guestAllowedPaths = ['/user', '/user/profile', '/user/purchased-items']
    const isAllowedGuestPath = guestAllowedPaths.some(
      (allowedPath) => pathname === allowedPath || pathname.startsWith(`${allowedPath}/`)
    )

    if (!isAllowedGuestPath) {
      router.replace('/user/profile')
    }
  }, [mounted, token, guestSession, pathname, router])

  useEffect(() => {
    if (!mounted || !token) return

    const dismissed = sessionStorage.getItem('pendingReviewReminderDismissed')
    const pendingReviewsCount = Number(reviewSummary?.data?.pendingReviewsCount || 0)

    if (!dismissed && pendingReviewsCount > 0) {
      setShowReviewReminder(true)
    }
  }, [mounted, token, reviewSummary?.data?.pendingReviewsCount])

  const userName = useMemo(() => {
    const firstName = resolvedUser?.firstName || ''
    const lastName = resolvedUser?.lastName || ''
    return (
      `${firstName} ${lastName}`.trim() ||
      resolvedUser?.username ||
      resolvedUser?.email ||
      'User'
    )
  }, [resolvedUser])

  if (!mounted || (!token && !guestSessionChecked) || (token && loading && !resolvedUser)) {
    return (
      <div className='bg-background pb-8 sm:pb-16'>
        <div className='max-w-container-max mx-auto px-gutter xl:p-xl pt-10'>
          <div className='animate-pulse space-y-6'>
            <div className='mx-auto h-10 w-72 rounded bg-surface-container-high' />
            <div className='mx-auto h-5 w-64 rounded bg-surface-container-high' />
            <div className='flex flex-col md:flex-row gap-gutter'>
              <div className='w-full md:w-64 h-[420px] rounded-xl bg-surface-container-high' />
              <div className='flex-1 h-[520px] rounded-xl bg-surface-container-high' />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='bg-background text-on-surface min-h-screen'>
      <div className='max-w-container-max mx-auto p-gutter xl:p-xl'>
        <div className='flex flex-col md:flex-row gap-gutter'>
          <aside className='w-full md:w-64 flex-shrink-0'>
            <div className='glass-card rounded-xl p-md sticky top-gutter transition-all duration-300'>
              <h2 className='font-headline-md text-headline-md text-primary mb-lg tracking-tighter uppercase'>
                User Portal
              </h2>
              <UserSidebar userData={resolvedUser} isGuest={isGuestSession} />
            </div>
          </aside>

          <main className='flex-1 min-w-0 space-y-gutter'>
            <header className='flex justify-between items-end border-b border-outline-variant/20 pb-md'>
              <div>
                <h1 className='font-headline-lg text-headline-lg-mobile md:text-headline-lg tracking-tighter'>
                  Welcome Back, {userName}
                </h1>
                <p className='font-body-md text-body-md text-on-surface-variant mt-xs'>
                  Here is your recent activity and stats.
                </p>
              </div>
            </header>
            <UserBreadcrumbs />
            {children}
          </main>
        </div>
      </div>

      <Dialog open={showReviewReminder} onOpenChange={setShowReviewReminder}>
        <DialogContent className='sm:max-w-md bg-surface-container-low border-outline-variant'>
          <DialogHeader>
            <DialogTitle className='text-on-surface'>Pending Product Reviews</DialogTitle>
            <DialogDescription className='text-on-surface-variant'>
              You have {Number(reviewSummary?.data?.pendingReviewsCount || 0)} remaining review
              {Number(reviewSummary?.data?.pendingReviewsCount || 0) === 1 ? '' : 's'} to leave.
            </DialogDescription>
          </DialogHeader>
          <div className='text-sm text-on-surface-variant'>
            Leave feedback for each purchased product so your reviews appear on the related product
            pages and help other customers.
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => {
                sessionStorage.setItem('pendingReviewReminderDismissed', '1')
                setShowReviewReminder(false)
              }}
            >
              Later
            </Button>
            <Button
              onClick={() => {
                sessionStorage.setItem('pendingReviewReminderDismissed', '1')
                setShowReviewReminder(false)
                router.push('/user/reviews')
              }}
            >
              Open Reviews
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}