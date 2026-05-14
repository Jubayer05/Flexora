'use client'

import { Button } from '@/components/ui/button'
import requests from '@/services/network/http'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface VerifyMembershipButtonProps {
  transferId: number
  currentStatus: string
  onVerified?: () => void
  guestEmail?: string
}

export function VerifyMembershipButton({
  transferId,
  currentStatus,
  onVerified,
  guestEmail
}: VerifyMembershipButtonProps) {
  const [verifying, setVerifying] = useState(false)

  // Only show button if status is VERIFICATION_REQUIRED
  if (currentStatus !== 'VERIFICATION_REQUIRED') {
    return null
  }

  const handleVerify = async () => {
    setVerifying(true)
    try {
      const response = await requests.post<{ success: boolean; message: string }>(
        `/customer/telegram-transfers/${transferId}/verify-membership`,
        {},
        guestEmail
          ? ({ params: { guestEmail }, skipAuthRedirect: true } as any)
          : undefined
      )

      if (response.success) {
        toast.success(response.message || 'Membership verified successfully!')
        onVerified?.()
      } else {
        toast.error(response.message || 'Failed to verify membership')
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to verify membership. Please try again.')
    } finally {
      setVerifying(false)
    }
  }

  return (
    <Button
      size='sm'
      variant='outline'
      onClick={handleVerify}
      disabled={verifying}
      className='gap-2 bg-emerald-300 text-black'
    >
      {verifying ? (
        <>
          <Loader2 className='size-4 text-black  animate-spin' />
          Verifying...
        </>
      ) : (
        <>
          <CheckCircle2 className='size-2.5 text-black animate-ping ' />
          I&#39;m in
        </>
      )}
    </Button>
  )
}
