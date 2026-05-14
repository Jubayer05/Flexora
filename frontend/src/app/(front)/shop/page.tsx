import { getHomepageData } from '@/action/data'
import Testimonials from '@/components/frontend/homepage/Testimonials'
import ShopPageClient from './ShopPageClient'

export default async function ShopPage() {
  const homeData = await getHomepageData()

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&display=swap');

        .sp-root {
          font-family: var(--font-manrope), 'Manrope', system-ui, sans-serif;
          position: relative;
        }

        /* ── Page-level ambient scene lighting ── */
        .sp-scene-light {
          pointer-events: none;
          position: fixed;
          inset: 0;
          z-index: 0;
          background:
            radial-gradient(1100px 400px at 20% 0%, rgba(99,102,241,0.07), transparent 55%),
            radial-gradient(900px 360px at 85% 15%, rgba(14,165,233,0.05), transparent 55%),
            radial-gradient(700px 400px at 50% 100%, rgba(167,139,250,0.04), transparent 60%);
        }

        /* ── Testimonials section divider ── */
        .sp-testimonials-wrap {
          position: relative;
          margin-top: 8px;
        }
        .sp-testimonials-divider {
          height: 1px;
          margin-bottom: 0;
          background: linear-gradient(90deg,
            transparent 0%,
            rgba(129,140,248,0.25) 20%,
            rgba(167,139,250,0.18) 50%,
            rgba(129,140,248,0.25) 80%,
            transparent 100%
          );
        }
      `}</style>

      {/* Fixed scene ambient glow */}
      <div className='sp-scene-light' />

      <div className='sp-root relative z-10'>
        {/* ── Main shop client content ── */}
        <ShopPageClient />

        {/* ── Testimonials ── */}
        <div className='sp-testimonials-wrap'>
          <div className='sp-testimonials-divider' />
          <Testimonials data={homeData?.feedback} />
        </div>
      </div>
    </>
  )
}
