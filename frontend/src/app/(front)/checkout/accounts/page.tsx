import AccountCheckoutForm from '@/components/checkout/AccountCheckoutForm'
import { Container } from '@/components/common/container'
import { Section } from '@/components/common/section'

export default function AccountCheckout() {
  return (
    <Section>
      <Container className='max-w-3xl font-manrope'>
        <AccountCheckoutForm />
      </Container>
    </Section>
  )
}
