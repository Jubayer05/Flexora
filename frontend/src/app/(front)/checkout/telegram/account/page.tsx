import { Section } from '@/components/common/section'
import { Container } from '@/components/common/container'
import TelegramAccountCheckoutForm from '@/components/checkout/TelegramAccountCheckoutForm'

export default function TelegramAccountCheckout() {
  return (
    <Section>
      <Container className='max-w-3xl'>
        <TelegramAccountCheckoutForm />
      </Container>
    </Section>
  )
}
