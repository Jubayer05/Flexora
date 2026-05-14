'use client'

import TicketChatView from '@/components/admin/tickets/TicketChatView'
import useAsync from '@/hooks/useAsync'
import { useParams } from 'next/navigation'

export default function ReplyTicketPage() {
  const params = useParams()
  const { data, loading, mutate } = useAsync<{ data: any }>(`/admin/tickets/${params.id}`)

  if (loading) {
    return (
      <div className='flex justify-center items-center min-h-[400px]'>
        <div className='text-center'>
          <div className='mx-auto mb-4 border-4 border-primary border-t-transparent rounded-full w-8 h-8 animate-spin'></div>
          <p className='text-muted-foreground'>Loading ticket details...</p>
        </div>
      </div>
    )
  }

  if (!data?.data) {
    return (
      <div className='flex justify-center items-center min-h-[400px]'>
        <div className='text-center'>
          <h2 className='mb-2 font-semibold text-xl'>Ticket Not Found</h2>
          <p className='text-muted-foreground'>The requested ticket could not be found.</p>
        </div>
      </div>
    )
  }

  const ticket = data.data

  return <TicketChatView ticket={ticket} showHeader refetch={mutate} />
}
