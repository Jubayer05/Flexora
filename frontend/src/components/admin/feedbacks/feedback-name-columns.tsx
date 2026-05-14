'use client'

import StatusBadge from '@/components/common/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { showError } from '@/lib/errMsg'
import requests from '@/services/network/http'
import { Check, Edit, Trash, User, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

// Custom table column type
export interface TableColumn<T = any> {
  key: string
  header: string | React.ReactNode
  render?: (value: any, data: T, index: number) => React.ReactNode
  width?: string
  className?: string
}

// Type for fake name data
interface FakeName {
  id: number
  name: string
  status: string
  createdAt: string
}

// Columns for fake names
export const feedbackNameColumns = (
  mutate?: () => void,
  onDelete?: (data: FakeName) => void
): TableColumn<FakeName>[] => {
  return [
    {
      key: 'name',
      header: 'Customer Name',
      render: (value, data) => <EditableNameCell data={data} mutate={mutate} />,
      width: 'w-64'
    },
    {
      key: 'status',
      header: 'Status',
      render: (value, data) => <StatusBadge status={data.status} />,
      width: 'w-64'
    },
    {
      key: 'createdAt',
      header: 'Created At',
      render: (value, data) => (
        <div className='text-sm'>
          {new Date(data.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      ),
      width: 'w-48'
    },
    {
      key: 'action',
      header: 'Action',
      render: (value, data) => <ActionButtons data={data} mutate={mutate} onDelete={onDelete} />,
      width: 'w-64'
    }
  ]
}

// Create a context-like solution using a Map to share state
const editingMap = new Map<number, React.Dispatch<React.SetStateAction<boolean>>>()

// Editable Name Cell Component
function EditableNameCell({ data, mutate }: { data: FakeName; mutate?: () => void }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(data.name)
  const [isSaving, setIsSaving] = useState(false)

  // Register this cell's setIsEditing in the map
  useState(() => {
    editingMap.set(data.id, setIsEditing)
    return () => {
      editingMap.delete(data.id)
    }
  })

  const handleSave = async () => {
    if (!editValue.trim()) {
      toast.error('Name cannot be empty')
      return
    }

    setIsSaving(true)
    try {
      await requests.put(`/admin/fake-names/${data.id}`, { name: editValue })
      toast.success('Name updated successfully')
      setIsEditing(false)
      mutate?.()
    } catch (error) {
      showError(error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditValue(data.name)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className='flex items-center gap-2'>
        <Input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className='max-w-[200px] h-8'
          disabled={isSaving}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave()
            if (e.key === 'Escape') handleCancel()
          }}
        />
        <Button
          size='icon'
          variant='ghost'
          className='w-8 h-8'
          onClick={handleSave}
          disabled={isSaving}
        >
          <Check className='w-4 h-4 text-green-500' />
        </Button>
        <Button
          size='icon'
          variant='ghost'
          className='w-8 h-8'
          onClick={handleCancel}
          disabled={isSaving}
        >
          <X className='w-4 h-4 text-red-500' />
        </Button>
      </div>
    )
  }

  return <div className='font-medium'>{data.name}</div>
}

// Action Buttons Component
function ActionButtons({
  data,
  mutate,
  onDelete
}: {
  data: FakeName
  mutate?: () => void
  onDelete?: (data: FakeName) => void
}) {
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  const handleToggleStatus = async () => {
    setIsUpdatingStatus(true)
    try {
      const newStatus = data.status === 'AVAILABLE' ? 'USED' : 'AVAILABLE'
      await requests.put(`/admin/fake-names/${data.id}`, { status: newStatus })
      toast.success(`Status updated to ${newStatus}`)
      mutate?.()
    } catch (error) {
      showError(error)
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleDelete = () => {
    if (onDelete) {
      onDelete(data)
    }
  }

  const handleEdit = () => {
    editingMap.get(data.id)?.(true)
  }

  return (
    <div className='flex gap-1'>
      <Button variant='ghost' size='icon' onClick={handleEdit} title='Edit Name'>
        <Edit className='w-4 h-4' />
      </Button>
      <Button
        variant='ghost'
        size='icon'
        onClick={handleToggleStatus}
        disabled={isUpdatingStatus}
        title='Toggle Status'
      >
        <User className='w-4 h-4' />
      </Button>
      <Button variant='ghost' size='icon' onClick={handleDelete} title='Delete'>
        <Trash className='w-4 h-4' />
      </Button>
    </div>
  )
}
