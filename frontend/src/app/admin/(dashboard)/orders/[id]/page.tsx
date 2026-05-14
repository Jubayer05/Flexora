'use client'

import OrderDetailsView from '@/components/admin/orders/OrderDetailsView'
import PageHeader from '@/components/common/PageHeader'
import MotionLoader from '@/components/common/MotionLoader'
import useAsync from '@/hooks/useAsync'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function OrderDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params?.id as string

  const { data, loading } = useAsync<{
    success: boolean
    data: Order
  }>(() => (orderId ? `/admin/orders/${orderId}` : null))

  if (loading) {
    return (
      <div className='flex justify-center items-center min-h-[400px]'>
        <MotionLoader size='lg' variant='dots' />
      </div>
    )
  }

  if (!data?.data) {
    return (
      <div className='flex justify-center items-center min-h-[400px]'>
        <div className='text-center'>
          <h2 className='mb-2 font-semibold text-xl'>Order Not Found</h2>
          <p className='text-muted-foreground mb-4'>The requested order could not be found.</p>
          <Button variant='outline' onClick={() => router.push('/admin/orders')}>
            <ArrowLeft className='mr-2 w-4 h-4' />
            Back to Orders
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <PageHeader
        title={`Order ${data.data.orderNumber}`}
        subTitle='View complete order details and information'
        extra={
          <Button variant='outline' onClick={() => router.push('/admin/orders')}>
            <ArrowLeft className='mr-2 w-4 h-4' />
            Back to Orders
          </Button>
        }
      />
      <OrderDetailsView order={data.data} />
    </div>
  )
}



