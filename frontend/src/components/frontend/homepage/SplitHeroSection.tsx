import { cn } from '@/lib/utils'

export default function SplitHeroSection({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        'grain-overlay relative min-h-[870px] flex items-center overflow-hidden',
        className
      )}
    >
      <div
        className={cn(
          'grid grid-cols-1 md:grid-cols-2 w-full',
          'max-w-[1440px] mx-auto px-20 gap-12'
        )}
      >
        {/* Left - Hero Image */}
        <div
          className={cn(
            'relative rounded-xl overflow-hidden shadow-2xl group border border-white/5'
          )}
        >
          <img
            alt="Hero Athlete"
            className="w-full h-[600px] object-cover transition-transform duration-700 group-hover:scale-105"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCiBSy-6fb44vYtgODG8UwVvoRZMRtrF3BJzAbVt_ByGjVlxS_kHhcixLOF7LMVVSg-Z9uZxhjxVYNDA8WEotlzHJ2lNh8lqTU5H94YiMfm2P84T7NomG2O92lNkZGnrG9klQw3r5ADu0p3nHJEGJIAdcg2gYwGM6PIsZUF_5ZZnsExLmYnX9UfpsWqIzX7F-Y4iASzsh-pjELUiQNLvpSIR-2dpiH0ahkbG1SZztv4XPJpXkRDM8VSPufe_KWiM1kmOhfob0ryjYs4"
          />
          <div
            className={cn(
              'absolute inset-0',
              'bg-gradient-to-t from-[var(--background)] via-transparent to-transparent',
              'opacity-60'
            )}
          />
        </div>

        {/* Right - Hero Content */}
        <div className="flex flex-col justify-center">
          <h1
            className={cn(
              'font-display-lg text-[80px] leading-[80px] tracking-[0.02em] font-bold leading-tight mb-6 text-[var(--foreground)]'
            )}
          >
            BUILT FOR <span className="text-[var(--primary)]">BEASTS.</span>
            <br />
            PRICED FOR EVERYONE.
          </h1>
          <p
            className={cn(
              'font-body-lg text-[18px] leading-[28px] max-w-lg mb-6 text-[var(--on-surface-variant)]'
            )}
          >
            Professional bodybuilding gear forged in the furnace of elite performance.
            Uncompromising quality meets accessible engineering.
          </p>
          <div className="flex gap-12">
            <button
              className={cn(
                'fire-gradient px-12 py-3 rounded-full',
                'text-[32px] leading-[32px] tracking-[0.02em] font-bold text-white uppercase',
                'shadow-lg shadow-[#ffb4a2]/20',
                'hover:scale-105 active:scale-95 transition-all'
              )}
            >
              Shop Now
            </button>
            <button
              className={cn(
                'border-2 border-[var(--outline)] px-12 py-3 rounded-full',
                'text-[32px] leading-[32px] tracking-[0.02em] font-bold uppercase text-[var(--foreground)]',
                'hover:bg-[var(--surface-container-high)] transition-all active:scale-95'
              )}
            >
              Explore
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}