import VerifyEmail from '@/components/auth/VerifyEmail'
import { Container } from '@/components/common/container'
import { Section } from '@/components/common/section'

export const metadata = {
  title: 'Verify Email'
}

export default function VerifyEmailPage() {
  return (
    <Section variant='xl'>
      <Container>
        <div className='flex justify-center items-center lg:min-h-[80vh]'>
          <VerifyEmail />
        </div>
      </Container>
    </Section>
  )
}
