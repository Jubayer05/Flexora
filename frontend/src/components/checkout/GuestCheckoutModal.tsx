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
import { isTelegramTransferProduct } from '@/lib/productTypeUtils'
import requests from '@/services/network/http'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

interface GuestCheckoutModalProps {
  isOpen: boolean
  onClose: () => void
  productId: number
  quantity?: number
}
// Simple product interface for displaying product details in the modal
interface Product {
  id: number
  name: string
  platform: string
  type: string
}

export default function GuestCheckoutModal({
  isOpen,
  onClose,
  productId,
  quantity = 1
}: GuestCheckoutModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [product, setProduct] = useState<Product | null>(null)

  // Form fields
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [telegram, setTelegram] = useState('')

  // Determine if telegram field is needed
  const isTelegramTransfer = isTelegramTransferProduct(product)

  // Fetch product details
  const fetchProductDetails = async () => {
    setLoading(true)
    try {
      const response: any = await requests.get(`/products/${productId}`)
      if (response.success) {
        setProduct(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch product:', error)
      showError(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && productId) {
      fetchProductDetails()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, productId])

  const validateForm = () => {
    // Validate email
    if (!email.trim()) {
      toast.error('Email is required')
      return false
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address')
      return false
    }

    // Validate name
    if (!name.trim()) {
      toast.error('Full name is required')
      return false
    }

    if (name.trim().length < 2) {
      toast.error('Name must be at least 2 characters')
      return false
    }

    // Validate telegram for transfer products
    if (isTelegramTransfer && !telegram.trim()) {
      toast.error('Telegram phone number is required for transfer products')
      return false
    }

    if (isTelegramTransfer) {
      const phoneRegex = /^\+\d{10,15}$/
      if (!phoneRegex.test(telegram)) {
        toast.error('Telegram phone must be in format: +1234567890')
        return false
      }
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setSubmitting(true)

    try {
      // Store guest data in sessionStorage for checkout page
      const guestData = {
        email: email.trim(),
        name: name.trim(),
        telegram: telegram.trim() || undefined,
        timestamp: Date.now()
      }

      sessionStorage.setItem('guestCheckoutData', JSON.stringify(guestData))

      // Close modal and redirect to checkout
      toast.success('Proceeding to checkout...')
      onClose()

      // Navigate to correct checkout page based on product type
      let checkoutUrl = '/checkout/accounts' // Default

      if (product) {
        // Check product type or name to determine checkout route
        if (isTelegramTransfer || product.type?.toLowerCase() === 'transfer' || product.name.toLowerCase().includes('transfer')) {
          checkoutUrl = '/checkout/telegram/transfer'
        } else if (
          product.platform?.toLowerCase() === 'telegram' ||
          product.name.toLowerCase().includes('telegram')
        ) {
          checkoutUrl = '/checkout/telegram/account'
        }
      }

      router.push(`${checkoutUrl}?id=${productId}&guest=true`)
    } catch (error) {
      console.error('Failed to process guest checkout:', error)
      showError(error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!submitting) {
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>Guest Checkout</DialogTitle>
          <DialogDescription>
            Enter your details to continue with your purchase. Order details will be sent to your
            email.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className='flex items-center justify-center py-8'>
            <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className='space-y-4 pt-4'>
            {/* Product Info */}
            {product && (
              <div className='bg-muted/50 p-3 rounded-md'>
                <p className='text-sm text-muted-foreground'>Product</p>
                <p className='font-medium'>{product.name}</p>
                <p className='text-sm text-muted-foreground'>Quantity: {quantity}</p>
              </div>
            )}

            {/* Email Field */}
            <div className='space-y-2'>
              <Label htmlFor='guest-email'>
                Email Address <span className='text-destructive'>*</span>
              </Label>
              <Input
                id='guest-email'
                type='email'
                placeholder='your@email.com'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
                required
                autoComplete='email'
              />
              <p className='text-xs text-muted-foreground'>
                Order confirmation and account details will be sent here
              </p>
            </div>

            {/* Name Field */}
            <div className='space-y-2'>
              <Label htmlFor='guest-name'>
                Full Name <span className='text-destructive'>*</span>
              </Label>
              <Input
                id='guest-name'
                type='text'
                placeholder='John Doe'
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={submitting}
                required
                autoComplete='name'
              />
            </div>

            {/* Telegram Field (Conditional) */}
            {isTelegramTransfer && (
              <div className='space-y-2'>
                <Label htmlFor='guest-telegram'>
                  Telegram Phone Number <span className='text-destructive'>*</span>
                </Label>
                <Input
                  id='guest-telegram'
                  type='tel'
                  placeholder='+1234567890'
                  value={telegram}
                  onChange={(e) => setTelegram(e.target.value)}
                  disabled={submitting}
                  required
                />
                <p className='text-xs text-muted-foreground'>
                  Required for group/channel ownership transfer
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className='flex gap-3 pt-4'>
              <Button
                type='button'
                variant='outline'
                onClick={handleClose}
                disabled={submitting}
                className='flex-1'
              >
                Cancel
              </Button>
              <Button type='submit' disabled={submitting} className='flex-1'>
                {submitting ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Processing...
                  </>
                ) : (
                  'Continue to Checkout'
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
