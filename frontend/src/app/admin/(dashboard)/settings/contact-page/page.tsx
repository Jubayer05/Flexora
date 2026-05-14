'use client'

import ContactPageSettings from '@/components/admin/form/settings/ContactPageSettings'
import useAsync from '@/hooks/useAsync'
import { SiteSettings } from '@/lib/validations/schemas/contactPageSettings'

// Main component
export default function ContactConfigPage() {
  const settingsKey = 'system_contact_page_settings'
  const { data, mutate, loading } = useAsync<SettingsData<SiteSettings>>(
    () => `/admin/settings/key/${settingsKey}`,
    true
  )
  const siteConfig = data?.data?.value ?? undefined
  const onClose = () => {
    mutate()
  }

  return (
    <>
      {loading ? (
        <div className='flex justify-center items-center min-h-[400px]'>
          <div className='text-center'>
            <div className='mx-auto border-primary border-b-2 rounded-full w-8 h-8 animate-spin'></div>
            <p className='mt-2 text-muted-foreground text-sm'>Loading...</p>
          </div>
        </div>
      ) : (
        <ContactPageSettings
          settingsKey={settingsKey}
          initialValues={siteConfig}
          refetch={onClose}
        />
      )}
    </>
  )
}
