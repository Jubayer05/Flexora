import { cn } from '@/lib/utils'

export default function TrustBadges() {
  return (
    <section
      className={cn(
        'py-6 sm:py-8 md:py-10 border-y border-[var(--outline-variant)]',
        'bg-[var(--surface-container)]'
      )}
    >
      <div
        className={cn(
          'max-w-[1440px] mx-auto px-4 sm:px-8 md:px-12 lg:px-20',
          'grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8',
          'place-items-center'
        )}
      >
        {[
          { icon: 'local_shipping', label: 'Free Shipping' },
          { icon: 'sync', label: '30-Day Returns' },
          { icon: 'verified_user', label: 'Secure Checkout' },
          { icon: 'support_agent', label: 'Expert Support' }
        ].map((badge, index) => (
          <div key={index} className="flex items-center gap-2 sm:gap-3 md:gap-4">
            <span
              className="material-symbols-outlined text-[var(--primary)] text-lg sm:text-xl md:text-2xl"
              data-icon={badge.icon}
            >
              {badge.icon}
            </span>
            <span
              className={cn(
                'font-[JetBrains_Mono] text-xs sm:text-sm md:text-base leading-tight tracking-[-0.01em] font-medium uppercase',
                'text-[var(--on-surface-variant)]'
              )}
            >
              {badge.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}