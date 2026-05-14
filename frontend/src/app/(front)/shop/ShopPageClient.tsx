'use client'
import { Section } from '@/components/common/section'
import AllProducts from '@/components/frontend/shop/AllProducts'
import CategoryWithGroups from '@/components/frontend/shop/CategoryWithGroups'
import ShopHeader from '@/components/frontend/shop/ShopHeader'
import TopTenProducts from '@/components/frontend/shop/TopTenProducts'
import { useFilter } from '@/hooks/useFilter'

export default function ShopPageClient() {
  const { filters } = useFilter(10)
  const hasHierarchySelection = filters.categoryForGroups != null || filters.groupId != null

  return (
    <>
      {/* Header Section */}
      <div className='pt-4'>
        <ShopHeader />
      </div>

      {/* Main: Categories → Groups → Items */}
      <Section variant='none' className='Section'>
        <CategoryWithGroups />
      </Section>

      {/* Top Ten Products */}
      <TopTenProducts />

      {/* Keep standalone browsing out of the selected Categories -> Groups -> Items flow. */}
      {!hasHierarchySelection && <AllProducts />}
    </>
  )
}
