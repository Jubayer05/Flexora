'use client'
import FaqForm from '@/components/admin/form/settings/Faq'
import PageHeader from '@/components/common//PageHeader'
import { CopyToClipboard } from '@/components/common/CopyToClipboard'
import RenderData from '@/components/common/RenderData'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import useAsync from '@/hooks/useAsync'
import { FaqSettings } from '@/lib/validations/schemas/faqSettings'
import { useState } from 'react'

export default function FaqConfigPage() {
  const [edit, setEdit] = useState(false)
  const settingsKey = 'faqData'
  const { data, mutate, loading } = useAsync<SettingsData<FaqSettings>>(
    () => `/admin/settings/key/${settingsKey}`,
    true
  )

  const onClose = () => {
    mutate()
    setEdit(false)
  }

  return (
    <>
      <PageHeader
        title='FAQ Settings'
        extra={[
          !edit && data?.data?.value && <CopyToClipboard text={`/page/faq`} />,
          !edit && <Button onClick={() => setEdit(true)}>Edit</Button>
        ]}
      />

      {edit ? (
        <FaqForm settingsKey={settingsKey} initialValues={data?.data?.value} refetch={onClose} />
      ) : loading ? (
        <Skeleton />
      ) : (
        <RenderData data={data?.data?.value ?? {}} />
      )}
    </>
  )
}
