'use client'

import { Container } from '@/components/common/container'
import { Section } from '@/components/common/section'
import { Typography } from '@/components/common/typography'
import { WhyChooseSection } from '@/lib/validations/schemas/homepageSettings'
import { icons } from 'lucide-react'
import * as React from 'react'
import { motion } from 'motion/react'

// Geometric shape components
function FloatingShape({ className, delay = 0, children }: { className?: string; delay?: number; children: React.ReactNode }) {
  return (
    <motion.div
      className={`absolute pointer-events-none ${className}`}
      animate={{
        y: [0, -20, 0],
        rotate: [0, 180, 360],
        opacity: [0.3, 0.6, 0.3]
      }}
      transition={{
        duration: 20,
        repeat: Infinity,
        delay,
        ease: 'easeInOut'
      }}
    >
      {children}
    </motion.div>
  )
}

function Hexagon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox='0 0 100 100' fill='none'>
      <polygon
        points='50,5 93,27.5 93,72.5 50,95 7,72.5 7,27.5'
        stroke='currentColor'
        strokeWidth='1'
        fill='none'
      />
    </svg>
  )
}

function CircleFrame({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox='0 0 100 100' fill='none'>
      <circle cx='50' cy='50' r='45' stroke='currentColor' strokeWidth='0.5' strokeDasharray='8 4' fill='none' />
      <circle cx='50' cy='50' r='35' stroke='currentColor' strokeWidth='0.3' fill='none' />
    </svg>
  )
}

export default function WhyChoose({ data }: { data?: WhyChooseSection }) {
  return (
    <Section variant='xl' className='relative overflow-hidden bg-gradient-to-b from-card via-background to-card text-card-foreground'>
      {/* Background decorative elements */}
      <div className='absolute inset-0 -z-10 overflow-hidden'>
        {/* Gradient glow orbs */}
        <motion.div
          className='absolute top-20 -left-20 w-[500px] h-[500px] bg-primary/8 rounded-full blur-[100px]'
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className='absolute bottom-20 -right-20 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]'
          animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.6, 0.4] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />
        <motion.div
          className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/3 rounded-full blur-[150px]'
          animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
        />

        {/* Geometric floating shapes */}
        <FloatingShape className='top-24 left-16 text-primary/10' delay={0}>
          <Hexagon className='w-32 h-32' />
        </FloatingShape>
        <FloatingShape className='top-40 right-20 text-primary/8' delay={3}>
          <CircleFrame className='w-24 h-24' />
        </FloatingShape>
        <FloatingShape className='bottom-32 left-32 text-primary/6' delay={6}>
          <Hexagon className='w-20 h-20' />
        </FloatingShape>
        <FloatingShape className='bottom-20 right-40 text-primary/8' delay={9}>
          <svg className='w-16 h-16' viewBox='0 0 100 100' fill='none'>
            <rect x='10' y='10' width='80' height='80' stroke='currentColor' strokeWidth='0.5' rx='4' transform='rotate(45 50 50)' />
          </svg>
        </FloatingShape>

        {/* Animated grid pattern */}
        <div
          className='absolute inset-0 opacity-[0.015]'
          style={{
            backgroundImage: `linear-gradient(rgba(99, 102, 241, 0.5) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(99, 102, 241, 0.5) 1px, transparent 1px)`,
            backgroundSize: '80px 80px'
          }}
        />
      </div>

      <Container>
        <div className='space-y-16'>
          {/* Header section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className='flex flex-col justify-center space-y-4 mx-auto max-w-4xl text-center'
          >
            {/* Decorative frame around badge */}
            <div className='relative inline-block mx-auto'>
              <motion.div
                className='absolute -inset-4 border border-primary/20 rounded-full'
                animate={{ rotate: 360 }}
                transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
              />
              <motion.div
                className='absolute -inset-2 border border-primary/10 rounded-full'
                animate={{ rotate: -360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              />
              <span className='relative inline-flex items-center gap-2 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border border-primary/20 text-primary px-6 py-2.5 rounded-full font-semibold text-sm lg:text-base'>
                <motion.span
                  className='w-2 h-2 bg-primary rounded-full'
                  animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                {data?.subTitle}
              </span>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Typography variant='h1' as='h2' weight='bold' className='bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent'>
                {data?.title}
              </Typography>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Typography variant='body1' className='text-muted-foreground max-w-2xl mx-auto leading-relaxed'>
                {data?.desc}
              </Typography>
            </motion.div>
          </motion.div>

          {/* Features list */}
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-8'>
            {data?.facilities?.map((feature, index) => {
              const SelectedIcon = feature?.icon ? icons[feature?.icon as keyof typeof icons] : null

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1, ease: 'easeOut' }}
                  whileHover={{ y: -8, transition: { duration: 0.3, ease: 'easeOut' } }}
                  className='group relative'
                >
                  {/* Card container with refined hover effects */}
                  <div className='relative flex flex-col justify-start items-start gap-5 bg-card/90 backdrop-blur-md p-7 lg:p-8 border border-border/50 hover:border-primary/30 rounded-2xl transition-all duration-500 shadow-sm hover:shadow-[0_8px_30px_-12px_rgba(99,102,241,0.15)]'>
                    {/* Icon container */}
                    <div className='relative'>
                      <div className='absolute inset-0 bg-primary/10 group-hover:bg-primary/20 rounded-2xl blur-md transition-all duration-500' />
                      <div className='relative inline-flex bg-gradient-to-br from-primary/15 to-primary/5 group-hover:from-primary/70 group-hover:to-primary/40 items-center justify-center p-4 lg:p-5 rounded-2xl text-primary group-hover:text-primary-foreground transition-all duration-500 shadow-lg shadow-primary/10 group-hover:shadow-primary/25'>
                        {SelectedIcon && <SelectedIcon className='size-7 lg:size-8' size={36} />}
                      </div>
                    </div>

                    <div className='space-y-3'>
                      <Typography variant='h4' weight='semibold' className='group-hover:text-primary transition-colors duration-300'>
                        {feature.title}
                      </Typography>
                      <Typography variant='body2' className='text-muted-foreground leading-relaxed'>
                        {feature.desc}
                      </Typography>
                    </div>

                    {/* Subtle top border accent on hover */}
                    <div className='absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500' />

                    {/* Bottom border accent on hover */}
                    <div className='absolute bottom-0 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500' />
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </Container>
    </Section>
  )
}
