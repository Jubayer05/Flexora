'use client'

import PageNotFound from '@/components/common/404'
import { Container } from '@/components/common/container'
import { Section } from '@/components/common/section'

export default function NotFound() {
  return (
    <Section>
      <Container>
        <div className='flex flex-col justify-center items-center px-6 min-h-[80vh] text-center'>
          <PageNotFound />
        </div>
      </Container>
    </Section>
  )
}
