'use client'

import Cookies from 'js-cookie'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function UserDashboardIndexPage() {
  const router = useRouter()

  useEffect(() => {
    const token = Cookies.get('token')
    const guestToken = Cookies.get('guestAccessToken') || sessionStorage.getItem('guestAccessToken')
    const guestEmail =
      Cookies.get('guestAccessEmail') ||
      sessionStorage.getItem('guestVerifiedEmail') || sessionStorage.getItem('guestOrderEmail')

    if (guestToken && guestEmail) {
      sessionStorage.setItem('guestAccessToken', guestToken)
      sessionStorage.setItem('guestVerifiedEmail', guestEmail)
      sessionStorage.setItem('guestOrderEmail', guestEmail)
    }

    if (!token && guestToken && guestEmail) {
      router.replace('/user/profile')
      return
    }

    router.replace('/user/profile')
  }, [router])

  return null
}
