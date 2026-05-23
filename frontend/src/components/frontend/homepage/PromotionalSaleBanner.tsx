import { cn } from '@/lib/utils'

export default function PromotionalSaleBanner() {
  return (
    <section className="w-full px-4 sm:px-6 py-6 sm:py-8">
      <div
        className={cn(
          'fire-gradient rounded-xl overflow-hidden relative min-h-[200px] sm:min-h-[220px]',
          'flex items-center px-4 sm:px-6 grain-overlay'
        )}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 w-full items-center gap-6 lg:gap-8">
          <div className="z-10 py-3 sm:py-4 text-center lg:text-left">
            <h2
              className={cn(
                'font-[Bebas_Neue] text-[24px] sm:text-[32px] md:text-[40px] lg:text-[48px]',
                'leading-[24px] sm:leading-[32px] md:leading-[40px] lg:leading-[48px]',
                'tracking-[0.02em] font-bold text-white mb-2 sm:mb-3'
              )}
            >
              SEASONAL PEAK SALE
            </h2>
            <p
              className={cn(
                'font-[Outfit] text-[12px] sm:text-[14px] md:text-[16px]',
                'leading-[18px] sm:leading-[20px] md:leading-[24px]',
                'text-white/90 mb-3 sm:mb-4 max-w-md mx-auto lg:mx-0'
              )}
            >
              Get up to 40% off on all performance gear and supplements. Limited time only.
            </p>
            <button
              className={cn(
                'bg-[var(--background)] px-4 sm:px-5 py-1.5 sm:py-2 rounded-full',
                'font-[Bebas_Neue] text-[16px] sm:text-[18px] md:text-[20px]',
                'leading-[16px] sm:leading-[18px] md:leading-[20px]',
                'tracking-[0.02em] font-bold text-[var(--primary)] uppercase',
                'hover:bg-[var(--surface-container-high)] transition-all'
              )}
            >
              Claim Discount
            </button>
          </div>
          <div className="flex justify-center lg:justify-end gap-2 sm:gap-3 z-10 pb-3 sm:pb-4 lg:pb-0">
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
                    'w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 flex items-center justify-center',
                    'text-white font-[JetBrains_Mono] text-[14px] sm:text-[16px] md:text-[20px]',
                    'leading-[14px] sm:leading-[16px] md:leading-[18px]',
                    'tracking-[-0.02em] font-semibold'
                  )}
                >
                  {item.value}
                </div>
                <span
                  className={cn(
                    'font-[JetBrains_Mono] text-[8px] sm:text-[10px] md:text-[12px]',
                    'leading-[12px] sm:leading-[14px] md:leading-[16px]',
                    'tracking-[-0.01em] font-medium text-white/70 uppercase mt-0.5'
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