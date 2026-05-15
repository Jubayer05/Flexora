import { cn } from '@/lib/utils'

export default function PromotionalSaleBanner() {
  return (
    <section className="max-w-[1440px] mx-auto px-20 py-20">
      <div
        className={cn(
          'fire-gradient rounded-xl overflow-hidden relative min-h-[300px]',
          'flex items-center px-12 grain-overlay'
        )}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 w-full items-center">
          <div className="z-10 py-6">
            <h2
              className={cn(
                'font-[Bebas_Neue] text-[80px] leading-[80px] tracking-[0.02em] font-bold text-white mb-4'
              )}
            >
              SEASONAL PEAK SALE
            </h2>
            <p
              className={cn(
                'font-[Outfit] text-[18px] leading-[28px] text-white/90 mb-6 max-w-md'
              )}
            >
              Get up to 40% off on all performance gear and supplements. Limited time only.
            </p>
            <button
              className={cn(
                'bg-[var(--background)] px-6 py-3 rounded-full',
                'font-[Bebas_Neue] text-[32px] leading-[32px] tracking-[0.02em] font-bold text-[var(--primary)] uppercase',
                'hover:bg-[var(--surface-container-high)] transition-all'
              )}
            >
              Claim Discount
            </button>
          </div>
          <div className="flex justify-center md:justify-end gap-6 z-10">
            {[
              { value: '01', label: 'Days' },
              { value: '14', label: 'Hrs' },
              { value: '30', label: 'Min' },
              { value: '45', label: 'Sec' }
            ].map((item, index) => (
              <div key={index} className="flex flex-col items-center">
                <div
                  className={cn(
                    'bg-[rgba(32,15,11,0.2)] backdrop-blur-md rounded-lg',
                    'w-20 h-20 flex items-center justify-center',
                    'text-white font-[JetBrains_Mono] text-[32px] leading-[24px] tracking-[-0.02em] font-semibold'
                  )}
                >
                  {item.value}
                </div>
                <span
                  className={cn(
                    'font-[JetBrains_Mono] text-[14px] leading-[18px] tracking-[-0.01em] font-medium text-white/70 uppercase mt-1'
                  )}
                >
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}