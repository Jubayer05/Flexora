'use client'

import { Container } from '@/components/common/container'
import { Section } from '@/components/common/section'
import { Typography } from '@/components/common/typography'
import { cn } from '@/lib/utils'
import { HowItWorksSection } from '@/lib/validations/schemas/homepageSettings'
import { motion, type ViewportOptions } from 'framer-motion'
import { icons, type LucideIcon } from 'lucide-react'

/** Replay enter/exit when scrolling past (up or down); `once: true` would only run once. */
const scrollReveal: ViewportOptions = {
  once: false,
  amount: 0.28,
  margin: '0px 0px -12% 0px'
}

export default function HowItWorks({ data }: { data?: HowItWorksSection }) {
  const items = Array.isArray(data?.facilities) ? data!.facilities.slice(0, 6) : []
  if (!items.length) return null
  const total = items.length

  return (
    <Section variant='xl' className='relative overflow-hidden bg-[#080C14] text-slate-200'>
      {/* Grid texture */}
      <div
        className='pointer-events-none absolute inset-0 -z-10'
        style={{
          backgroundImage: `linear-gradient(rgba(99,179,237,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,179,237,0.04) 1px, transparent 1px)`,
          backgroundSize: '48px 48px'
        }}
      />
      {/* Ambient blobs */}
      <div className='pointer-events-none absolute -left-24 -top-24 -z-10 h-[600px] w-[600px] rounded-full bg-sky-400/[0.06] blur-[120px]' />
      <div className='pointer-events-none absolute -bottom-16 -right-16 -z-10 h-[500px] w-[500px] rounded-full bg-violet-500/[0.06] blur-[100px]' />

      <Container>
        <div className='space-y-20'>
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={scrollReveal}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className='mx-auto flex max-w-3xl flex-col items-center space-y-6 text-center'
          >
            <span className='inline-flex items-center gap-2 rounded-full border border-sky-400/25 bg-sky-400/[0.06] px-4 py-2 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-sky-400'>
              <span className='size-1.5 animate-pulse rounded-full bg-sky-400 shadow-[0_0_8px_theme(colors.sky.400)]' />
              {data?.subTitle ?? 'How It Works'}
            </span>

            <div className='space-y-4'>
              <h2 className='text-balance text-4xl font-bold tracking-tight text-slate-50 sm:text-5xl lg:text-[3.25rem]'>
                {data?.title ?? (
                  <>
                    From Zero to{' '}
                    <span className='bg-gradient-to-br from-sky-400 to-indigo-400 bg-clip-text text-transparent'>
                      Fully Connected
                    </span>
                  </>
                )}
              </h2>
              {data?.desc && (
                <p className='mx-auto max-w-xl text-pretty text-base leading-relaxed text-slate-500'>
                  {data.desc}
                </p>
              )}
            </div>

            <div className='h-px w-20 bg-gradient-to-r from-transparent via-sky-400/40 to-transparent' />
          </motion.div>

          {/* Mobile: single-column timeline */}
          <div className='relative mx-auto max-w-lg space-y-5 pl-12 md:hidden'>
            <div className='absolute bottom-0 left-4 top-0 w-px bg-gradient-to-b from-transparent via-sky-400/25 to-transparent' />
            {items.map((feature, index) => {
              const SelectedIcon = feature?.icon ? icons[feature.icon as keyof typeof icons] : null
              const isLast = index === total - 1
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={scrollReveal}
                  transition={{ duration: 0.5, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
                  className='relative'
                >
                  {/* Rail node */}
                  <div
                    className={cn(
                      'absolute -left-[2.75rem] top-7 flex size-8 items-center justify-center rounded-full border bg-[#0D1322]',
                      isLast ? 'border-violet-400/35' : 'border-sky-400/25'
                    )}
                  >
                    <span
                      className={cn(
                        'size-2 rounded-full shadow-[0_0_10px]',
                        isLast
                          ? 'bg-indigo-400 shadow-indigo-400/60'
                          : 'bg-sky-400 shadow-sky-400/60'
                      )}
                    />
                  </div>
                  <StepCard
                    feature={feature}
                    index={index}
                    total={total}
                    SelectedIcon={SelectedIcon}
                  />
                </motion.div>
              )
            })}
          </div>

          {/* Desktop: alternating timeline */}
          <div className='relative mx-auto hidden max-w-5xl md:block'>
            {/* Spine */}
            <div className='pointer-events-none absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-sky-400/20 to-transparent' />

            <ul className='relative space-y-3'>
              {items.map((feature, index) => {
                const isLeft = index % 2 === 0
                const isLast = index === total - 1
                const SelectedIcon = feature?.icon
                  ? icons[feature.icon as keyof typeof icons]
                  : null

                return (
                  <motion.li
                    key={index}
                    initial={{
                      opacity: 0,
                      y: 18,
                      x: isLeft ? -32 : 32
                    }}
                    whileInView={{ opacity: 1, y: 0, x: 0 }}
                    viewport={scrollReveal}
                    transition={{ duration: 0.55, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
                    className='grid min-h-[160px] grid-cols-[1fr_5rem_1fr] items-center'
                  >
                    {/* Left column */}
                    <div className={cn('flex', isLeft ? 'justify-end pr-8' : 'justify-end')}>
                      {isLeft && (
                        <StepCard
                          feature={feature}
                          index={index}
                          total={total}
                          SelectedIcon={SelectedIcon}
                          align='end'
                        />
                      )}
                    </div>

                    {/* Spine node */}
                    <div className='flex justify-center'>
                      <div
                        className={cn(
                          'relative z-10 flex size-12 items-center justify-center rounded-full border bg-[#0D1322] shadow-lg',
                          isLast
                            ? 'border-violet-400/35 shadow-violet-400/10'
                            : 'border-sky-400/30 shadow-sky-400/10'
                        )}
                      >
                        <span
                          className={cn(
                            'absolute inset-0 rounded-full border opacity-40',
                            isLast ? 'border-violet-400/20' : 'border-sky-400/15'
                          )}
                          style={{ inset: '-4px' }}
                        />
                        <span
                          className={cn(
                            'size-2.5 rounded-full shadow-[0_0_16px]',
                            isLast
                              ? 'bg-indigo-400 shadow-indigo-400/60'
                              : 'bg-sky-400 shadow-sky-400/50'
                          )}
                        />
                      </div>
                    </div>

                    {/* Right column */}
                    <div className={cn('flex', isLeft ? 'justify-start' : 'justify-start pl-8')}>
                      {!isLeft && (
                        <StepCard
                          feature={feature}
                          index={index}
                          total={total}
                          SelectedIcon={SelectedIcon}
                          align='start'
                        />
                      )}
                    </div>
                  </motion.li>
                )
              })}
            </ul>
          </div>
        </div>
      </Container>
    </Section>
  )
}

function StepCard({
  feature,
  index,
  total,
  SelectedIcon,
  align
}: {
  feature: HowItWorksSection['facilities'][number]
  index: number
  total: number
  SelectedIcon: LucideIcon | null
  align?: 'start' | 'end'
}) {
  const step = String(index + 1).padStart(2, '0')
  const isLast = index === total - 1
  const accentColor = isLast ? 'text-indigo-400' : 'text-sky-400'
  const iconBg = isLast ? 'bg-violet-400/8 border-violet-400/20' : 'bg-sky-400/8 border-sky-400/15'
  const iconColor = isLast ? 'text-indigo-400' : 'text-sky-400'
  const topShine = isLast ? 'via-violet-400/30' : 'via-sky-400/35'
  const bottomShine = isLast ? 'via-violet-400/15' : 'via-sky-400/12'
  const hoverBorder = isLast ? 'hover:border-violet-400/20' : 'hover:border-sky-400/20'

  return (
    <div
      className={cn(
        'group relative w-full max-w-[440px] overflow-hidden rounded-2xl border border-white/[0.05] bg-gradient-to-br from-[#0D1322]/95 to-[#0A0F1C]/98 p-7 shadow-sm transition-all duration-300 hover:-translate-y-0.5',
        hoverBorder,
        align === 'end' && 'md:text-right'
      )}
    >
      {/* Top shine line */}
      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent opacity-80',
          topShine
        )}
      />
      {/* Ambient glow */}
      <div
        className={cn(
          'pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-2xl',
          isLast ? 'bg-violet-500/7' : 'bg-sky-400/7'
        )}
      />

      {/* Card header */}
      <div className={cn('mb-5 flex items-start gap-4', align === 'end' && 'md:flex-row-reverse')}>
        <div className={cn('relative flex-shrink-0 rounded-[14px] border p-3.5', iconBg)}>
          {SelectedIcon ? (
            <SelectedIcon className={cn('size-6', iconColor)} strokeWidth={1.75} />
          ) : (
            <div className='size-6' />
          )}
        </div>

        <div className={cn('flex flex-col gap-1 pt-0.5', align === 'end' && 'md:items-end')}>
          <span
            className={cn(
              'font-mono text-[11px] font-medium tracking-[0.14em] opacity-80',
              accentColor
            )}
          >
            Step {step} / {String(total).padStart(2, '0')}
          </span>
          <Typography variant='h4' as='h3' weight='semibold' className='text-[17px] text-slate-100'>
            {feature.title}
          </Typography>
        </div>
      </div>

      {/* Description */}
      <Typography
        variant='body2'
        className={cn(
          'text-pretty text-sm leading-relaxed text-slate-500',
          align === 'end' && 'md:text-right'
        )}
      >
        {feature.desc}
      </Typography>

      {/* Bottom accent */}
      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent to-transparent',
          bottomShine
        )}
      />
    </div>
  )
}
