'use client'

import { motion } from 'framer-motion'
import CategoryCard from '@/components/card/CategoryCard'
import { Container } from '@/components/common/container'
import { Section } from '@/components/common/section'
import { Typography } from '@/components/common/typography'
import { CategoriesSection } from '@/lib/validations/schemas/homepageSettings'
import { LayoutGrid } from 'lucide-react'

export default function Categories({
  data,
  categories
}: {
  data?: CategoriesSection
  categories?: any
}) {
  if (categories?.error) return null

  const categoryItems: Category[] = categories?.data?.categories || []
  if (!data || categoryItems.length === 0) return null

  return (
    <Section variant='xl' className='relative overflow-hidden border-border bg-card text-card-foreground'>
      {/* Ambient background */}
      <div className='pointer-events-none absolute inset-0 -z-10'>
        <div className='absolute -top-24 left-1/4 h-72 w-72 rounded-full bg-primary/6 blur-[90px]' />
        <div className='absolute -bottom-24 right-1/4 h-72 w-72 rounded-full bg-violet-500/5 blur-[90px]' />
        {/* Subtle grid */}
        <div
          className='absolute inset-0 opacity-[0.018]'
          style={{
            backgroundImage: `radial-gradient(rgba(99,102,241,0.8) 1px, transparent 1px)`,
            backgroundSize: '36px 36px'
          }}
        />
      </div>

      <Container>
        <div className='space-y-12'>
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className='mx-auto flex max-w-4xl flex-col items-center space-y-4 text-center'
          >
            <span className='inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-5 py-2 text-sm font-semibold uppercase tracking-wider text-primary'>
              <LayoutGrid className='size-3.5' />
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

            <Typography variant='h5' className='max-w-2xl text-muted-foreground'>
              {data?.desc}
            </Typography>
          </motion.div>

          {/* Cards grid */}
          <div className='grid gap-5 sm:grid-cols-2 xl:grid-cols-3'>
            {categoryItems.map((category, index) => (
              <motion.div
                key={category.id || index}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.55, delay: index * 0.08, ease: 'easeOut' }}
                whileHover={{ y: -6, transition: { duration: 0.25 } }}
              >
                <CategoryCard category={category} />
              </motion.div>
            ))}
          </div>
        </div>
      </Container>
    </Section>
  )
}
