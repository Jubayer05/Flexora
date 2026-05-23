import { cn } from '@/lib/utils'

export default function ShopByGoal() {
  return (
    <section className="bg-[var(--surface-container)] py-8 md:py-10 lg:py-12">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 lg:px-10">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 sm:gap-4 mb-5 sm:mb-6">
          <div>
            <p
              className={cn(
                'font-[JetBrains_Mono] text-[11px] sm:text-xs leading-4 tracking-[-0.01em] font-medium uppercase mb-1 sm:mb-2 text-[var(--primary)]'
              )}
            >
              Selection
            </p>
            <h2
              className={cn(
                'font-[Bebas_Neue] text-2xl sm:text-3xl md:text-4xl leading-[1] tracking-[0.02em] font-bold text-[var(--foreground)]'
              )}
            >
              SHOP BY GOAL
            </h2>
          </div>
          <div className="flex gap-2 self-start sm:self-auto">
            {['chevron_left', 'chevron_right'].map((icon, index) => (
              <button
                key={index}
                className={cn(
                  'w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-[var(--outline-variant)]',
                  'flex items-center justify-center text-[var(--foreground)]',
                  'hover:bg-[var(--primary)] hover:text-[var(--on-primary)] transition-all'
                )}
              >
                <span className="material-symbols-outlined text-base sm:text-lg" data-icon={icon}>
                  {icon}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[
            {
              name: 'Hypertrophy',
              image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAAfvHmr-qvMia4HDUCEU1k2JzF4qCX4yqaJ84_ISVmVudO9pNlDtqEJdIABk3bddDe1vgJ1_pBFl5YkLsFA4p6ltFBMhcHU-GBeAsY0eXI0jUNfK5B2NY_FsGW2jjyf9Onj8GycCJl7fGW_r1jGq7gy4wMJbVGXxqth1f9O03k6PoujbZLvtQCSyvORj1ZdNqLONMzMOZILQRp0kSVoocIDWcSc9Iqc5dkrnl5F3M37PDKE8d9wJcCx4aRKoUM_sN4WQ86dLiqFSYH'
            },
            {
              name: 'Endurance',
              image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBb5pSqeWIxVnOmOMwBldcQIb0NyxdplwdIGYwh3roh8W065We7baRtDGl0sZi5gD4lMwMTzclPuxVcl5jiN7zyF1JZAJT9-GNyHcUO0MTkXKlUCfa5R9mHa6QMPMCEK-oC8ICeTaj2CtgcDocPRq5OHrK58fmzwc96jEAQ5tiqwy7U9wn8hPeQ2HtRqydXb0KR3jM9ynDTvtSwBmsC-1k9aRw1pEvu7UWx3eKoCiILo5QuGXe1rawOUDCXb1cB16kuqoIMGHHqtYES'
            },
            {
              name: 'Mobility',
              image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBoV1zo1PrLq_cL4m1YC9Qs17X3CeFIadrpRygIBd2xFIHOh99hRk-IttPKDTTdpq3xUdpub6VMvKT8ijQiFnBU9IJZmFGp8vV1Tuw5932c4J-RtwBJWuJtQ4cQOJxCKCgN-et3DjfUHuyOkIQOwdAdjQnRfJXWU1smihUbiqU8B0ANjsqG_XNqmEWQZJ9gRFlmIkf8g2MqLiSAoYt4FiEAI2GT7Fi6RK3vXKNHbT1KjaXdbDsHE0S8q5L6cPfsfsiTwT3Lc5VBmKEp'
            },
            {
              name: 'Strength',
              image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDyJJpXe4gHPOgj5pYi0swYdniWKRUb08nA9p8plPsxTXb2iUz5PaFxHsLq2KqIfJRFyPTmvgmzwTqSNgw4WPpT9fERiPZhgy91Nq2VHurc6N3dA5AfqGlSEJ4_En3_Ie8iE11cbUK2_GkTnKyUwljs5TtjaBsMEyeP3VWNRlmWsEF9l3oEuPu3RG6ukbcQWCtWIVPll11KLMpPDVkXHhAsVBZQSVEZte7GPLw8cNR6eqaee884BWwXVTAZSDo5-InhaImgY6zTMNmG'
            }
          ].map((card, index) => (
            <div
              key={index}
              className="glass-card p-3 sm:p-4 rounded-lg group overflow-hidden"
            >
              <div className="aspect-[4/5] rounded-md overflow-hidden mb-3 sm:mb-4">
                <img
                  alt={card.name}
                  className={cn(
                    'w-full h-full object-cover transition-transform group-hover:scale-105'
                  )}
                  src={card.image}
                />
              </div>
              <h4
                className={cn(
                  'font-[Bebas_Neue] text-lg sm:text-xl leading-[1] tracking-[0.02em] font-bold text-center uppercase text-[var(--foreground)]',
                  'group-hover:text-[var(--primary)] transition-colors'
                )}
              >
                {card.name}
              </h4>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}