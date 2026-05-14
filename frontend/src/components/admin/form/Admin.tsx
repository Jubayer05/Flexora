'use client'

import CustomInput from '@/components/common/CustomInput'
import { CustomSelect } from '@/components/common/CustomSelect'
import { Button } from '@/components/ui/button'
import { showError } from '@/lib/errMsg'
import {
  AdminRole,
  AdminUser,
  CreateAdminSchema,
  CreateAdminType
} from '@/lib/validations/schemas/admin'
import requests from '@/services/network/http'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, SubmitHandler, useForm } from 'react-hook-form'
import { toast } from 'sonner'

// Role option from API for dropdown
interface RoleOption {
  id: number
  name: string
  description?: string | null
  permissions?: { resource: string; actions: string[] }[]
}

interface AdminFormProps {
  initialData?: AdminUser | null
  onClose?: () => void
  onSuccess?: () => void
}

const AdminForm = ({ initialData, onClose, onSuccess }: AdminFormProps) => {
  const [loading, setLoading] = useState(false)

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<CreateAdminType>({
    resolver: zodResolver(CreateAdminSchema),
    mode: 'onSubmit',
    defaultValues: {
      email: initialData?.email || '',
      firstName: initialData?.firstName || '',
      role: initialData?.role || AdminRole.ADMIN,
      roleId: initialData?.roleId ?? initialData?.customRole?.id
    }
  })

  const role = watch('role')
  const roleId = watch('roleId')

  // Unified value for role select: "ADMIN" or roleId string
  const roleSelectionValue =
    role === AdminRole.ADMIN ? 'ADMIN' : roleId != null ? String(roleId) : ''

  const onSubmit: SubmitHandler<CreateAdminType> = async (data) => {
    setLoading(true)
    try {
      const url = `/admin` + (initialData?.id ? `/admins/${initialData?.id}` : '/create')

      const payload: Record<string, unknown> = {
        ...data,
        ...(initialData?.id ? { id: initialData.id } : {})
      }
      // Omit roleId when role is ADMIN; backend sets roleId null for ADMIN
      if (data.role === AdminRole.ADMIN) {
        delete payload.roleId
      }
      // When updating, send only fields backend accepts (role/roleId included for update)
      if (initialData?.id) {
        const updatePayload: Record<string, unknown> = {
          firstName: payload.firstName,
          role: payload.role,
          ...(payload.role === AdminRole.MODERATOR && payload.roleId != null && { roleId: payload.roleId }),
          ...(payload.role === AdminRole.ADMIN && { roleId: null })
        }
        if (payload.phone !== undefined) updatePayload.phone = payload.phone
        if (payload.telegramUsername !== undefined) updatePayload.telegramUsername = payload.telegramUsername
        await requests.put(url, updatePayload)
      } else {
        await requests.post(url, payload)
      }

      toast.success(`Admin ${initialData?.id ? 'updated' : 'created'} successfully!`)

      // Call success callback to refresh parent data
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
      {/* Basic Information */}
      <div className='flex flex-wrap [&>*]:flex-1 gap-4 [&>*]:min-w-[45%]'>
        <Controller
          name='firstName'
          control={control}
          render={({ field }) => (
            <CustomInput
              label='First Name'
              placeholder='Enter first name'
              error={errors.firstName?.message}
              {...field}
            />
          )}
        />

        {!initialData?.id && (
          <>
            <Controller
              name='email'
              control={control}
              render={({ field }) => (
                <CustomInput
                  label='Email'
                  placeholder='Enter email address'
                  type='email'
                  error={errors.email?.message}
                  {...field}
                />
              )}
            />

            <Controller
              name='password'
              control={control}
              render={({ field }) => (
                <CustomInput
                  label='Password'
                  placeholder='Enter password'
                  type='password'
                  error={errors.password?.message}
                  {...field}
                />
              )}
            />
          </>
        )}

        {/* Role Selection - Admin + all custom roles from DB (create and edit) */}
        <Controller
          name='role'
          control={control}
          render={() => (
            <div className='space-y-2'>
              <CustomSelect
                label='Role'
                placeholder='Select role'
                url='/admin/roles'
                value={roleSelectionValue}
                onChange={(val: string) => {
                  if (val === 'ADMIN') {
                    setValue('role', AdminRole.ADMIN)
                    setValue('roleId', undefined)
                  } else {
                    const id = Number(val)
                    if (!isNaN(id)) {
                      setValue('role', AdminRole.MODERATOR)
                      setValue('roleId', id)
                    }
                  }
                }}
                options={(data: { data?: { roles?: RoleOption[] } }) => {
                  const dbRoles = data?.data?.roles ?? []
                  return [
                    {
                      title: 'Admin',
                      label: 'Admin — Full access',
                      value: 'ADMIN'
                    },
                    ...dbRoles.map((r: RoleOption) => ({
                      title: r.name,
                      label: r.description
                        ? `${r.name} — ${r.description} (${r.permissions?.length ?? 0} permissions)`
                        : `${r.name} (${r.permissions?.length ?? 0} permissions)`,
                      value: String(r.id)
                    }))
                  ]
                }}
              />
              {(errors.role ?? errors.roleId) && (
                <p className='text-destructive text-sm'>
                  {(errors.role ?? errors.roleId)?.message}
                </p>
              )}
            </div>
          )}
        />
      </div>

      {/* Form Actions */}
      <div className='flex gap-3 pt-4'>
        <Button type='submit' disabled={loading}>
          {loading
            ? initialData?.id
              ? 'Updating...'
              : 'Creating...'
            : initialData?.id
            ? 'Update Admin'
            : 'Create Admin'}
        </Button>
        <Button
          type='button'
          variant='outline'
          onClick={() => {
            onClose?.()
          }}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}

export default AdminForm
