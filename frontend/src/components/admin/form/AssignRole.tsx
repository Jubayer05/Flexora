'use client'

import { CustomSelect } from '@/components/common/CustomSelect'
import { Button } from '@/components/ui/button'
import { showError } from '@/lib/errMsg'
import { AdminUser } from '@/lib/validations/schemas/admin'
import requests from '@/services/network/http'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, SubmitHandler, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

// Schema for role assignment
const AssignRoleSchema = z.object({
  userId: z.number().min(1),
  roleId: z.number().min(1)
})

type AssignRoleType = z.infer<typeof AssignRoleSchema>

interface AssignRoleFormProps {
  initialData: AdminUser
  onClose?: () => void
  onSuccess?: () => void
}

const AssignRoleForm = ({ initialData, onClose, onSuccess }: AssignRoleFormProps) => {
  const [loading, setLoading] = useState(false)

  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<AssignRoleType>({
    resolver: zodResolver(AssignRoleSchema),
    mode: 'onSubmit',
    defaultValues: {
      userId: initialData?.id || 0,
      roleId: 0
    }
  })

  const onSubmit: SubmitHandler<AssignRoleType> = async (data) => {
    setLoading(true)
    try {
      await requests.post(`/admin/roles/assign`, {
        userId: initialData?.id,
        roleId: Number(data.roleId)
      })

      toast.success('Role assigned successfully!')
      onSuccess?.()
      onClose?.()
    } catch (error) {
      showError(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
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
            <span className='text-muted-foreground'>Current Role (Type):</span>
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

      {/* Role Selection */}
      <Controller
        name='roleId'
        control={control}
        render={({ field }) => (
          <div className='space-y-2'>
            <CustomSelect
              label='New Role'
              placeholder='Select new role'
              url='/admin/roles' // Fetch roles from this endpoint
              value={field.value.toString()}
              onChange={(val) => field.onChange(Number(val))}
              options={(data: any) =>
                data?.data?.roles?.map((item: any) => ({
                  title: item.name,
                  label: item.name,
                  value: item.id.toString()
                }))
              }
            />
            {errors.roleId && <p className='text-destructive text-sm'>{errors.roleId.message}</p>}
          </div>
        )}
      />

      {/* Role Descriptions */}
      <div className='space-y-3 bg-muted/50 border border-border p-4 rounded-lg'>
        <h4 className='font-semibold text-foreground'>Role Descriptions</h4>
        <div className='space-y-2 text-sm text-muted-foreground'>
          <div>
            <span className='font-medium text-foreground'>Admin:</span>
            <span className='ml-2'>
              Full administrative access with all permissions
            </span>
          </div>
          <div>
            <span className='font-medium text-foreground'>Moderator:</span>
            <span className='ml-2'>
              Limited access with specific permissions for content management
            </span>
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className='flex gap-3 pt-4'>
        <Button type='submit' disabled={loading}>
          {loading ? 'Assigning...' : 'Assign Role'}
        </Button>
        <Button type='button' variant='outline' onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

export default AssignRoleForm
