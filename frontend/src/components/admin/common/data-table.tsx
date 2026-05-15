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
  variant?: 'default' | 'dashboard'
}

export function CustomTable<T>({
  columns,
  data,
  emptyMessage = 'No results.',
  className = '',
  getRowId = (data: any, index: number) => data.id ?? index,
  variant = 'default'
}: CustomTableProps<T>) {
  const isDashboard = variant === 'dashboard'
  const getCellValue = (data: T, column: TableColumn<T>) => {
    return (data as any)[column.key]
  }

  const renderCell = (column: TableColumn<T>, data: T, index: number) => {
    const value = getCellValue(data, column)

    if (column.render) {
      return column.render(value, data, index)
    }

    return value
  }

  return (
    <div className={`w-full min-w-0 overflow-hidden rounded-lg border border-outline-variant/60 bg-card ${className}`}>
      <div className='w-full overflow-x-auto'>
        <table className='w-full text-left whitespace-nowrap'>
          <thead
            className={
              isDashboard
                ? 'border-b border-outline-variant/60 bg-muted/30 text-xs font-medium uppercase tracking-wide text-muted-foreground'
                : 'border-b border-outline-variant/60 bg-surface-container/60 text-xs font-semibold uppercase tracking-wider text-on-surface-variant'
            }
          >
            <tr>
              {columns.map((column, idx) => (
                <th
                  key={idx}
                  className={
                    isDashboard
                      ? 'px-4 py-3.5 font-medium'
                      : 'px-4 py-4 font-semibold'
                  }
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody
            className={
              isDashboard
                ? 'divide-y divide-outline-variant/60 text-sm'
                : 'divide-y divide-outline-variant/60 font-body-md text-body-md'
            }
          >
            {data?.length > 0 ? (
              data?.map((item, rowIndex) => (
                <tr
                  key={getRowId(item, rowIndex)}
                  className={
                    isDashboard
                      ? 'transition-colors duration-150 hover:bg-muted/40'
                      : 'table-row-hover transition-colors duration-150'
                  }
                >
                  {columns.map((column, idx) => (
                    <td
                      key={idx}
                      className={
                        isDashboard
                          ? 'px-4 py-4 text-foreground'
                          : 'px-4 py-3.5 text-on-surface'
                      }
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
                  className={
                    isDashboard
                      ? 'px-4 py-12 text-center text-muted-foreground'
                      : 'px-4 py-12 text-center text-on-surface-variant'
                  }
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}