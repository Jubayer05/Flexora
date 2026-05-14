'use client'

import { useState } from 'react'
import SeoForm, { SeoFormData } from '@/components/admin/form/SeoForm'
import { EmptyState } from '@/components/common/EmptyState'
import PageHeader from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import useAsync from '@/hooks/useAsync'
import requests from '@/services/network/http'
import { toast } from 'sonner'

type SettingsData<T> = {
  success: boolean
  data: {
    key: string
    value: T
  }
}

export default function ShopSeoPage() {
  const [edit, setEdit] = useState(false)
  const settingsKey = 'shop_seo_settings'
  const { data, mutate, loading } = useAsync<SettingsData<SeoFormData>>(
    () => `/admin/settings/key/${settingsKey}`,
    true
  )
  const seoSettings = data?.data?.value ?? undefined

  const onClose = () => {
    mutate()
    setEdit(false)
  }

  const handleSubmit = async (formData: SeoFormData) => {
    try {
      const res = await requests.post(`/admin/settings/${settingsKey}`, {
        value: formData
      })
      if (res?.success) {
        toast.success('Shop SEO settings updated successfully!')
        onClose()
      }
    } catch (error: any) {
      throw error
    }
  }

  return (
    <>
      <PageHeader
        title='Shop Page SEO'
        subTitle='Configure SEO metadata for the shop page (/shop)'
        extra={
          seoSettings && (
            <Button variant={edit ? 'destructive' : 'default'} onClick={() => setEdit(!edit)}>
              {edit ? 'Cancel' : 'Edit'}
            </Button>
          )
        }
      />

      {!seoSettings || edit ? (
        <SeoForm
          initialValues={seoSettings}
          onSubmit={handleSubmit}
          isLoading={loading}
          title='Shop Page SEO Settings'
          description='Configure SEO metadata for the main shop page. These settings control how the shop page appears in search engines and when shared on social media.'
        />
      ) : loading ? (
        <div className='space-y-4'>
          {Array.from({ length: 4 }).map((_, idx) => (
            <Skeleton key={idx} className='w-full h-32' />
          ))}
        </div>
      ) : seoSettings ? (
        <div className='space-y-6'>
          <div className='bg-card border rounded-lg p-6'>
            <h3 className='font-semibold mb-4 text-lg'>Current SEO Settings</h3>
            <div className='space-y-2'>
              <p>
                <strong>Meta Title:</strong> {seoSettings.metaTitle || 'Not set'}
              </p>
              <p>
                <strong>Meta Description:</strong> {seoSettings.metaDescription || 'Not set'}
              </p>
              <p>
                <strong>Keywords:</strong>{' '}
                {seoSettings.keywords && seoSettings.keywords.length > 0
                  ? seoSettings.keywords.join(', ')
                  : 'Not set'}
              </p>
              <p>
                <strong>Canonical URL:</strong> {seoSettings.canonicalUrl || 'Not set'}
              </p>
              <p>
                <strong>OG Image:</strong> {seoSettings.ogImage ? 'Set' : 'Not set'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState />
      )}
    </>
  )
}



