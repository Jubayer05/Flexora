'use client'

import { useState } from 'react'

import SiteConfiguration from '@/components/admin/form/settings/SiteConfiguration'
import { EmptyState } from '@/components/common/EmptyState'
import PageHeader from '@/components/common/PageHeader'
import RenderData from '@/components/common/RenderData'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import useAsync from '@/hooks/useAsync'
import { SiteSettings } from '@/lib/validations/schemas/siteSettings'

type KeyValueListProps = {
  data: Record<string, any>
}

// Color Component
const KeyValueList = ({ data }: KeyValueListProps) => {
  return (
    <Card title='Color Codes'>
      <CardHeader>
        <CardTitle>Color Codes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='gap-y-3 lg:gap-x-10 grid grid-cols-none xl:grid-cols-2 w-full xl:min-w-lg'>
          {Object.entries(data).map(([key, value]) => {
            const isColor = typeof value === 'string' // && /^#([0-9a-f]{3}){1,2}$/i.test(value)

            return (
              <div key={key} className='flex items-center gap-2'>
                <div className='min-w-20 font-medium text-xs capitalize'>
                  {key?.replace('_', ' ').toUpperCase()}
                </div>
                <span>:</span>

                {isColor ? (
                  <>
                    <div
                      className='rounded ring-1 ring-gray-300 min-w-6 size-6'
                      style={{ backgroundColor: value }}
                    />
                    <Badge variant='secondary'>{value}</Badge>
                  </>
                ) : (
                  <div>{String(value)}</div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// Main component
export default function SiteConfigPage() {
  const [edit, setEdit] = useState(false)
  const settingsKey = 'system_site_settings'
  const { data, mutate, loading } = useAsync<SettingsData<SiteSettings>>(
    () => `/admin/settings/key/${settingsKey}`,
    true
  )
  const siteConfig = data?.data?.value ?? undefined
  const onClose = () => {
    mutate()
    setEdit(false)
  }

  return (
    <>
      <PageHeader
        title='Site Configuration'
        subTitle='Manage your site settings'
        extra={
          siteConfig && (
            <Button variant={edit ? 'destructive' : 'default'} onClick={() => setEdit(!edit)}>
              {edit ? 'Cancel' : 'Edit'}
            </Button>
          )
        }
      />

      {!siteConfig || edit ? (
        <SiteConfiguration settingsKey={settingsKey} initialValues={siteConfig} refetch={onClose} />
      ) : loading ? (
        Array.from({ length: 2 }).map((_, idx) => <Skeleton className='my-8' key={idx} />)
      ) : siteConfig ? (
        <div className='space-y-10!'>
          <div className='flex lg:flex-row flex-col gap-3 lg:gap-6'>
            {(siteConfig?.theme as any)?.color && (
              <KeyValueList data={(siteConfig?.theme as any).color} />
            )}
          </div>

          <RenderData
            title='Site Info'
            data={siteConfig}
            excludedFields={['logo', 'favicon', 'seo', 'header', 'footer']}
          />

          <RenderData title='Footer Info' data={siteConfig.footer ?? {}} />
        </div>
      ) : (
        <EmptyState />
      )}
    </>
  )
}
