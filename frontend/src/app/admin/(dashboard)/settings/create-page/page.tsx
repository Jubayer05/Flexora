'use client'

import CreatePageForm from '@/components/admin/form/settings/CreatePageForm'
import PageHeader from '@/components/common/PageHeader'

export default function CreatePagePage() {
  return (
    <>
      <PageHeader
        title='Create New Page'
        subTitle='Add a new custom page with meta information for SEO management.'
      />
      <div className='pt-6'>
        <CreatePageForm />
      </div>
    </>
  )
}


