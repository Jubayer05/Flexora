'use client'

import FooterMenuForm from '@/components/admin/form/settings/FooterMenuForm'
import { Skeleton } from '@/components/ui/skeleton'
import useAsync from '@/hooks/useAsync'
import { FooterSettings } from '@/lib/validations/schemas/footerMenuSchema'

export default function FooterNavPage() {
  const menuKey = 'footer_menus'

  // Fetch existing settings
  const { data, mutate, loading } = useAsync<{ data: any }>(
    () => `/admin/settings/key/${menuKey}`,
    true
  )

  // Transform API data to match our schema
  const pageData: FooterSettings | null = (() => {
    if (!data?.data) return null

    const apiData = data.data as any
    if (apiData?.key !== menuKey) return null

    const value = apiData.value

    console.log('Raw API value:', value)
    console.log('Is Array:', Array.isArray(value))

    // If value is already an array (the footerMenus array)
    if (Array.isArray(value)) {
      return { footerMenus: value }
    }

    // If value is already wrapped in footerMenus object
    if (value?.footerMenus && Array.isArray(value.footerMenus)) {
      return value as FooterSettings
    }

    // Default to empty
    return null
  })()

  const onClose = () => {
    mutate()
  }

  return (
    <>
      {loading ? (
        <div className='space-y-6'>
          {Array.from({ length: 3 }).map((_, idx) => (
            <Skeleton className='w-full h-32' key={idx} />
          ))}
        </div>
      ) : (
        <FooterMenuForm settingsKey={menuKey} initialValues={pageData} refetch={onClose} />
      )}
    </>
  )
}
