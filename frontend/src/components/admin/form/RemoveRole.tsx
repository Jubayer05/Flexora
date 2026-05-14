'use client'

import { Button } from '@/components/ui/button'
import { showError } from '@/lib/errMsg'
import { AdminUser } from '@/lib/validations/schemas/admin'
import requests from '@/services/network/http'
import { AlertTriangle } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface RemoveRoleFormProps {
  initialData: AdminUser
  onClose?: () => void
  onSuccess?: () => void
}

const RemoveRoleForm = ({ initialData, onClose, onSuccess }: RemoveRoleFormProps) => {
  const [loading, setLoading] = useState(false)

  const handleRemoveRole = async () => {
    setLoading(true)
    try {
      await requests.post(`/admin/roles/remove`, {
        userId: initialData?.id
      })

      toast.success('Admin role removed successfully!')
      onSuccess?.()
      onClose?.()
    } catch (error) {
      showError(error)
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleDeactivateUser = async () => {
    setLoading(true)
    try {
      await requests.put(`/admin/admins/${initialData.id}/status`, {
        isActive: false
      })

      toast.success('Admin deactivated successfully!')
      onSuccess?.()
      onClose?.()
    } catch (error) {
      showError(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='space-y-6'>
      {/* Warning Header */}
      <div className='flex items-center gap-3 bg-amber-500/10 dark:bg-amber-500/20 p-4 border border-amber-500/30 dark:border-amber-400/30 rounded-lg'>
        <AlertTriangle className='w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0' />
        <div>
          <h4 className='font-medium text-amber-800 dark:text-amber-200'>Remove Admin Privileges</h4>
          <p className='text-amber-700 dark:text-amber-300 text-sm'>
            This action will affect the admin&apos;s access to the system.
          </p>
        </div>
      </div>

      {/* Admin Information Display */}
      <div className='space-y-2 bg-muted/50 border border-border p-4 rounded-lg'>
        <h4 className='font-medium text-sm text-foreground'>Admin Information</h4>
        <div className='gap-2 grid grid-cols-1 md:grid-cols-2 text-sm'>
          <div>
            <span className='text-muted-foreground'>Name:</span>
            <span className='ml-2 font-medium text-foreground'>
              {initialData.firstName || 'Admin'}
            </span>
          </div>
          <div>
            <span className='text-muted-foreground'>Email:</span>
            <span className='ml-2 text-foreground'>{initialData.email}</span>
          </div>
          <div>
            <span className='text-muted-foreground'>Current Role:</span>
            <span className='ml-2 font-medium text-primary'>
              {initialData.role.charAt(0).toUpperCase() + initialData.role.slice(1).toLowerCase()}
            </span>
          </div>
          <div>
            <span className='text-muted-foreground'>Status:</span>
            <span
              className={`ml-2 font-medium ${
                initialData.isActive ? 'text-green-600 dark:text-green-400' : 'text-destructive'
              }`}
            >
              {initialData.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>

      {/* Action Options */}
      <div className='space-y-4'>
        <h4 className='font-medium text-sm text-foreground'>Choose an action:</h4>

        {/* Remove Role Option */}
        <div className='space-y-3 p-4 border border-border rounded-lg'>
          <div>
            <h5 className='font-medium text-sm text-foreground'>Remove Assigned Role</h5>
            <p className='text-muted-foreground text-sm'>
              Remove the currently assigned role from this user. The user will lose their role-based
              permissions.
            </p>
          </div>
          <Button variant='destructive' onClick={handleRemoveRole} disabled={loading}>
            {loading ? 'Processing...' : 'Remove Assigned Role'}
          </Button>
        </div>

        {/* Deactivate User Option */}
        {/* <div className='space-y-3 p-4 border border-red-200 rounded-lg'>
          <div>
            <h5 className='font-medium text-red-900 text-sm'>Deactivate Admin</h5>
            <p className='text-red-700 text-sm'>
              Completely deactivate this admin account. They will lose all access to the system.
            </p>
          </div>
          <Button
            variant='destructive'
            onClick={handleDeactivateUser}
            disabled={loading || !initialData.isActive}
            className='w-full'
          >
            {loading ? 'Processing...' : 'Deactivate Admin'}
          </Button>
          {!initialData.isActive && (
            <p className='text-muted-foreground text-sm'>User is already deactivated.</p>
          )}
        </div> */}
      </div>

      {/* Form Actions */}
      <div className='flex justify-end gap-3 pt-4'>
        <Button
          type='button'
          variant='outline'
          className='border-destructive/50 text-destructive hover:bg-destructive/10'
          onClick={onClose}
        >
          Not Now
        </Button>
      </div>
    </div>
  )
}

export default RemoveRoleForm
