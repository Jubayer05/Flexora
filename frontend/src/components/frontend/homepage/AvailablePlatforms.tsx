'use client'

import { useRef } from 'react'
import { motion } from 'framer-motion'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { Container } from '@/components/common/container'
import CustomImage from '@/components/common/CustomImage'
import { Section } from '@/components/common/section'
import { Typography } from '@/components/common/typography'
import { homeData } from '@/data/homeData'
import { PlatformSection } from '@/lib/validations/schemas/homepageSettings'
import { Globe } from 'lucide-react'

gsap.registerPlugin()

export default function AvailablePlatforms({ data }: { data?: PlatformSection }) {
  const sectionRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      gsap.to('.plat-orb', {
        scale: 1.2,
        opacity: 0.55,
        duration: 6,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        stagger: { each: 1.5 }
      })

      // Staggered float animation on platform icons
      gsap.to('.plat-icon-wrap', {
        y: -8,
        duration: 2.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        stagger: { each: 0.15, from: 'start' }
      })
    },
    { scope: sectionRef }
  )

  const platforms = homeData?.platform?.platforms || []

  return (
    <Section variant='xl' className='relative overflow-hidden bg-card text-card-foreground'>
      <div ref={sectionRef} className='pointer-events-none absolute inset-0 -z-10'>
        <div className='plat-orb absolute -top-24 left-1/3 h-80 w-80 rounded-full bg-primary/7 blur-[100px]' />
        <div className='plat-orb absolute -bottom-24 right-1/3 h-64 w-64 rounded-full bg-violet-500/6 blur-[80px]' />
        {/* Radial dot grid */}
        <div
          className='absolute inset-0 opacity-[0.02]'
          style={{
            backgroundImage: `radial-gradient(rgba(99,102,241,1) 1px, transparent 1px)`,
            backgroundSize: '32px 32px'
          }}
        />
      </div>

      <Container>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className='mx-auto flex max-w-4xl flex-col items-center space-y-4 text-center mb-14'
        >
          <span className='inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-5 py-2 text-sm font-semibold uppercase tracking-wider text-primary'>
            <Globe className='size-3.5' />
            {data?.subTitle}
          </span>

          <Typography
            variant='h2'
            as='h2'
            weight='bold'
            className='bg-linear-to-br from-foreground via-foreground/90 to-foreground/60 bg-clip-text text-transparent'
          >
            {data?.title}
          </Typography>

          <Typography variant='h5' className='mx-auto max-w-3xl text-muted-foreground'>
            {data?.desc}
          </Typography>
        </motion.div>
      </Container>

      {/* Platform icons */}
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className='flex flex-wrap justify-center gap-4 sm:gap-5 lg:gap-6'
        >
          {platforms.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.7 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              whileHover={{ scale: 1.1, transition: { duration: 0.2 } }}
              className='plat-icon-wrap group relative flex flex-col items-center gap-2'
            >
              <div className='relative flex size-20 sm:size-24 lg:size-28 items-center justify-center rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm shadow-sm transition-all duration-300 hover:border-primary/40 hover:bg-card hover:shadow-lg hover:shadow-primary/10'>
                {/* Hover glow */}
                <div className='absolute inset-0 rounded-2xl bg-primary/0 transition-all duration-300 group-hover:bg-primary/5' />
                <CustomImage
                  src={item?.icon}
                  alt={item?.name ? `${item.name} platform` : 'Platform'}
                  height={48}
                  width={48}
                  className='relative size-10 sm:size-12 lg:size-14 object-contain'
                />
              </div>
              {item?.name && (
                <span className='text-xs font-medium text-muted-foreground opacity-0 transition-opacity duration-300 group-hover:opacity-100'>
                  {item.name}
                </span>
              )}
            </motion.div>
          ))}
        </motion.div>
      </Container>
    </Section>
  )
}
