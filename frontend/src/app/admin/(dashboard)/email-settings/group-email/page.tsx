'use client'

import GroupEmailForm from '@/components/admin/form/settings/GroupEmail'
import PageHeader from '@/components/common/PageHeader'
import { Suspense } from 'react'

function GroupEmail() {
  return (
    <div className='w-full max-w-full overflow-x-hidden'>
      {/* Header */}
      <PageHeader
        title='Send Group Email'
        subTitle='Send styled emails to selected user groups using the editor below.'
      />

      <div className=''>
        <GroupEmailForm />
      </div>
    </div>
  )
}

export default function GroupEmailPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <GroupEmail />
    </Suspense>
  )
}
