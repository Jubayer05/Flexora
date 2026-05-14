'use client'

import MainNavForm from '@/components/admin/form/settings/MainNavForm'
import PageHeader from '@/components/common/PageHeader'

export default function CreatePage() {
  return (
    <>
      <PageHeader title='Create Page' subTitle='Add a new static page to your site' />
      <div className='pt-6'>
        <MainNavForm location='HEADER' />
      </div>
    </>
  )
}
