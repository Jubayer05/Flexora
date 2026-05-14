'use client'
import { Button } from '@/components/ui/button'
import { useIsMobile } from '@/hooks/use-mobile'
import { usePathname, useRouter } from 'next/navigation'

export default function FeedbackLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const isMobile = useIsMobile()

  return (
      <div className='space-y-2 lg:space-y-5 mx-auto pt-6 w-full max-w-5xl overflow-x-hidden'>
    <div className='flex flex-wrap gap-3 justify-center md:justify-start'>

        <Button
          size={isMobile ? 'sm' : 'lg'}
          variant={pathname.includes('feedbacks-management') ? 'secondary' : 'outline'}
          onClick={() => router.push('/admin/feedbacks/feedbacks-management')}
        >
          Review Management
        </Button>
        <Button
          size={isMobile ? 'sm' : 'lg'}
          variant={pathname.includes('bulk-reviews') ? 'secondary' : 'outline'}
          onClick={() => router.push('/admin/feedbacks/bulk-reviews')}
        >
          Bulk Review Handling
        </Button>
        <Button
          size={isMobile ? 'sm' : 'lg'}
          variant={pathname.includes('unique-names') ? 'secondary' : 'outline'}
          onClick={() => router.push('/admin/feedbacks/unique-names')}
        >
          Unique Name Handling
        </Button>
      </div>
      <div className='p-0 lg:p-6 lg:border rounded-xl'>{children}</div>
    </div>
  )
}
