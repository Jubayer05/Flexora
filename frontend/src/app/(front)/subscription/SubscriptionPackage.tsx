'use client'

import { useRef } from 'react'
import { motion } from 'framer-motion'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import CustomLink from '@/components/common/CustomLink'
import MotionLoader from '@/components/common/MotionLoader'
import { Button } from '@/components/ui/button'
import useAsync from '@/hooks/useAsync'
import type { SubscriptionPackage } from '@/types/subscription'
import { Check, Crown, Sparkles, Star, Zap, ArrowRight } from 'lucide-react'
import CustomImage from '@/components/common/CustomImage'

interface SubscriptionPackagesResponse {
  success: boolean
  data: {
    data: SubscriptionPackage[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
      hasNext: boolean
      hasPrev: boolean
    }
  }
}

gsap.registerPlugin()

export default function SubscriptionPackagesPage() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const { data, loading, error } = useAsync<SubscriptionPackagesResponse>(
    () => '/subscription-packages?isActive=true'
  )

  const packages = data?.data?.data || []

  useGSAP(
    () => {
      gsap.to('.sub-orb', {
        scale: 1.25,
        opacity: 0.6,
        duration: 6,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        stagger: { each: 1.5 }
      })
    },
    { scope: sectionRef }
  )

  const getPackageIcon = (name: string) => {
    const n = name.toLowerCase()
    if (n.includes('premium') || n.includes('pro')) return Crown
    if (n.includes('elite') || n.includes('vip')) return Star
    if (n.includes('starter') || n.includes('basic')) return Zap
    return Sparkles
  }

  const getPackageAccent = (name: string, idx: number) => {
    const n = name.toLowerCase()
    if (n.includes('premium') || n.includes('pro'))
      return { from: 'from-yellow-500', to: 'to-orange-500', glow: 'rgba(245,158,11,0.15)', border: 'border-yellow-500/30', badge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' }
    if (n.includes('elite') || n.includes('vip'))
      return { from: 'from-purple-500', to: 'to-pink-500', glow: 'rgba(168,85,247,0.15)', border: 'border-purple-500/30', badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20' }
    if (n.includes('starter') || n.includes('basic'))
      return { from: 'from-blue-500', to: 'to-cyan-500', glow: 'rgba(59,130,246,0.15)', border: 'border-blue-500/30', badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20' }
    const defaults = [
      { from: 'from-primary', to: 'to-violet-500', glow: 'rgba(99,102,241,0.15)', border: 'border-primary/30', badge: 'bg-primary/10 text-primary border-primary/20' },
      { from: 'from-emerald-500', to: 'to-teal-500', glow: 'rgba(16,185,129,0.15)', border: 'border-emerald-500/30', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
      { from: 'from-rose-500', to: 'to-pink-500', glow: 'rgba(244,63,94,0.15)', border: 'border-rose-500/30', badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
    ]
    return defaults[idx % defaults.length]
  }

  if (loading) {
    return (
      <div className='flex justify-center items-center py-24'>
        <MotionLoader size='lg' variant='dots' />
      </div>
    )
  }

  if (error || packages.length === 0) return null

  return (
    <section ref={sectionRef} className='relative overflow-hidden py-16 sm:py-20 bg-background text-card-foreground font-manrope'>
      {/* Ambient background */}
      <div className='pointer-events-none absolute inset-0 -z-10'>
        <div className='sub-orb absolute -top-32 left-1/4 h-[400px] w-[400px] rounded-full bg-primary/8 blur-[120px]' />
        <div className='sub-orb absolute -bottom-32 right-1/4 h-[350px] w-[350px] rounded-full bg-violet-500/6 blur-[100px]' />
        <div
          className='absolute inset-0 opacity-[0.018]'
          style={{
            backgroundImage: `radial-gradient(rgba(99,102,241,0.9) 1px, transparent 1px)`,
            backgroundSize: '32px 32px'
          }}
        />
      </div>

      <div className='mx-auto max-w-7xl px-4'>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className='mb-12 text-center space-y-4'
        >
          <span className='inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-5 py-2 text-sm font-semibold uppercase tracking-wider text-primary'>
            <Sparkles className='size-3.5' />
            Subscription Plans
          </span>

          <h2 className='text-3xl sm:text-4xl lg:text-5xl font-bold bg-linear-to-br from-foreground via-foreground/90 to-foreground/60 bg-clip-text text-transparent leading-tight'>
            Choose Your Subscription Plan
          </h2>

          <p className='mx-auto max-w-2xl text-muted-foreground text-base sm:text-lg leading-relaxed'>
            Get exclusive discounts on all your orders with our monthly subscription packages.
            Cancel anytime, no commitments.
          </p>
        </motion.div>

        {/* Package Cards */}
        <div className='grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-3'>
          {packages.map((pkg: SubscriptionPackage, idx: number) => {
            const IconComponent = getPackageIcon(pkg.name)
            const accent = getPackageAccent(pkg.name, idx)
            const meta = (pkg.meta as any) || {}
            const customIconUrl: string | undefined = meta.icon
            const metaFeatures: string[] | null =
              Array.isArray(meta.features) && meta.features.length ? meta.features : null

            const defaultFeatures = [
              `${parseFloat(pkg.discount).toFixed(0)}% discount on every order`,
              `Valid for ${pkg.duration} days`,
              'Automatic discount application',
              'Cancel anytime',
              'Email reminders before expiry'
            ]

            const featureList = metaFeatures || defaultFeatures

            return (
              <motion.div
                key={pkg.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.55, delay: idx * 0.1, ease: 'easeOut' }}
                whileHover={{ y: -8, transition: { duration: 0.25 } }}
                className='group relative'
              >
                {/* Card glow */}
                <div
                  className='pointer-events-none absolute -inset-px rounded-2xl opacity-0 blur-md transition-opacity duration-500 group-hover:opacity-100'
                  style={{ background: `radial-gradient(ellipse at 50% 0%, ${accent.glow}, transparent 70%)` }}
                />

                <div className={`relative flex flex-col h-full rounded-2xl border ${accent.border} bg-card/80 backdrop-blur-sm overflow-hidden transition-all duration-500 hover:shadow-xl`}>
                  {/* Top accent line */}
                  <div className={`absolute top-0 left-0 right-0 h-[2px] bg-linear-to-r ${accent.from} ${accent.to} opacity-60 group-hover:opacity-100 transition-opacity duration-300`} />

                  <div className='flex flex-col gap-5 p-6 sm:p-7 flex-1'>
                    {/* Icon + Name */}
                    <div className='flex items-center gap-4'>
                      <div className={`flex items-center justify-center rounded-xl bg-linear-to-br ${accent.from} ${accent.to} p-3 shadow-lg`}>
                        {customIconUrl ? (
                          <CustomImage
                            src={customIconUrl}
                            alt={pkg.name}
                            width={28}
                            height={28}
                            className='size-6 sm:size-7 object-contain'
                            unoptimized
                          />
                        ) : (
                          <IconComponent className='size-6 sm:size-7 text-white' />
                        )}
                      </div>
                      <div>
                        <h3 className='text-lg sm:text-xl font-bold text-card-foreground leading-tight group-hover:text-foreground transition-colors'>
                          {pkg.name}
                        </h3>
                        {pkg.description && (
                          <p className='text-xs text-muted-foreground mt-0.5 line-clamp-1'>{pkg.description}</p>
                        )}
                      </div>
                    </div>

                    {/* Price */}
                    <div className='flex items-baseline gap-1.5'>
                      <span className='text-4xl sm:text-5xl font-bold text-primary'>
                        ${parseFloat(pkg.price).toFixed(2)}
                      </span>
                      <span className='text-sm text-muted-foreground'>/ {pkg.duration} days</span>
                    </div>

                    {/* Discount badge */}
                    <div className={`flex items-center justify-between rounded-xl border px-4 py-3 ${accent.badge}`}>
                      <span className='text-sm font-medium opacity-80'>Discount on all orders</span>
                      <span className='text-xl font-bold'>
                        {parseFloat(pkg.discount).toFixed(0)}% OFF
                      </span>
                    </div>

                    {/* Features */}
                    <ul className='space-y-2.5 flex-1'>
                      {featureList.map((feature: string, i: number) => (
                        <li key={i} className='flex items-center gap-3 text-sm text-card-foreground'>
                          <div className='flex size-5 shrink-0 items-center justify-center rounded-full border border-green-500/20 bg-green-500/10'>
                            <Check className='size-3 text-green-400' />
                          </div>
                          {feature}
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <CustomLink href={`/user/subscription?package=${pkg.id}`} className='block mt-auto pt-2'>
                      <Button
                        className={`w-full gap-2 font-semibold text-white bg-linear-to-r ${accent.from} ${accent.to} hover:opacity-90 transition-opacity`}
                        size='lg'
                      >
                        Get Started
                        <ArrowRight className='size-4 transition-transform duration-200 group-hover:translate-x-1' />
                      </Button>
                    </CustomLink>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Footer note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className='mx-auto mt-12 max-w-3xl text-center text-sm text-muted-foreground'
        >
          All subscriptions are billed monthly. You&apos;ll receive an email notification 1 day
          before your subscription expires. No auto-renewal — you have full control.
        </motion.p>
      </div>
    </section>
  )
}
