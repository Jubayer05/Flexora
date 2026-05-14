'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { Container } from '@/components/common/container'
import { Section } from '@/components/common/section'
import { Typography } from '@/components/common/typography'
import { HomepageFaqType } from '@/lib/validations/schemas/faqSettings'
import { HelpCircle, Plus, Minus } from 'lucide-react'

export default function FaqSection({ data }: { data: any }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  if (data?.error || !data?.data?.value) return null

  const faqData: HomepageFaqType = data?.data?.value
  if (!faqData?.faqs?.length) return null

  return (
    <Section variant='xl' className='relative overflow-hidden text-card-foreground'>
      {/* Ambient */}
      <div className='pointer-events-none absolute inset-0 -z-10'>
        <div className='absolute -top-24 left-1/3 h-72 w-72 rounded-full bg-primary/6 blur-[90px]' />
        <div className='absolute -bottom-24 right-1/3 h-64 w-64 rounded-full bg-violet-500/5 blur-[80px]' />
        <div
          className='absolute inset-0 opacity-[0.018]'
          style={{
            backgroundImage: `radial-gradient(rgba(99,102,241,0.7) 1px, transparent 1px)`,
            backgroundSize: '36px 36px'
          }}
        />
      </div>

      <Container>
        <div className='space-y-12 lg:space-y-16'>
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className='mx-auto flex max-w-3xl flex-col items-center space-y-4 text-center'
          >
            <span className='inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-5 py-2 text-sm font-semibold uppercase tracking-wider text-primary'>
              <HelpCircle className='size-3.5' />
              {faqData?.subTitle}
            </span>

            <Typography
              variant='h2'
              as='h2'
              weight='bold'
              className='bg-linear-to-br from-foreground via-foreground/90 to-foreground/60 bg-clip-text text-transparent'
            >
              {faqData?.title}
            </Typography>

            {faqData?.desc && (
              <Typography variant='body1' className='max-w-xl text-muted-foreground leading-relaxed'>
                {faqData.desc}
              </Typography>
            )}
          </motion.div>

          {/* Accordion */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className='mx-auto max-w-3xl space-y-3'
          >
            {faqData.faqs.map((faq, index) => {
              const isOpen = openIndex === index

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.06 }}
                  className='group overflow-hidden rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:border-primary/20'
                >
                  {/* Top accent on open */}
                  <div
                    className={`h-px bg-linear-to-r from-transparent via-primary/40 to-transparent transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
                  />

                  <button
                    type='button'
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className='flex w-full items-center justify-between gap-4 px-5 py-4 lg:px-7 lg:py-5 text-left transition-colors duration-200 hover:text-primary focus-visible:outline-none'
                    aria-expanded={isOpen}
                  >
                    <span
                      className={`text-base font-semibold leading-snug transition-colors duration-200 lg:text-lg ${isOpen ? 'text-primary' : 'text-card-foreground'}`}
                    >
                      {faq.question}
                    </span>

                    <span
                      className={`flex shrink-0 items-center justify-center rounded-full border p-1 transition-all duration-300 ${isOpen ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border/60 bg-card text-muted-foreground group-hover:border-primary/30 group-hover:text-primary'}`}
                    >
                      {isOpen ? <Minus className='size-4' /> : <Plus className='size-4' />}
                    </span>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key='content'
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                      >
                        <div className='border-t border-border/40 px-5 py-4 lg:px-7 lg:py-5 text-muted-foreground text-sm lg:text-base leading-relaxed'>
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </Container>
    </Section>
  )
}
