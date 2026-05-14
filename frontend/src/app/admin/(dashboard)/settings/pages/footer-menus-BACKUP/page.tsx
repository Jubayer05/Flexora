'use client'

import PageForm from '@/components/admin/form/settings/PageForm'
import { Skeleton } from '@/components/ui/skeleton'
import useAsync from '@/hooks/useAsync'

export default function DynamicDataPage() {
  // const params = useParams()
  // const rawMenuKey = params.menuKey
  // const menuKey = convertMenuKey(rawMenuKey)

  const menuKey = 'footer_menus'

  // Fetch existing settings
  const { data, mutate, loading } = useAsync<{ data: any }>(
    () => `/admin/settings/key/${menuKey}`,
    true
  )
  const pageData = (data?.data as any)?.key === menuKey ? (data?.data as any).value : { pages: [] }

  const onClose = () => {
    mutate()
  }

  return (
    <>
      {loading ? (
        Array.from({ length: 2 }).map((_, idx) => <Skeleton className='my-8' key={idx} />)
      ) : menuKey ? (
        <PageForm initialValues={pageData} refetch={onClose} menuKey={menuKey as string} />
      ) : null}
    </>
  )
}
