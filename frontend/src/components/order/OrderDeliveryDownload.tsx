'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { showError } from '@/lib/errMsg'
import requests from '@/services/network/http'
import { Download, Loader2, Mail } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface OrderDeliveryDownloadProps {
  orderId: number
  email: string
}

export default function OrderDeliveryDownload({ orderId, email }: OrderDeliveryDownloadProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState<'request' | 'verify'>('request')
  const [otp, setOtp] = useState('')
  const [isRequesting, setIsRequesting] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)

  const handleRequestOTP = async () => {
    setIsRequesting(true)
    try {
      const response = await requests.post<{
        success: boolean
        message: string
        data: { expiresIn: number }
      }>('/customer/orders/download/request-otp', {
        orderId,
        email
      })

      if (response.success) {
        toast.success(response.message)
        setStep('verify')
      } else {
        toast.error(response.message)
      }
    } catch (error) {
      showError(error)
    } finally {
      setIsRequesting(false)
    }
  }

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP')
      return
    }

    setIsVerifying(true)
    try {
      const response = await requests.post<{
        success: boolean
        message: string
        data: { downloadToken: string; expiresIn: number }
      }>('/customer/orders/download/verify-otp', {
        orderId,
        email,
        otp
      })

      if (response.success) {
        // Get the download token from response
        const token = response.data.downloadToken
        const downloadUrl = `${process.env.NEXT_PUBLIC_APP_ROOT_API}/customer/orders/download/${token}`

        console.log('Download URL:', downloadUrl)

        // Create a temporary anchor element and trigger click
        const link = document.createElement('a')
        link.href = downloadUrl
        link.download = `order-${orderId}-delivery.txt`
        link.target = '_blank'
        link.style.display = 'none'
        document.body.appendChild(link)

        // Small delay to ensure DOM is ready
        setTimeout(() => {
          link.click()
          document.body.removeChild(link)
          toast.success('Download started!')
        }, 100)

        // Reset state and close dialog
        setIsOpen(false)
        setTimeout(() => {
          setStep('request')
          setOtp('')
        }, 500)
      } else {
        toast.error(response.message)
      }
    } catch (error) {
      showError(error)
    } finally {
      setIsVerifying(false)
    }
  }

  const handleOpenDialog = () => {
    setIsOpen(true)
    setStep('request')
    setOtp('')
  }

  return (
    <>
      <Button onClick={handleOpenDialog} variant='outline' className='gap-2 w-full sm:w-auto'>
        <Download className='w-4 h-4' />
        Download Credentials
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Download Order Credentials</DialogTitle>
            <DialogDescription>
              {step === 'request'
                ? 'We will send a verification code to your email to ensure security.'
                : 'Enter the 6-digit code sent to your email.'}
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 py-4'>
            {step === 'request' ? (
              <div className='space-y-4'>
                <div className='space-y-2'>
                  <Label>Email Address</Label>
                  <Input value={email} disabled />
                </div>

                <div className='flex gap-2 bg-blue-500/10 p-3 border border-blue-500/20 rounded-lg text-blue-300 text-sm'>
                  <Mail className='shrink-0 mt-0.5 w-4 h-4' />
                  <p>
                    A 6-digit verification code will be sent to your email. This code expires in 10
                    minutes.
                  </p>
                </div>

                <Button onClick={handleRequestOTP} disabled={isRequesting} className='w-full'>
                  {isRequesting ? (
                    <>
                      <Loader2 className='mr-2 w-4 h-4 animate-spin' />
                      Sending...
                    </>
                  ) : (
                    'Send Verification Code'
                  )}
                </Button>
              </div>
            ) : (
              <div className='space-y-4'>
                <div className='space-y-2'>
                  <Label htmlFor='otp'>Verification Code</Label>
                  <Input
                    id='otp'
                    type='text'
                    placeholder='Enter 6-digit code'
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    className='tracking-widest text-center text-lg'
                    autoFocus
                  />
                  <p className='text-muted-foreground text-xs'>
                    Check your email for the verification code
                  </p>
                </div>

                <div className='flex gap-2'>
                  <Button
                    onClick={() => setStep('request')}
                    variant='outline'
                    disabled={isVerifying}
                    className='flex-1'
                  >
                    Resend Code
                  </Button>
                  <Button
                    onClick={handleVerifyOTP}
                    disabled={isVerifying || otp.length !== 6}
                    className='flex-1'
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className='mr-2 w-4 h-4 animate-spin' />
                        Verifying...
                      </>
                    ) : (
                      'Verify & Download'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
