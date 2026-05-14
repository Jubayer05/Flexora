'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const VISITOR_ID_KEY = 'uhq_url_tracking_visitor_id'

function getOrCreateVisitorId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem(VISITOR_ID_KEY)
  if (!id) {
    id = `${Date.now()}-${Math.random().toString(36).slice(2, 15)}`
    localStorage.setItem(VISITOR_ID_KEY, id)
  }
  return id
}

function getDeviceInfo() {
  if (typeof window === 'undefined') return undefined
  const ua = navigator.userAgent
  return {
    screenResolution: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
    userAgent: ua
  }
}

export default function GoSlugPage() {
  const params = useParams()
  const router = useRouter()
  const slugParam = params?.slug
  const slug = Array.isArray(slugParam)
    ? slugParam.join('/')
    : typeof slugParam === 'string'
      ? slugParam
      : ''
  const [status, setStatus] = useState<'loading' | 'redirecting' | 'error'>('loading')

  useEffect(() => {
    if (!slug) {
      setStatus('error')
      return
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_ROOT_API || ''
    const trackUrl = baseUrl ? `${baseUrl.replace(/\/$/, '')}/url-tracking/track` : '/url-tracking/track'

    const run = async () => {
      const visitorId = getOrCreateVisitorId()
      const deviceInfo = getDeviceInfo()

      try {
        const res = await fetch(trackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug, visitorId, deviceInfo })
        })

        const data = await res.json().catch(() => ({}))

        if (!res.ok || !data?.success) {
          setStatus('error')
          return
        }

        setStatus('redirecting')
        const redirectUrl = data?.data?.redirectUrl
        if (redirectUrl && typeof redirectUrl === 'string') {
          window.location.href = redirectUrl
        } else {
          router.replace('/')
        }
      } catch {
        setStatus('error')
      }
    }

    run()
  }, [slug, router])

  if (status === 'error') {
    return (
      <div className='min-h-[40vh] flex items-center justify-center'>
        <p className='text-muted-foreground'>Invalid or inactive tracking link.</p>
      </div>
    )
  }

  return (
    <div className='min-h-[40vh] flex items-center justify-center'>
      <p className='text-muted-foreground'>
        {status === 'redirecting' ? 'Redirecting...' : 'Loading...'}
      </p>
    </div>
  )
}
