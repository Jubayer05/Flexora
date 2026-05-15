import SplitHeroSection from '@/components/frontend/homepage/SplitHeroSection'
import TrustBadges from '@/components/frontend/homepage/TrustBadges'
import VisualCategoryGrid from '@/components/frontend/homepage/VisualCategoryGrid'
import ShopByGoal from '@/components/frontend/homepage/ShopByGoal'
import TrendingGear from '@/components/frontend/homepage/TrendingGear'
import PromotionalSaleBanner from '@/components/frontend/homepage/PromotionalSaleBanner'
import BrandStory from '@/components/frontend/homepage/BrandStory'
import NewsletterSignup from '@/components/frontend/homepage/NewsletterSignup'

export default function HomePage() {
  return (
    <>
      <SplitHeroSection />
      <TrustBadges />
      <VisualCategoryGrid />
      <ShopByGoal />
      <TrendingGear />
      <PromotionalSaleBanner />
      <BrandStory />
      <NewsletterSignup />
    </>
  )
}