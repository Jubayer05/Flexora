'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'

/**
 * Redirects /user/tickets/[ticketNumber] to /user/tickets?ticket=[ticketNumber]
 * so the main tickets page (chat left, list right) opens with this ticket selected.
 */
export default function TicketNumberRedirect() {
  const params = useParams()
  const router = useRouter()
  const ticketNumber = params?.ticketNumber as string | undefined

  useEffect(() => {
    if (ticketNumber) {
      router.replace(`/user/tickets?ticket=${encodeURIComponent(ticketNumber)}`)
    } else {
      router.replace('/user/tickets')
    }
  }, [ticketNumber, router])

  return (
    <div className='flex justify-center items-center min-h-[200px]'>
      <div className='border-2 border-primary border-t-transparent rounded-full w-8 h-8 animate-spin' />
    </div>
  )
}
