'use client'

import * as React from 'react'

export interface TableColumn<T = any> {
  key: string
  header: string | React.ReactNode
  render?: (value: any, data: T, index: number) => React.ReactNode
  width?: string
  className?: string
}

interface CustomTableProps<T> {
  columns: TableColumn<T>[]
  data: T[]
  emptyMessage?: string | React.ReactNode
  className?: string
  getRowId?: (data: T, index: number) => string | number
}

export function CustomTable<T>({
  columns,
  data,
  emptyMessage = 'No results.',
  className = '',
  getRowId = (data: any, index: number) => data.id ?? index
}: CustomTableProps<T>) {
  // Get cell value directly from data using column key
  const getCellValue = (data: T, column: TableColumn<T>) => {
    return (data as any)[column.key]
  }

  // Render cell content
  const renderCell = (column: TableColumn<T>, data: T, index: number) => {
    const value = getCellValue(data, column)

    if (column.render) {
      return column.render(value, data, index)
    }

    return value
  }

  return (
    <div className={`w-full min-w-0 ${className}`}>
      {/* Table Container - theme-aware */}
      <div className='rounded-lg w-full overflow-hidden border border-border bg-card'>
        <div className='overflow-x-auto custom-scrollbar min-w-0'>
          <table className='w-full'>
            <thead>
              <tr>
                {columns.map((column, idx) => (
                  <th
                    key={idx}
                    className={`
                      px-2.5 py-2.5 text-left text-sm font-normal text-foreground whitespace-nowrap font-manrope
                      border-y-2 border-border
                      ${column.className || ''}
                    `}
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data?.length > 0 ? (
                data?.map((item, rowIndex) => (
                  <tr key={getRowId(item, rowIndex)} className='group'>
                    {columns.map((column, idx) => (
                      <td
                        key={idx}
                        className={`px-2.5 py-2.5 text-sm text-foreground whitespace-nowrap font-manrope border-b border-border ${
                          column.className || ''
                        }`}
                      >
                        <div className='min-w-0'>{renderCell(column, item, rowIndex)}</div>
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={columns.length}
                    className='px-4 py-8 text-muted-foreground text-sm'
                    style={{
                      fontFamily: 'Manrope',
                      fontSize: '14px'
                    }}
                  >
                    {emptyMessage}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
