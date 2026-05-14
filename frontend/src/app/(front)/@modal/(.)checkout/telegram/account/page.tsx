'use client'

import TelegramAccountCheckoutForm from '@/components/checkout/TelegramAccountCheckoutForm'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useRouter, usePathname } from 'next/navigation'

export default function TelegramAccountCheckoutModal() {
  const router = useRouter()
  const pathname = usePathname()

  // Only show modal when we're on the checkout route, not on payment or other routes
  const isCheckoutRoute = pathname?.startsWith('/checkout/telegram/account')

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Close button clicked
      router.back()
    }
  }

  // Don't render modal if we're not on the checkout route
  if (!isCheckoutRoute) {
    return null
  }

  return (
    <Dialog open={isCheckoutRoute} modal onOpenChange={handleOpenChange}>
      <DialogContent
        className='sm:max-w-[600px] max-h-[90vh] overflow-y-auto'
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Telegram Account Checkout</DialogTitle>
        </DialogHeader>
        <div className='min-h-96'>
          <TelegramAccountCheckoutForm />
        </div>
      </DialogContent>
    </Dialog>
  )
}
