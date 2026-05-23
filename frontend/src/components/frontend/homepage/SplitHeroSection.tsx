import { cn } from '@/lib/utils'

export default function SplitHeroSection({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        'grain-overlay relative min-h-[400px] sm:min-h-[500px] lg:min-h-[600px] flex items-center overflow-hidden',
        className
      )}
    >
      <div
        className={cn(
          'grid grid-cols-1 md:grid-cols-2 w-full',
          'max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 gap-4 md:gap-6'
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
            className="w-full h-[200px] sm:h-[280px] md:h-[350px] lg:h-[450px] object-cover transition-transform duration-700 group-hover:scale-105"
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
        <div className="flex flex-col justify-center py-2">
          <h1
            className={cn(
              'font-display-lg text-2xl sm:text-3xl md:text-4xl lg:text-[48px]',
              'leading-tight font-bold mb-3 text-[var(--foreground)]',
              'tracking-[0.02em]'
            )}
          >
            BUILT FOR <span className="text-[var(--primary)]">BEASTS.</span>
            <br />
            PRICED FOR EVERYONE.
          </h1>
          <p
            className={cn(
              'font-body-lg text-sm sm:text-[15px] md:text-base',
              'leading-[1.5]',
              'max-w-lg mb-4 text-[var(--on-surface-variant)]'
            )}
          >
            Professional bodybuilding gear forged in the furnace of elite performance.
            Uncompromising quality meets accessible engineering.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <button
              className={cn(
                'fire-gradient px-5 sm:px-6 md:px-7 py-2 rounded-full',
                'text-sm sm:text-[15px] md:text-base',
                'tracking-[0.02em] font-bold text-white uppercase',
                'shadow-lg shadow-[#ffb4a2]/20',
                'hover:scale-105 active:scale-95 transition-all'
              )}
            >
              Shop Now
            </button>
            <button
              className={cn(
                'border-2 border-[var(--outline)] px-5 sm:px-6 md:px-7 py-2 rounded-full',
                'text-sm sm:text-[15px] md:text-base',
                'tracking-[0.02em] font-bold uppercase text-[var(--foreground)]',
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