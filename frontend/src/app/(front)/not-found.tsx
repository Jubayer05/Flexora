'use client'

import PageNotFound from '@/components/common/404'
import { Container } from '@/components/common/container'
import { Section } from '@/components/common/section'

export default function NotFound() {
  return (
    <Section variant={'lg'}>
      <Container>
        <div className='flex flex-col justify-center items-center px-6 min-h-[60vh] text-center'>
          <PageNotFound variant='minimal' />
        </div>
      </Container>
    </Section>
  )
}
