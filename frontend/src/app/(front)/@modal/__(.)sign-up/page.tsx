'use client'

import SignUpCard from '@/components/auth/RegisterCard'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function RegisterModal() {
  const router = useRouter()
  // const searchParams = useSearchParams()
  const [open, setOpen] = useState(true)

  // Check if direct parameter is present
  // const isDirect = searchParams.get('direct') === 'true'

  // useEffect(() => {
  //   if (isDirect) {
  //     // Replace with direct page if ?direct=true
  //     router.replace('/sign-up')
  //     return
  //   }
  // }, [isDirect, router])

  // // Don't render modal if redirecting to direct page
  // if (isDirect) {
  //   return null
  // }

  const handleOpenChange = (open?: boolean) => {
    setOpen(false)
    if (!open) {
      router.back()
    }
  }
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='p-0 w-full max-w-lg max-h-[90vh] overflow-y-auto'>
        <SignUpCard compact={true} onSuccess={handleOpenChange} className='shadow-none border-0' />
      </DialogContent>
    </Dialog>
  )
}
