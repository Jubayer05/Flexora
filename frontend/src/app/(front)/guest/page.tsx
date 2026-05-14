'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Typography } from '@/components/common/typography'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { AlertCircle, Mail, ShoppingBag } from 'lucide-react'
import Cookies from 'js-cookie'

export default function GuestCheckoutPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')

  const isAuthenticated = !!Cookies.get('token')

  if (isAuthenticated) {
    return (
      <div className='min-h-screen bg-background flex items-center justify-center px-4'>
        <div className='w-full max-w-md'>
          <div className='rounded-lg border border-blue-900/30 bg-blue-950/20 p-4'>
            <div className='flex gap-3'>
              <AlertCircle className='h-4 w-4 text-blue-400 mt-0.5 shrink-0' />
              <p className='text-sm text-blue-200'>
                You are already logged in. Please use your account dashboard for better benefits like
                tracking, affiliate earnings, and subscriptions.
              </p>
            </div>
          </div>
          <div className='mt-4 space-y-2'>
            <Button onClick={() => router.push('/user/profile')} className='w-full'>
              Go to Dashboard
            </Button>
            <Button
              onClick={() => {
                Cookies.remove('token')
                Cookies.remove('refreshToken')
                router.push('/guest')
              }}
              variant='outline'
              className='w-full'
            >
              Continue as Guest
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const handleBrowseProducts = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email.trim()) {
      toast.error('Please enter your email address')
      return
    }
    if (!emailRegex.test(email.trim())) {
      toast.error('Please enter a valid email address')
      return
    }

    sessionStorage.setItem('guestCheckoutEmail', email.trim())
    toast.success('Email saved! Browse products and add them to your cart.')
    router.push('/shop')
  }

  return (
    <div className='min-h-screen bg-background py-12 px-4'>
      <div className='max-w-2xl mx-auto'>
        <div className='text-center mb-12'>
          <div className='inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4'>
            <ShoppingBag className='w-8 h-8 text-primary' />
          </div>
          <Typography variant='h1' className='mb-2 text-white'>
            Guest Checkout
          </Typography>
          <Typography variant='body1' className='text-white/60'>
            Purchase without creating an account. Access your orders anytime with your email.
          </Typography>
        </div>

        <div className='bg-slate-900 rounded-lg border border-white/20 p-8'>
          <div className='mb-8'>
            <div className='flex items-center gap-2 mb-4'>
              <div className='flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white font-semibold'>
                1
              </div>
              <Label className='text-base font-semibold text-white'>Enter Your Email</Label>
            </div>

            <div className='space-y-4 ml-12'>
              <div className='space-y-2'>
                <Label htmlFor='guest-email' className='text-white/80'>
                  Email Address *
                </Label>
                <Input
                  id='guest-email'
                  type='email'
                  placeholder='your@email.com'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleBrowseProducts()}
                  required
                  autoComplete='email'
                  className='bg-white/5 border-white/10 text-white placeholder:text-white/40'
                />
                <p className='text-xs text-white/60'>
                  <Mail className='inline w-3 h-3 mr-1' />
                  Order confirmation and access code will be sent to this email
                </p>
              </div>

              <div className='p-4 rounded-lg border border-slate-700/30 bg-slate-800/20 flex gap-3'>
                <AlertCircle className='h-4 w-4 text-slate-400 shrink-0 mt-0.5' />
                <div className='text-sm text-slate-300'>
                  After purchase, you&apos;ll receive an email with your order details and access
                  code. Use these to view your orders anytime.
                </div>
              </div>
            </div>
          </div>

          <div className='border-t border-white/10 my-8' />

          <div className='mb-8'>
            <div className='flex items-center gap-2 mb-4'>
              <div className='flex items-center justify-center w-8 h-8 rounded-full bg-slate-600 text-white font-semibold'>
                2
              </div>
              <Label className='text-base font-semibold text-white'>Select Product & Pay</Label>
            </div>

            <div className='ml-12 p-4 bg-white/5 rounded-lg border border-dashed border-white/20'>
              <Typography variant='body1' className='text-white/60 text-center'>
                Click &quot;Browse Products&quot; below to select products and proceed to checkout
              </Typography>
            </div>
          </div>

          <div className='flex flex-col gap-3'>
            <Button onClick={handleBrowseProducts} size='lg' className='w-full'>
              Browse Products
            </Button>

            <Button
              variant='outline'
              onClick={() => router.push('/')}
              size='lg'
              className='w-full'
            >
              Back to Home
            </Button>
          </div>
        </div>

        <div className='mt-12 grid md:grid-cols-3 gap-4'>
          <div className='p-4 rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm'>
            <div className='w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mb-3'>
              <Mail className='w-5 h-5 text-blue-400' />
            </div>
            <Typography variant='subtitle1' className='font-semibold mb-2 text-white'>
              Email Access
            </Typography>
            <Typography variant='body2' className='text-sm text-white/60'>
              View orders anytime using your email and access code
            </Typography>
          </div>

          <div className='p-4 rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm'>
            <div className='w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center mb-3'>
              <ShoppingBag className='w-5 h-5 text-green-400' />
            </div>
            <Typography variant='subtitle1' className='font-semibold mb-2 text-white'>
              Instant Delivery
            </Typography>
            <Typography variant='body2' className='text-sm text-white/60'>
              Get your purchases immediately after payment confirmation
            </Typography>
          </div>

          <div className='p-4 rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm'>
            <div className='w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center mb-3'>
              <AlertCircle className='w-5 h-5 text-purple-400' />
            </div>
            <Typography variant='subtitle1' className='font-semibold mb-2 text-white'>
              Secure Downloads
            </Typography>
            <Typography variant='body2' className='text-sm text-white/60'>
              Download in multiple formats: TXT, Excel, JSON
            </Typography>
          </div>
        </div>

        <div className='mt-12 p-6 rounded-lg bg-linear-to-r from-primary/10 to-primary/5 border border-primary/20'>
          <Typography variant='subtitle1' className='font-semibold mb-2 text-white'>
            Want More Features?
          </Typography>
          <Typography variant='body2' className='text-sm text-white/60 mb-4'>
            Register an account after checkout to unlock Rank System, Affiliate Earnings,
            Subscriptions, and exclusive benefits.
          </Typography>
          <Button variant='outline' onClick={() => router.push('/sign-up')} className='w-full'>
            Create Account
          </Button>
        </div>
      </div>
    </div>
  )
}
