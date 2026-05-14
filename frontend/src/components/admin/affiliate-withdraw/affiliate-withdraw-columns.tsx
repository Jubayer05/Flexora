'use client'

import StatusBadge from '@/components/common/StatusBadge'
import { Switch } from '@/components/ui/switch'

// Custom table column type
export interface TableColumn<T = any> {
  key: string
  header: string | React.ReactNode
  render?: (value: any, data: T, index: number) => React.ReactNode
  width?: string
  className?: string
}

// Purchase columns function that accepts mutate callback and pagination
export const affiliateWithdrawColumns = (): TableColumn<any>[] => {
  return [
    {
      key: 'Wallet',
      header: 'Wallet',
      render: (value) => <span>{value ?? '-'}</span>,
      width: 'w-40'
    },
    {
      key: 'currency',
      header: 'Currency',
      render: (value) => <span>{value ?? '-'}</span>,
      width: 'w-56'
    },
    {
      key: 'message',
      header: 'Message',
      render: (value) => <span>{value ?? '-'}</span>,
      width: 'w-56'
    },
    {
      key: 'status',
      header: 'Status',
      render: (value) => (
        <div className='flex items-center gap-3'>
          <StatusBadge status={value} />
          <Switch
            id='status'
            checked={value?.toUpperCase() === 'PAID'}
            onCheckedChange={(val) => console.log('object >> ', val)}
          />
        </div>
      ),
      width: 'w-32'
    }
  ]
}
