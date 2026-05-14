'use client'

import { useRef, useEffect } from 'react'
import { motion, useInView, useMotionValue, useSpring } from 'framer-motion'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { Container } from '@/components/common/container'
import CustomImage from '@/components/common/CustomImage'
import { Section } from '@/components/common/section'
import { Typography } from '@/components/common/typography'
import { AboutSection } from '@/lib/validations/schemas/homepageSettings'
import { CheckCircle2, TrendingUp } from 'lucide-react'

gsap.registerPlugin()

const highlights = [
  'Premium quality accounts',
  'Instant secure delivery',
  '24/7 customer support'
]

export default function AboutUs({ data }: { data?: AboutSection }) {
  const sectionRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      gsap.to('.about-orb', {
        scale: 1.15,
        opacity: 0.6,
        duration: 5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        stagger: { each: 1.5 }
      })
      gsap.to('.about-float', {
        y: -12,
        duration: 3,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      })
      gsap.fromTo(
        '.about-line',
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: 1.2,
          ease: 'power2.out',
          scrollTrigger: { trigger: '.about-line', start: 'top 80%' }
        }
      )
    },
    { scope: sectionRef }
  )

  if (!data) return null

  return (
    <Section variant='xl' className='relative overflow-hidden text-card-foreground'>
      {/* Ambient background */}
      <div ref={sectionRef} className='absolute inset-0 -z-10 overflow-hidden pointer-events-none'>
        <div className='about-orb absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full bg-primary/8 blur-[120px]' />
        <div className='about-orb absolute -bottom-32 -left-32 h-[400px] w-[400px] rounded-full bg-violet-500/6 blur-[100px]' />
      </div>

      <Container>
        <div className='flex flex-col gap-10 lg:gap-0'>
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className='flex justify-center'
          >
            <span className='inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-5 py-2 text-sm font-semibold uppercase tracking-wider text-primary'>
              <TrendingUp className='size-3.5' />
              {data?.subTitle}
            </span>
          </motion.div>

          <div className='flex flex-col items-center gap-10 lg:flex-row lg:gap-16 mt-8 lg:mt-0'>
            {/* Left — text */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.75, ease: 'easeOut' }}
              className='w-full space-y-6 lg:w-1/2'
            >
              <h2 className='text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl bg-linear-to-br from-foreground via-foreground/90 to-foreground/60 bg-clip-text text-transparent'>
                {data?.title}
              </h2>

              {/* Animated separator */}
              <div className='about-line h-[2px] w-16 origin-left bg-linear-to-r from-primary to-primary/20' />

              <Typography variant='body1' className='leading-relaxed text-muted-foreground'>
                {data?.desc}
              </Typography>

              {/* Highlight bullets */}
              <ul className='space-y-3'>
                {highlights.map((item, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.1 + i * 0.1 }}
                    className='flex items-center gap-3 text-sm text-muted-foreground'
                  >
                    <CheckCircle2 className='size-4 shrink-0 text-primary' />
                    {item}
                  </motion.li>
                ))}
              </ul>

              {/* Stats */}
              <div className='flex flex-wrap gap-8 pt-4 border-t border-border/40'>
                {data?.stats?.map((stat, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                    className='min-w-[8rem]'
                  >
                    {stat.count && (
                      <div className='text-3xl font-bold text-primary lg:text-4xl'>
                        <AnimatedCounter value={stat.count} />
                      </div>
                    )}
                    <Typography variant='body2' className='mt-1 text-muted-foreground'>
                      {stat.title}
                    </Typography>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Right — image */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.75, ease: 'easeOut', delay: 0.15 }}
              className='about-float relative w-full lg:w-1/2'
            >
              {/* Glow behind image */}
              <div className='absolute inset-4 rounded-2xl bg-primary/10 blur-2xl' />

              <div className='relative overflow-hidden rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm shadow-xl shadow-primary/5'>
                {/* Top accent */}
                <div className='absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-primary/50 to-transparent' />

                <CustomImage
                  src={data?.image}
                  height={480}
                  width={560}
                  alt='About UHQ Accounts'
                  className='w-full object-cover'
                  loading='lazy'
                />

                {/* Floating badge */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                  className='absolute bottom-4 left-4 flex items-center gap-2 rounded-xl border border-border/60 bg-card/90 px-4 py-2.5 backdrop-blur-md shadow-lg'
                >
                  <span className='h-2 w-2 animate-pulse rounded-full bg-green-400' />
                  <span className='text-xs font-semibold text-card-foreground'>Trusted Worldwide</span>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </Container>
    </Section>
  )
}

// Lazy animated counter for stats
const AnimatedCounter = ({ value }: { value: string }) => {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const motionValue = useMotionValue(0)
  const springValue = useSpring(motionValue, { damping: 55, stiffness: 90 })

  const match = value.match(/^([$€£]?)(\d+(?:\.\d+)?)(.*?)$/)

  useEffect(() => {
    if (isInView && match) {
      motionValue.set(parseFloat(match[2]))
    }
  }, [isInView, motionValue, match])

  useEffect(() => {
    if (!match) return
    const [, prefix, , suffix] = match
    return springValue.on('change', (latest) => {
      if (ref.current) {
        ref.current.textContent = `${prefix}${Math.floor(latest)}${suffix}`
      }
    })
  }, [springValue, match])

  if (!match) return <span>{value}</span>
  return <span ref={ref}>{value}</span>
}
