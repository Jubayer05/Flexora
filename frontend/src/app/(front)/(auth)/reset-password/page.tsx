import PasswordResetForm from '@/components/auth/PasswordReset'
import { Container } from '@/components/common/container'
import CustomLink from '@/components/common/CustomLink'
import { Section } from '@/components/common/section'

export const metadata = {
  title: 'Reset Password'
}

export default function ResetPasswordPage() {
  return (
    <Section variant={'xl'}>
      <Container>
        <div className='flex justify-center items-center lg:min-h-[80vh]'>
          <div className='space-y-6 shadow-lg rounded-lg w-full max-w-md'>
            <PasswordResetForm />

            <div className='block mt-4 text-center'>
              <span className='text-muted'>Remember password? Return to </span>
              <CustomLink prefetch={false} href='/login'>
                Login
              </CustomLink>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  )
}
