import { Section } from '@/components/common/section'
import { Container } from '@/components/common/container'
import TelegramTransferCheckoutForm from '@/components/checkout/TelegramTransferCheckoutForm';

export default function TelegramTransferCheckout() {
  return (
    <Section>
      <Container className='max-w-3xl'>
        <TelegramTransferCheckoutForm />
      </Container>
    </Section>
  );
}
