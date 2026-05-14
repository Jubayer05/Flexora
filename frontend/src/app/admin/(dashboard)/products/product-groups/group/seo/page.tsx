'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import SeoForm, { SeoFormData } from '@/components/admin/form/SeoForm'
import { EmptyState } from '@/components/common/EmptyState'
import PageHeader from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CustomSelect } from '@/components/common/CustomSelect'
import useAsync from '@/hooks/useAsync'
import requests from '@/services/network/http'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'

type ProductGroup = {
  id: number
  name: string
  seo?: any
}

export default function ProductGroupSeoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const groupIdFromQuery = searchParams.get('groupId')
  const [selectedGroupId, setSelectedGroupId] = useState<string>(groupIdFromQuery || '')
  const [edit, setEdit] = useState(false)

  // Set initial group from query params
  useEffect(() => {
    if (groupIdFromQuery) {
      setSelectedGroupId(groupIdFromQuery)
    }
  }, [groupIdFromQuery])

  // Fetch all product groups for selection
  // Match the same structure as product-groups page.tsx which uses ProductGroupResponse
  const { data: groupsData, loading: loadingGroups } = useAsync<any>(
    () => '/admin/product-groups/all?limit=100'
  )

  // Fetch selected product group data
  const { data: groupData, loading: loadingGroup, mutate: mutateGroup } = useAsync<{
    data: ProductGroup
  }>(() => (selectedGroupId ? `/admin/product-groups/${selectedGroupId}` : null))

  // Extract groups array - match the structure used in product-groups page
  // The product-groups page uses: data={data?.data ?? []}
  // So the structure is: { data: { data: [...] } }
  const groups = groupsData?.data ?? []
  
  const group = groupData?.data
  const seoSettings = group?.seo || {}

  const onClose = () => {
    mutateGroup()
    setEdit(false)
  }

  const handleSubmit = async (formData: SeoFormData) => {
    if (!selectedGroupId) {
      toast.error('Please select a product group first')
      return
    }

    try {
      // Update the product group with SEO data
      // Send only SEO data to update, preserving other fields
      const res = await requests.put(`/admin/product-groups/${selectedGroupId}`, {
        seo: formData
      })
      if (res?.success) {
        toast.success('Product group SEO settings updated successfully!')
        // Refetch the group data to get updated SEO
        mutateGroup()
        onClose()
      }
    } catch (error: any) {
      throw error
    }
  }

  // Reset edit mode when group changes
  const handleGroupChange = (value: string) => {
    setSelectedGroupId(value)
    setEdit(false)
  }

  return (
    <>
      <PageHeader
        title='Product Group SEO Settings'
        subTitle='Configure SEO metadata for product group pages'
        extra={
          <Button variant='outline' onClick={() => router.back()} className='gap-2'>
            <ArrowLeft className='h-4 w-4' />
            Back
          </Button>
        }
      />

      <div className='space-y-6'>
        {/* Group Selection */}
        <div className='bg-card border rounded-lg p-6'>
          <h3 className='font-semibold mb-4 text-lg'>Select Product Group</h3>
          {loadingGroups ? (
            <Skeleton className='w-full h-10' />
          ) : groups.length > 0 ? (
                  <CustomSelect
                    value={selectedGroupId}
                    onChange={handleGroupChange}
                    options={groups.map((group: ProductGroup) => ({
                      value: group.id.toString(),
                      label: group.name
                    }))}
              placeholder='Select a product group to edit SEO'
            />
          ) : (
            <div className='text-muted-foreground text-sm py-2'>
              {groupsData 
                ? 'No product groups found. Please create a product group first.' 
                : 'Failed to load product groups. Please refresh the page.'}
            </div>
          )}
        </div>

        {/* SEO Form */}
        {selectedGroupId && group ? (
          <>
            {!seoSettings || Object.keys(seoSettings).length === 0 || edit ? (
              <SeoForm
                initialValues={seoSettings}
                onSubmit={handleSubmit}
                isLoading={loadingGroup}
                title={`SEO Settings - ${group.name}`}
                description={`Configure SEO metadata for the product group "${group.name}". These settings control how this group page appears in search engines and when shared on social media.`}
              />
            ) : (
              <div className='space-y-6'>
                <div className='flex items-center justify-between'>
                  <h3 className='font-semibold text-lg'>Current SEO Settings</h3>
                  <Button onClick={() => setEdit(true)}>Edit</Button>
                </div>
                <div className='bg-card border rounded-lg p-6'>
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
            )}
          </>
        ) : selectedGroupId && loadingGroup ? (
          <div className='space-y-4'>
            {Array.from({ length: 4 }).map((_, idx) => (
              <Skeleton key={idx} className='w-full h-32' />
            ))}
          </div>
        ) : (
          !selectedGroupId && (
            <div className='bg-card border rounded-lg p-12 text-center'>
              <p className='text-muted-foreground'>
                Please select a product group above to configure its SEO settings.
              </p>
            </div>
          )
        )}
      </div>
    </>
  )
}

