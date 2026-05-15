import { cn } from '@/lib/utils'

export default function TrustBadges() {
  return (
    <section
      className={cn(
        'py-6 border-y border-[var(--outline-variant)]',
        'bg-[var(--surface-container)]'
      )}
    >
      <div
        className={cn(
          'max-w-[1440px] mx-auto px-20',
          'grid grid-cols-2 md:grid-cols-4 gap-6'
        )}
      >
        {[
          { icon: 'local_shipping', label: 'Free Shipping' },
          { icon: 'sync', label: '30-Day Returns' },
          { icon: 'verified_user', label: 'Secure Checkout' },
          { icon: 'support_agent', label: 'Expert Support' }
        ].map((badge, index) => (
          <div key={index} className="flex items-center gap-3">
            <span
              className="material-symbols-outlined text-[var(--primary)]"
              data-icon={badge.icon}
            >
              {badge.icon}
            </span>
            <span
              className={cn(
                'font-[JetBrains_Mono] text-[14px] leading-[18px] tracking-[-0.01em] font-medium uppercase tracking-wider',
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