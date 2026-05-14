'use client'

import LoginCard from '@/components/auth/LoginCard'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function LoginModal() {
  const router = useRouter()
  const [open, setOpen] = useState(true)

  // Debug: Log the callback URL
  // const callbackUrl = searchParams.get('callbackUrl')

  const handleOpenChange = (open?: boolean) => {
    setOpen(false)
    if (!open) {
      // User dismissed login modal without logging in
      router.back()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='p-0 w-full max-w-md overflow-hidden'>
        <LoginCard compact={true} onSuccess={handleOpenChange} className='shadow-none border-0' />
      </DialogContent>
    </Dialog>
  )
}
