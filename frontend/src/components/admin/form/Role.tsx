'use client'

import CustomInput from '@/components/common/CustomInput'
import { CustomSelect } from '@/components/common/CustomSelect'
import { Button } from '@/components/ui/button'
import { CardTitle } from '@/components/ui/card'
import useAsync from '@/hooks/useAsync'
import { showError } from '@/lib/errMsg'
import { cn } from '@/lib/utils'
import {
  CreateRoleSchema,
  CreateRoleType,
  PermissionAction,
  Resource
} from '@/lib/validations/schemas/role'
import requests from '@/services/network/http'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { Controller, SubmitHandler, useForm } from 'react-hook-form'
import { toast } from 'sonner'

interface RoleFormProps {
  initialData?: Role | null
  onClose?: () => void
  onSuccess?: () => void
}

const RoleForm = ({ initialData, onClose, onSuccess }: RoleFormProps) => {
  const [loading, setLoading] = useState(false)

  const { data: resourcesData } = useAsync(() => '/admin/roles/resources')
  const { data: actionsData } = useAsync(() => '/admin/roles/actions')

  const {
    watch,
    control,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm<CreateRoleType>({
    resolver: zodResolver(CreateRoleSchema),
    mode: 'onSubmit',
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      permissions:
        initialData?.permissions?.map((perm) => ({
          resource: perm.resource as Resource,
          actions: perm.actions as PermissionAction[]
        })) || []
    }
  })

  const watchedPermissions = watch('permissions')

  // Available resources and actions
  const availableResources = resourcesData?.data?.resources || []
  const availableActions = actionsData?.data?.actions || []

  // Create action options for CustomSelect
  const actionOptions = availableActions.map((action: string) => ({
    value: action,
    label: action.charAt(0).toUpperCase() + action.slice(1).toLowerCase().replace('_', ' ')
  }))

  // Helper function to get actions for a specific resource
  const getResourceActions = (resource: string): string[] => {
    const permission = watchedPermissions?.find((p: any) => p.resource === resource)
    return permission?.actions || []
  }

  // Helper function to handle resource actions change
  const handleResourceActionsChange = (resource: string, actions: string[]) => {
    const currentPermissions = watchedPermissions || []
    const existingPermissionIndex = currentPermissions.findIndex(
      (p: any) => p.resource === resource
    )

    if (actions.length === 0) {
      // Remove permission if no actions selected
      if (existingPermissionIndex !== -1) {
        const newPermissions = currentPermissions.filter(
          (_: any, index: number) => index !== existingPermissionIndex
        )
        setValue('permissions', newPermissions)
      }
    } else {
      // Add or update permission
      const newPermission = {
        resource: resource as Resource,
        actions: actions as PermissionAction[]
      }

      if (existingPermissionIndex !== -1) {
        // Update existing permission
        const newPermissions = [...currentPermissions]
        newPermissions[existingPermissionIndex] = newPermission
        setValue('permissions', newPermissions)
      } else {
        // Add new permission
        setValue('permissions', [...currentPermissions, newPermission])
      }
    }
  }

  // Global permission stats
  const globalPermissionStates = useMemo(() => {
    const totalPossibleActions = availableActions.length * availableResources.length
    const selectedActions =
      watchedPermissions?.reduce((sum: number, perm: any) => sum + perm.actions.length, 0) || 0

    return {
      selectedActions,
      totalPossibleActions,
      hasAnySelections: selectedActions > 0
    }
  }, [watchedPermissions, availableActions.length, availableResources.length])

  const onSubmit: SubmitHandler<CreateRoleType> = async (data) => {
    setLoading(true)
    try {
      const endpoint = initialData?.id ? 'put' : 'post'
      const url = '/admin/roles' + (initialData?.id ? `/${initialData.id}` : '')
      await requests[endpoint](url, {
        ...data,
        ...(initialData?.id ? { id: initialData.id } : {})
      })

      toast.success(`Role ${initialData?.id ? 'updated' : 'created'} successfully!`)

      onSuccess?.()
      onClose?.()
    } catch (error) {
      showError(error)
    } finally {
      setLoading(false)
    }
  }

  if (!resourcesData?.data?.resources || !actionsData?.data?.actions) {
    return (
      <div className='flex items-center justify-center py-8 text-muted-foreground'>
        Loading...
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
      {/* Basic Information */}
      <div className='space-y-4'>
        <Controller
          name='name'
          control={control}
          render={({ field }) => (
            <CustomInput
              label='Role Name'
              placeholder='Enter role name'
              error={errors.name?.message}
              {...field}
            />
          )}
        />

        <Controller
          name='description'
          control={control}
          render={({ field }) => (
            <CustomInput
              label='Description'
              placeholder='Enter role description'
              error={errors.description?.message}
              {...field}
            />
          )}
        />
      </div>

      {/* Permissions Section */}
      <div className='space-y-4'>
        <div>
          <div className='flex justify-between items-center gap-6'>
            <CardTitle className='text-lg'>Resource Permissions</CardTitle>
            <div className='flex items-center space-x-2'>
              <span className='text-muted-foreground text-sm'>
                Total Actions Selected: {globalPermissionStates.selectedActions}/
                {globalPermissionStates.totalPossibleActions}
              </span>
            </div>
          </div>
          <p className='mt-1 text-muted-foreground text-sm'>
            Select specific actions for each resource. Choose multiple actions per resource as
            needed.
          </p>

          {/* Display permissions validation errors */}
          {errors.permissions && (
            <div className='bg-destructive/10 mt-3 p-3 border border-destructive/30 rounded-md'>
              <h4 className='mb-2 font-medium text-destructive text-sm'>
                Permissions Validation Errors:
              </h4>
              <div className='space-y-2 max-h-56 overflow-x-hidden overflow-y-auto'>
                {Array.isArray(errors.permissions) &&
                  errors.permissions.map((permError, index) => (
                    <div key={index} className='text-destructive text-sm'>
                      <span className='font-medium'>Permission {index + 1}:</span>
                      <ul className='space-y-1 mt-1 ml-4'>
                        {permError?.resource && (
                          <li className='max-w-sm text-wrap whitespace-break-spaces'>
                            <p>• Resource: {permError.resource.message?.replace('|', ' | ')}</p>
                          </li>
                        )}
                        {permError?.actions && Array.isArray(permError.actions) && (
                          <li>
                            • Actions:
                            <ul className='mt-1 ml-4'>
                              {permError.actions.map((actionError: any, actionIndex: number) =>
                                actionError ? (
                                  <li key={actionIndex}>
                                    Action {actionIndex + 1}:{' '}
                                    {actionError.message?.replace('|', ' | ')}
                                  </li>
                                ) : null
                              )}
                            </ul>
                          </li>
                        )}
                      </ul>
                    </div>
                  ))}
                {typeof errors.permissions === 'object' && !Array.isArray(errors.permissions) && (
                  <div className='text-destructive text-sm'>
                    {errors.permissions.message || 'Invalid permissions structure'}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className='space-y-4'>
          <div className='border border-border rounded-lg overflow-hidden'>
            {/* Header */}
            <div className='bg-muted/80 p-4 border-b border-border font-semibold'>
              <div className='flex justify-between items-center'>
                <span className='text-foreground'>Resource Permissions</span>
                <span className='text-muted-foreground text-sm'>
                  {availableResources.length} resources available
                </span>
              </div>
            </div>

            {/* Resources List */}
            <div className='divide-y divide-border'>
              {availableResources.map((resource: string, resourceIndex: number) => {
                const selectedActions = getResourceActions(resource)
                const resourceErrors = Array.isArray(errors.permissions)
                  ? errors.permissions[resourceIndex]
                  : null

                return (
                  <div
                    key={resource}
                    className={cn(
                      'p-4 border-transparent border-l-2 transition-colors hover:bg-accent/50',
                      {
                        'bg-destructive/10 border-l-destructive': resourceErrors?.resource,
                        'bg-primary/5 border-l-primary':
                          selectedActions.length > 0 && !resourceErrors?.resource
                      }
                    )}
                  >
                    <div className='space-y-3'>
                      {/* Resource Name */}
                      <div className='flex justify-between items-center'>
                        <div className='flex items-center space-x-3'>
                          <h4 className='font-medium text-sm capitalize'>
                            {resource.toLowerCase().replace('_', ' ')}
                          </h4>

                          {/* Status Badges */}
                          {selectedActions.length > 0 && !resourceErrors?.resource && (
                            <span className='inline-flex items-center bg-primary/20 px-2 py-0.5 rounded-full font-medium text-primary text-xs'>
                              {selectedActions.length} action
                              {selectedActions.length !== 1 ? 's' : ''} selected
                            </span>
                          )}

                          {resourceErrors?.resource && (
                            <span
                              className='inline-flex items-center bg-destructive/20 px-2 py-0.5 rounded-full font-medium text-destructive text-xs'
                              title={resourceErrors.resource.message}
                            >
                              Invalid Resource
                            </span>
                          )}
                        </div>

                        {/* Quick Actions */}
                        <div className='flex items-center space-x-2'>
                          <button
                            type='button'
                            onClick={() =>
                              handleResourceActionsChange(resource, [...availableActions])
                            }
                            className='font-medium text-xs cursor-pointer text-primary hover:text-primary/80 hover:underline transition-colors'
                          >
                            Select All
                          </button>
                          <button
                            type='button'
                            onClick={() => handleResourceActionsChange(resource, [])}
                            className='font-medium text-xs cursor-pointer text-muted-foreground hover:text-foreground hover:underline transition-colors'
                          >
                            Clear All
                          </button>
                        </div>
                      </div>

                      {/* Actions Selector */}
                      <div>
                        <CustomSelect
                          staticOptions={actionOptions}
                          multiple={true}
                          showSearch={false}
                          value={selectedActions}
                          onChange={(values: string[]) => {
                            handleResourceActionsChange(resource, values)
                          }}
                          placeholder={`Select actions for ${resource
                            .toLowerCase()
                            .replace('_', ' ')}`}
                          className={resourceErrors?.actions ? 'border-destructive' : ''}
                        />

                        {resourceErrors?.actions && (
                          <p className='mt-1 text-destructive text-xs'>
                            Invalid actions selected for this resource
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {!globalPermissionStates.hasAnySelections && (
            <p className='text-destructive text-sm'>
              Please select at least one action for one resource.
            </p>
          )}
        </div>
      </div>

      {/* Form Actions */}
      <div className='flex gap-3 pt-4'>
        <Button type='submit' disabled={loading}>
          {loading
            ? initialData?.id
              ? 'Updating...'
              : 'Creating...'
            : initialData?.id
            ? 'Update Role'
            : 'Create Role'}
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

export default RoleForm
