import { cn } from '@/lib/utils'

export default function VisualCategoryGrid() {
  return (
    <section className="py-20 max-w-[1440px] mx-auto px-20">
      <h2
        className={cn(
          'font-[Bebas_Neue] text-[48px] leading-[48px] tracking-[0.02em] font-bold mb-12 text-[var(--foreground)]'
        )}
      >
        CHOOSE YOUR DISCIPLINE
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            name: 'STRENGTH',
            image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDyJJpXe4gHPOgj5pYi0swYdniWKRUb08nA9p8plPsxTXb2iUz5PaFxHsLq2KqIfJRFyPTmvgmzwTqSNgw4WPpT9fERiPZhgy91Nq2VHurc6N3dA5AfqGlSEJ4_En3_Ie8iE11cbUK2_GkTnKyUwljs5TtjaBsMEyeP3VWNRlmWsEF9l3oEuPu3RG6ukbcQWCtWIVPll11KLMpPDVkXHhAsVBZQSVEZte7GPLw8cNR6eqaee884BWwXVTAZSDo5-InhaImgY6zTMNmG',
            alt: 'Close up of a muscular athlete gripping a heavy iron dumbbell'
          },
          {
            name: 'CARDIO',
            image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuATbLu9kRTOLMU4VdWoqeZ1oJD6XSyM8bfpCJUvmJjXYz511NjtQHOYdEEsHoktzXQkUYzoEtY-IbpK2MyVoP9lbQXIFDeXJZQ_Ix8-VqEfDkdJcUD--i6tY4Thc7hRFbYlj288PypgynEo1i7su75aHVr3gZXo9sUwif-_I1NrotcKqeEwGXf_Mywj_3Z2owEZpD07rCSJ-aPEN4oT0yIqZOtI2hU0uZ3C9pMr3xXH06jq0BG8T_XUkk81Iw9aAxAycS2Nlzd6bVM5',
            alt: 'A female runner sprinting on a track at dusk'
          },
          {
            name: 'RECOVERY',
            image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC7aQaFbqS6byC4JJ1Zm1FtmfFUvhVoPbHLFj9ryxl_4NBbm2vbAlWPrxPZh0_E5kBYTnyzP1ldBFrd35fXvSe51SoErtwIA8CBsupC8-nObxbXz0wLWudRUjhtyw_A8zhkMq49MUxBr_lZuwv0mlCdnWAXtLYb2T-UbpxgLKj7iSKzIlyTO-5pePtWA-u-GWTHSDvP5gHULJ1nQQk1LPGEqj-_QvA-6YxUmHZFKPvVMtNmAvyKRgrTzjhzVjDBJyd2UbULTdqDZ2JG',
            alt: 'A focused athlete performing static stretching in a yoga studio'
          }
        ].map((category, index) => (
          <div
            key={index}
            className={cn(
              'relative h-[450px] rounded-xl overflow-hidden',
              'glass-card group cursor-pointer'
            )}
          >
            <img
              alt={category.name}
              className={cn(
                'absolute inset-0 w-full h-full object-cover',
                'transition-transform duration-500 group-hover:scale-110'
              )}
              src={category.image}
            />
            <div
              className={cn(
                'absolute inset-0 bg-gradient-to-t from-[var(--primary)] to-transparent',
                'opacity-0 group-hover:opacity-100 transition-opacity'
              )}
            />
            <div className="absolute bottom-6 left-6">
              <h3
                className={cn(
                  'font-[Bebas_Neue] text-[48px] leading-[48px] tracking-[0.02em] font-bold text-white'
                )}
              >
                {category.name}
              </h3>
              <div
                className={cn(
                  'h-1 w-0 bg-white transition-all duration-300 group-hover:w-full'
                )}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}