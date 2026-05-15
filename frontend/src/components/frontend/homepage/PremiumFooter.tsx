import SiteLogo from '@/components/common/SiteLogo'
import { cn } from '@/lib/utils'

export default async function PremiumFooter() {
  return (
    <footer className="bg-[var(--surface-container-lowest)] border-t border-[var(--outline-variant)]">
      <div className="w-full px-4 md:px-8 lg:px-12 xl:px-20 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Column 1 - Brand */}
          <div>
            <SiteLogo
              height={40}
              className='mb-4 max-w-[200px] justify-start [&_img]:object-left'
            />
            <p
              className={cn(
                'font-outfit text-[14px] leading-[20px] text-[var(--muted-foreground)] mb-4'
              )}
            >
              Engineered for high-performance energy and premium exclusivity. Push
              beyond your limits with professional-grade gear.
            </p>
            <div className="flex gap-4">
              {[
                { icon: 'facebook', label: 'social_leaderboard' },
                { icon: 'instagram', label: 'Pentagram' },
                { icon: 'youtube_activity', label: 'youtube_activity' }
              ].map((item, index) => (
                <a
                  key={index}
                  className="text-[var(--on-surface-variant)] hover:text-[var(--primary)] transition-colors"
                  href="#"
                >
                  <span className="material-symbols-outlined" data-icon={item.icon}>
                    {item.label}
                  </span>
                </a>
              ))}
            </div>
          </div>

          {/* Column 2 - Product */}
          <div>
            <h4
              className={cn(
                'font-headline text-[32px] leading-[32px] tracking-[0.02em] font-bold text-[var(--on-surface)] mb-4'
              )}
            >
              Product
            </h4>
            <ul className="space-y-3">
              {['Men\'s Training', 'Women\'s Elite', 'Pro Supplements', 'Recovery Tools'].map((item, index) => (
                <li key={index}>
                  <a
                    className={cn(
                      'font-outfit text-[14px] leading-[20px] text-[var(--on-surface-variant)]',
                      'hover:text-[var(--on-surface)] transition-colors'
                    )}
                    href="#"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3 - Support */}
          <div>
            <h4
              className={cn(
                'font-headline text-[32px] leading-[32px] tracking-[0.02em] font-bold text-[var(--on-surface)] mb-4'
              )}
            >
              Support
            </h4>
            <ul className="space-y-3">
              {['Shipping & Returns', 'Track Order', 'Privacy Policy', 'Terms of Service'].map((item, index) => (
                <li key={index}>
                  <a
                    className={cn(
                      'font-outfit text-[14px] leading-[20px] text-[var(--on-surface-variant)]',
                      'hover:text-[var(--on-surface)] transition-colors'
                    )}
                    href="#"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4 - Payment */}
          <div>
            <h4
              className={cn(
                'font-headline text-[32px] leading-[32px] tracking-[0.02em] font-bold text-[var(--on-surface)] mb-4'
              )}
            >
              Payment Methods
            </h4>
            <div className="flex flex-wrap gap-3">
              {['credit_card', 'account_balance', 'contactless'].map((icon, index) => (
                <div
                  key={index}
                  className={cn(
                    'w-12 h-8 bg-[var(--surface-container-high)] rounded',
                    'flex items-center justify-center'
                  )}
                >
                  <span
                    className="material-symbols-outlined text-[18px] text-[var(--on-surface)]"
                    data-icon={icon}
                  >
                    {icon}
                  </span>
                </div>
              ))}
            </div>
            <p
              className={cn(
                'font-outfit text-[14px] leading-[20px] text-[var(--on-surface-variant)] mt-4'
              )}
            >
              Secure 256-bit SSL encrypted checkout.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="w-full px-4 md:px-8 lg:px-12 xl:px-20 py-4 border-t border-[var(--outline-variant)] text-center md:text-left">
        <p
          className={cn(
            'font-outfit text-[14px] leading-[20px] text-[var(--on-surface-variant)]/60'
          )}
        >
          © 2024 FLEXORA Performance. All rights reserved.
        </p>
      </div>
    </footer>
  )
}