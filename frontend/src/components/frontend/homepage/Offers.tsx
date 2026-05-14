'use client'

import { useRef } from 'react'
import { motion } from 'framer-motion'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { Container } from '@/components/common/container'
import { Section } from '@/components/common/section'
import { OffersSection } from '@/lib/validations/schemas/homepageSettings'
import { Sparkles, ArrowRight } from 'lucide-react'
import CustomImage from '@/components/common/CustomImage'

gsap.registerPlugin()

export default function Offers({ data }: { data?: OffersSection }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      gsap.to('.offers-orb-1', {
        scale: 1.3,
        opacity: 0.7,
        duration: 4,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      })
      gsap.to('.offers-orb-2', {
        scale: 1.2,
        opacity: 0.5,
        duration: 5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: 1.5
      })
      gsap.to('.offers-star', {
        rotate: 360,
        duration: 20,
        repeat: -1,
        ease: 'none'
      })
      gsap.to('.offers-particle', {
        y: -30,
        opacity: 0,
        duration: 2.5,
        repeat: -1,
        ease: 'power1.out',
        stagger: { each: 0.6, from: 'random' }
      })
    },
    { scope: containerRef }
  )

  if (!data) return null

  const particles = Array.from({ length: 8 })

  return (
    <Section variant='xl'>
      <Container>
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className='relative overflow-hidden rounded-3xl border border-primary/25 bg-linear-to-br from-primary/15 via-card to-primary/5 p-10 lg:p-16 text-center'
        >
          {/* Background orbs */}
          <div className='offers-orb-1 pointer-events-none absolute -top-20 -left-20 h-80 w-80 rounded-full bg-primary/15 blur-[80px]' />
          <div className='offers-orb-2 pointer-events-none absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-violet-500/10 blur-[100px]' />

          {/* Grid overlay */}
          <div
            className='absolute inset-0 opacity-[0.025]'
            style={{
              backgroundImage: `linear-gradient(rgba(99,102,241,1) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,1) 1px, transparent 1px)`,
              backgroundSize: '48px 48px'
            }}
          />

          {/* Floating particles */}
          {particles.map((_, i) => (
            <div
              key={i}
              className='offers-particle pointer-events-none absolute h-1 w-1 rounded-full bg-primary/60'
              style={{
                left: `${10 + i * 11}%`,
                bottom: `${15 + (i % 4) * 12}%`,
                opacity: 0.4 + (i % 3) * 0.15
              }}
            />
          ))}

          {/* Top accent line */}
          <div className='absolute top-0 left-1/2 h-px w-3/4 -translate-x-1/2 bg-linear-to-r from-transparent via-primary/50 to-transparent' />

          {/* Spinning star decoration */}
          <div className='offers-star pointer-events-none absolute top-6 right-8 text-primary/30'>
            <svg width='28' height='28' viewBox='0 0 24 24' fill='currentColor'>
              <path d='M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z' />
            </svg>
          </div>

          {/* Content */}
          <div className='relative z-10 flex flex-col items-center gap-5'>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className='inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-5 py-2 text-sm font-semibold uppercase tracking-wider text-primary'
            >
              <Sparkles className='size-3.5' />
              Limited Time Offer
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.65, delay: 0.25 }}
              className='max-w-3xl bg-linear-to-br from-foreground via-foreground/90 to-foreground/60 bg-clip-text text-3xl font-bold leading-tight text-transparent sm:text-4xl lg:text-5xl xl:text-6xl'
            >
              {data?.title}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className='max-w-2xl text-base leading-relaxed text-muted-foreground lg:text-lg'
            >
              {data?.desc}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className='flex items-center gap-2 text-sm font-semibold text-primary'
            >
              <span>Explore Now</span>
              <ArrowRight className='size-4' />
            </motion.div>
          </div>

          {/* Stars image decoration */}
          <div className='offers-star pointer-events-none absolute bottom-4 right-4 opacity-30 sm:bottom-6 sm:right-6'>
            <CustomImage
              src='/images/stars.png'
              width={80}
              height={80}
              alt=''
              className='size-10 object-contain sm:size-14 lg:size-20'
            />
          </div>
        </motion.div>
      </Container>
    </Section>
  )
}
