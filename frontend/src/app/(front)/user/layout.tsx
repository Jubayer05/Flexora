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
        <div className='max-w-7xl mx-auto px-4 pt-10'>
          <div className='animate-pulse space-y-6'>
            <div className='mx-auto h-10 w-72 rounded bg-muted' />
            <div className='mx-auto h-5 w-64 rounded bg-muted' />
            <div className='flex flex-col md:flex-row gap-6'>
              <div className='w-full md:w-72 lg:w-80 h-[420px] rounded-[15px] border border-border bg-card' />
              <div className='flex-1 h-[520px] rounded-[15px] border border-border bg-card' />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='bg-background pb-8 sm:pb-16'>
      <div className='max-w-7xl mx-auto px-4'>
        <div className='flex flex-col font-secondary justify-end items-center pb-4 sm:pb-6 md:pb-8 pt-10'>
          <h2 className='text-xl sm:text-2xl md:text-3xl lg:text-[40px] font-bold text-center text-foreground'>
            Welcome back, {userName}
          </h2>
          <p className='text-muted-foreground text-center mt-2 sm:mt-4 text-sm sm:text-base'>
            Manage your account and track your orders
          </p>
        </div>
      </div>

      <div className='max-w-7xl mx-auto px-4'>
        <div className='flex flex-col md:flex-row gap-6'>
          <aside className='w-full md:w-72 lg:w-80 md:sticky md:top-6 z-10'>
            <UserSidebar userData={resolvedUser} isGuest={isGuestSession} />
          </aside>

          <main className='flex-1 min-w-0 font-manrope'>
            <UserBreadcrumbs />
            {children}
          </main>
        </div>
      </div>

      <Dialog open={showReviewReminder} onOpenChange={setShowReviewReminder}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Pending Product Reviews</DialogTitle>
            <DialogDescription>
              You have {Number(reviewSummary?.data?.pendingReviewsCount || 0)} remaining review
              {Number(reviewSummary?.data?.pendingReviewsCount || 0) === 1 ? '' : 's'} to leave.
            </DialogDescription>
          </DialogHeader>
          <div className='text-sm text-muted-foreground'>
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
