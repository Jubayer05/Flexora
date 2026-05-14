'use client'

import { Suspense } from 'react'

import { CustomTable } from '@/components/admin/common/data-table'
import { telegramSessionColumns } from '@/components/admin/telegram/telegram-session-columns'
import PageHeader from '@/components/common/PageHeader'
import useAsync from '@/hooks/useAsync'

function TelegramSessionList() {
  const { data, loading, mutate } = useAsync<SessionListResponse>(
    () => '/admin/telegram-sessions/sessions'
  )

  return (
    <div className='w-full max-w-full overflow-x-hidden'>
      {/* Header */}
      <PageHeader title='Telegram Sessions' subTitle='Manage active Telegram session files' />

      {/* Table */}
      <CustomTable
        columns={telegramSessionColumns(mutate)}
        data={data?.sessions ?? []}
        getRowId={(row: SessionListResponse['sessions'][0]) =>
          Math.abs(row.phone_number.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0))
        }
        emptyMessage={loading ? 'Loading telegram sessions...' : 'No telegram sessions found.'}
        className={loading ? 'opacity-50 pointer-events-none' : ''}
      />

      {/* Total Count */}
      {data?.total !== undefined && (
        <div className='mt-4 text-sm text-muted-foreground'>
          Total Sessions: <span className='font-medium'>{data.total}</span>
        </div>
      )}
    </div>
  )
}

export default function ManageSessionsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TelegramSessionList />
    </Suspense>
  )
}
