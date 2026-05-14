'use client'

import * as React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export interface TableColumn<T = any> {
  key: string
  header: string | React.ReactNode
  render?: (value: any, data: T, index: number, dragProps?: { attributes: any; listeners: any }) => React.ReactNode
  width?: string
  className?: string
}

interface SortableCategoryTableProps<T> {
  columns: TableColumn<T>[]
  data: T[]
  emptyMessage?: string | React.ReactNode
  className?: string
  getRowId?: (data: T, index: number) => string | number
}

// Sortable row component
function SortableRow<T extends { id: number }>({
  item,
  index,
  columns,
  getRowId
}: {
  item: T
  index: number
  columns: TableColumn<T>[]
  getRowId: (data: T, index: number) => string | number
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    // Prevents browser from intercepting touch events during drag on mobile
    touchAction: 'none' as const
  }

  const getCellValue = (data: T, column: TableColumn<T>) => {
    return (data as any)[column.key]
  }

  const renderCell = (column: TableColumn<T>, data: T, index: number) => {
    const value = getCellValue(data, column)

    // Pass drag listeners to drag handle column
    if (column.key === 'drag' && column.render) {
      return column.render(value, data, index, { attributes, listeners })
    }

    if (column.render) {
      return column.render(value, data, index)
    }

    return value
  }

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`group ${isDragging ? 'bg-muted/50' : ''}`}
    >
      {columns.map((column, idx) => (
        <td
          key={idx}
          className={`px-2.5 py-2.5 text-sm text-foreground whitespace-nowrap font-manrope border-b border-border ${
            column.className || ''
          }`}
        >
          <div className='min-w-0'>{renderCell(column, item, index)}</div>
        </td>
      ))}
    </tr>
  )
}

export function SortableCategoryTable<T extends { id: number }>({
  columns,
  data,
  emptyMessage = 'No results.',
  className = '',
  getRowId = (data: any, index: number) => data.id ?? index
}: SortableCategoryTableProps<T>) {
  return (
    <div className={`w-full ${className}`}>
      {/* Table Container - theme-aware */}
      <div className='rounded-lg w-full overflow-hidden border border-border bg-card'>
        <div className='overflow-x-auto custom-scrollbar'>
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
                  <SortableRow
                    key={getRowId(item, rowIndex)}
                    item={item}
                    index={rowIndex}
                    columns={columns}
                    getRowId={getRowId}
                  />
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
