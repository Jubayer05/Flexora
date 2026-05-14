import LoginCard from '@/components/auth/LoginCard'
import { Container } from '@/components/common/container'

export default function LoginPage() {
  return (
    <Container className='py-10 sm:py-16'>
      <div className='flex flex-col justify-center items-center min-h-[calc(100vh-8rem)]'>
        <div className='w-full max-w-md mx-auto'>
          <LoginCard />
        </div>
      </div>
    </Container>
  )
}
