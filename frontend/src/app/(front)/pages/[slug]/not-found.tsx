import { Container } from '@/components/common/container'
import { Section } from '@/components/common/section'
import { Typography } from '@/components/common/typography'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function PageNotFound() {
  return (
    <Section variant='xl' className='flex items-center min-h-screen'>
      <Container>
        <div className='space-y-6 text-center'>
          <div className='space-y-4'>
            <Typography
              variant='h1'
              as='h1'
              weight='bold'
              className='text-primary text-6xl md:text-8xl'
            >
              404
            </Typography>
            <Typography variant='h2' as='h2' weight='semibold' className='text-2xl md:text-3xl'>
              Page Not Found
            </Typography>
            <Typography variant='body1' className='mx-auto max-w-lg text-muted-foreground'>
              The page you&apos;re looking for doesn&apos;t exist or has been moved.
            </Typography>
          </div>

          <div className='flex sm:flex-row flex-col justify-center gap-4'>
            {/* <Link href='/pages'>
              <Button variant='default' size='lg' className='text-background text-base'>
                Browse All Pages
              </Button>
            </Link> */}
            <Link href='/'>
              <Button variant='outline' size='lg' className='text-base'>
                Go Home
              </Button>
            </Link>
          </div>
        </div>
      </Container>
    </Section>
  )
}
