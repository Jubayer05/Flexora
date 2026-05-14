'use client'

import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { Container } from '@/components/common/container'
import CustomImage from '@/components/common/CustomImage'
import CustomInput from '@/components/common/CustomInput'
import { Section } from '@/components/common/section'
import { Typography } from '@/components/common/typography'
import { Button } from '@/components/ui/button'
import { SubscribeSection } from '@/lib/validations/schemas/homepageSettings'
import requests from '@/services/network/http'
import { toast } from 'sonner'
import { Mail, Send, Sparkles } from 'lucide-react'

gsap.registerPlugin()

export default function Newsletter({ data }: { data?: SubscribeSection }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const sectionRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      gsap.to('.nl-orb', {
        scale: 1.2,
        opacity: 0.6,
        duration: 5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        stagger: { each: 1.5 }
      })
      gsap.to('.nl-float', {
        y: -10,
        duration: 3,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      })
    },
    { scope: sectionRef }
  )

  const handleSubscribe = async () => {
    if (!email.trim()) {
      toast.error('Please enter your email address')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email address')
      return
    }

    setLoading(true)
    try {
      const response = await requests.post<{ success: boolean; message: string }>(
        '/newsletter/subscribe',
        { email }
      )
      if (response.success) {
        toast.success(response.message || 'Successfully subscribed!')
        setEmail('')
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to subscribe. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Section variant='xl' className='relative overflow-hidden text-card-foreground'>
      <div ref={sectionRef} className='pointer-events-none absolute inset-0 -z-10'>
        <div className='nl-orb absolute -top-20 -left-20 h-80 w-80 rounded-full bg-primary/10 blur-[100px]' />
        <div className='nl-orb absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-violet-500/8 blur-[120px]' />
        <div
          className='absolute inset-0 opacity-[0.018]'
          style={{
            backgroundImage: `radial-gradient(rgba(99,102,241,0.8) 1px, transparent 1px)`,
            backgroundSize: '36px 36px'
          }}
        />
      </div>

      <Container>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.75, ease: 'easeOut' }}
          className='relative overflow-hidden rounded-3xl border border-primary/20 bg-linear-to-br from-primary/10 via-card to-primary/5 p-8 sm:p-10 lg:p-14'
        >
          {/* Accent lines */}
          <div className='absolute top-0 left-1/2 h-px w-3/4 -translate-x-1/2 bg-linear-to-r from-transparent via-primary/50 to-transparent' />
          <div className='absolute bottom-0 left-1/2 h-px w-1/2 -translate-x-1/2 bg-linear-to-r from-transparent via-primary/20 to-transparent' />

          {/* Corner glows */}
          <div className='absolute -top-12 -right-12 h-40 w-40 rounded-full bg-primary/15 blur-2xl' />
          <div className='absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-violet-500/10 blur-2xl' />

          <div className='relative z-10 flex flex-col items-center gap-10 lg:flex-row lg:gap-16'>
            {/* Text content */}
            <div className='flex flex-1 flex-col gap-6 text-center lg:text-left'>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className='mx-auto flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary lg:mx-0'
              >
                <Sparkles className='size-3' />
                Stay Updated
              </motion.div>

              <div className='space-y-2'>
                <Typography
                  variant='h2'
                  as='h2'
                  weight='bold'
                  className='bg-linear-to-br from-foreground via-foreground/90 to-foreground/60 bg-clip-text text-transparent leading-tight'
                >
                  {data?.title}
                </Typography>
                <Typography variant='h5' weight='medium' className='text-muted-foreground'>
                  {data?.subTitle}
                </Typography>
              </div>

              {/* Input row */}
              <div className='flex w-full max-w-md flex-col gap-3 sm:flex-row lg:max-w-none'>
                <div className='relative flex-1'>
                  <Mail className='absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
                  <CustomInput
                    className='w-full pl-10'
                    size='large'
                    placeholder='Enter your email address'
                    type='email'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubscribe()}
                    disabled={loading}
                  />
                </div>
                <Button
                  size='lg'
                  className='gap-2 font-semibold shrink-0'
                  onClick={handleSubscribe}
                  disabled={loading}
                >
                  <Send className='size-4' />
                  {loading ? 'Subscribing…' : 'Subscribe'}
                </Button>
              </div>

              <p className='text-xs text-muted-foreground'>
                No spam, ever. Unsubscribe at any time.
              </p>
            </div>

            {/* Envelope illustration */}
            <div className='nl-float shrink-0 max-sm:hidden'>
              <div className='relative'>
                <div className='absolute inset-0 rounded-full bg-primary/10 blur-2xl' />
                <CustomImage
                  src='/images/envelope.svg'
                  alt='Newsletter illustration'
                  width={200}
                  height={175}
                  className='relative'
                />
              </div>
            </div>
          </div>
        </motion.div>
      </Container>
    </Section>
  )
}
