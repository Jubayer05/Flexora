import { cn } from '@/lib/utils'

export default function BrandStory() {
  return (
    <section className="py-8 md:py-12 bg-[var(--surface-container-low)]">
      <div
        className={cn(
          'max-w-[1440px] mx-auto px-4 sm:px-6 md:px-10 lg:px-20',
          'grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-center'
        )}
      >
        <div className="order-2 md:order-1">
          <h2
            className={cn(
              'font-[Bebas_Neue] text-[24px] sm:text-[32px] md:text-[40px] leading-[1.1] tracking-[0.02em] font-bold mb-3 sm:mb-4 text-[var(--foreground)]'
            )}
          >
            THE SCIENCE OF
            <br className="hidden sm:block" />
            <span className="text-[var(--primary)]">UNSTOPPABLE.</span>
          </h2>
          <p
            className={cn(
              'font-[Outfit] text-[14px] sm:text-[16px] leading-relaxed mb-4 text-[var(--on-surface-variant)]'
            )}
          >
            At Flexora, we don't just sell equipment; we engineer progress.
            Founded by athletes for athletes, our products are rigorously tested
            in the world's most demanding environments. We believe that
            professional-grade performance shouldn't be a privilege of the elite
            few, but a standard for everyone who dares to push their limits.
          </p>
          <div className="grid grid-cols-3 gap-4 sm:gap-6">
            {[
              { value: '150K+', label: 'Athletes' },
              { value: '12', label: 'Pro Awards' },
              { value: '24/7', label: 'Expert Care' }
            ].map((stat, index) => (
              <div key={index}>
                <p
                  className={cn(
                    'font-[Bebas_Neue] text-[20px] sm:text-[24px] leading-[1.1] tracking-[0.02em] font-bold text-[var(--primary)]'
                  )}
                >
                  {stat.value}
                </p>
                <p
                  className={cn(
                    'font-[Outfit] text-[10px] sm:text-[12px] leading-[1.4] uppercase text-[var(--on-surface-variant)]'
                  )}
                >
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="order-1 md:order-2 rounded-xl overflow-hidden glass-card h-[240px] sm:h-[280px] md:h-[320px]">
          <img
            alt="Brand Story"
            className="w-full h-full object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuChYjuI4TJLulSQkJ3q4LJ0GkrKRF4UQUhjg9_bZAdBMv3kh1u2AY3yXDf-PgciUVAfQQkNnY9B6yII642nRqCSjjXK0T6mf5ayybBzr40Uikfzp_DPgEHuncLYhQ-ueFzQ4JInZeJqvRZnFj6-9DnD6QEaaZM8_tOJw1hEFP7niidLRpZrTt_KElvfm-FG64RitzmCQ9GDrlp6wyt4gowmhio4zwjrmIVqN-I7DocJOw-3cAXojwkRQvQQ6OuqJDpBi8JzGtLOzyFI"
          />
        </div>
      </div>
    </section>
  )
}