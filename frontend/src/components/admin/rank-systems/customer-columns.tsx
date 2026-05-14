'use client'

import CustomImage from '@/components/common/CustomImage'
import StatusBadge from '@/components/common/StatusBadge'

// Custom table column type
export interface TableColumn<T = any> {
  key: string
  header: string | React.ReactNode
  render?: (value: any, data: T, index: number) => React.ReactNode
  width?: string
  className?: string
}

// Purchase columns function that accepts mutate callback and pagination
export const tierCustomerColumns = (): TableColumn<User>[] => {
  return [
    {
      key: 'name',
      header: 'Name',
      render: (_, record) => (
        <span>
          {record.firstName} {record.lastName}
        </span>
      ),
      width: 'w-40'
    },
    {
      key: 'email',
      header: 'Email',
      render: (value) => <span>{value ?? '-'}</span>,
      width: 'w-56'
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (value) => <StatusBadge status={value ? 'Active' : 'Inactive'} />,
      width: 'w-32'
    },
    {
      key: 'rank',
      header: 'Rank',
      render: (_, record) =>
        typeof record.rank === 'string' ? (
          <span className='font-mono font-normal text-white/80 text-xs'>{record.rank ?? '-'}</span>
        ) : (
          <div className='flex items-center gap-2'>
            <CustomImage
              src={record.rank?.icon || ''}
              alt={record.rank?.name || 'Rank Icon'}
              width={20}
              height={20}
              className='w-5 h-5'
            />
            <span className='font-mono font-normal text-white/80 text-xs'>
              {record.rank?.name ?? '-'}
            </span>
          </div>
        ),
      width: 'w-32'
    }
  ]
}
