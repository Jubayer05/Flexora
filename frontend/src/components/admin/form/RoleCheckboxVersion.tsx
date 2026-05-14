'use client'

import CustomInput from '@/components/common/CustomInput'
import { Button } from '@/components/ui/button'
import { CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Controller, SubmitHandler, useForm } from 'react-hook-form'
import { toast } from 'sonner'

// Custom IndeterminateCheckbox component
const IndeterminateCheckbox = ({
  checked,
  indeterminate,
  onChange,
  id,
  className = '',
  ...props
}: {
  checked: boolean
  indeterminate: boolean
  onChange: (checked: boolean) => void
  id: string
  className?: string
  [key: string]: any
}) => {
  const checkboxRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = indeterminate
    }
  }, [indeterminate])

  return (
    <div className='inline-flex relative items-center'>
      <input
        ref={checkboxRef}
        type='checkbox'
        id={id}
        checked={checked && !indeterminate}
        onChange={(e) => onChange(e.target.checked)}
        className={`
          w-4 h-4 rounded border-2 border-primary bg-background transition-all
          text-primary focus:ring-2 focus:ring-primary/20 focus:ring-offset-1
          disabled:cursor-not-allowed disabled:opacity-50
          ${indeterminate ? 'bg-primary border-primary' : ''}
          ${checked && !indeterminate ? 'bg-primary border-primary' : ''}
          ${className}
        `}
        {...props}
      />
      {indeterminate && (
        <div className='absolute inset-0 flex justify-center items-center pointer-events-none'>
          <div className='bg-primary-foreground rounded-sm w-2 h-0.5' />
        </div>
      )}
      {checked && !indeterminate && (
        <div className='absolute inset-0 flex justify-center items-center pointer-events-none'>
          <svg className='w-3 h-3 text-primary-foreground' fill='currentColor' viewBox='0 0 20 20'>
            <path
              fillRule='evenodd'
              d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
              clipRule='evenodd'
            />
          </svg>
        </div>
      )}
    </div>
  )
}

interface RoleFormProps {
  initialData?: Role | null
  onClose?: () => void
  onSuccess?: () => void
}

const RoleForm = ({ initialData, onClose, onSuccess }: RoleFormProps) => {
  const [loading, setLoading] = useState(false)
  const [permissions, setPermissions] = useState<Array<{ resource: string; actions: string[] }>>([])

  // Helper function to get actions for a specific resource
  const getResourceActions = useCallback(
    (resource: string): string[] => {
      const resourcePermission = permissions?.find((p) => p.resource === resource)
      return resourcePermission?.actions || []
    },
    [permissions]
  )

  // Helper function to check if a resource has a specific action
  const hasResourceAction = useCallback(
    (resource: string, action: string): boolean => {
      const actions = getResourceActions(resource)
      return actions.includes(action)
    },
    [getResourceActions]
  )

  const { data: resourcesData } = useAsync(() => '/admin/roles/resources')
  const { data: actionsData } = useAsync(() => '/admin/roles/actions')

  // Memoized data for performance optimization
  const availableResources = useMemo(() => resourcesData?.data?.resources || [], [resourcesData])

  const availableActions = useMemo(() => actionsData?.data?.actions || [], [actionsData])

  // Memoized initial permissions transformation
  const initialPermissions = useMemo(() => {
    if (!initialData?.permissions) return []

    return initialData.permissions.map((perm) => ({
      resource: perm.resource,
      actions: perm.actions
    }))
  }, [initialData?.permissions])

  // Initialize permissions from initial data
  useEffect(() => {
    if (initialPermissions.length > 0) {
      setPermissions(initialPermissions)
    }
  }, [initialPermissions])

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
      permissions: []
    }
  })

  const watchedPermissions = watch('permissions')

  // Optimized form permissions sync with debouncing concept
  const syncFormPermissions = useCallback(
    (permissionsState: Array<{ resource: string; actions: string[] }>) => {
      const formPermissions = permissionsState
        .filter(({ actions }) => actions.length > 0)
        .map(({ resource, actions }) => ({
          resource: resource as Resource,
          actions: actions as PermissionAction[]
        }))

      setValue('permissions', formPermissions, {
        shouldValidate: true,
        shouldDirty: true
      })
    },
    [setValue]
  )

  // Update form permissions with optimized dependency tracking
  useEffect(() => {
    syncFormPermissions(permissions)
  }, [permissions, syncFormPermissions])

  // Optimized permission handlers with useCallback
  const handlePermissionChange = useCallback(
    (resource: string, checked: boolean) => {
      setPermissions((prev) => {
        const existingIndex = prev.findIndex((p) => p.resource === resource)

        if (checked) {
          // Select all actions for this resource
          const newEntry = { resource, actions: [...availableActions] }

          if (existingIndex === -1) {
            // Add new resource entry
            return [...prev, newEntry]
          } else {
            // Update existing resource entry
            const newPermissions = [...prev]
            newPermissions[existingIndex] = newEntry
            return newPermissions
          }
        } else {
          // Unselect all actions for this resource
          if (existingIndex !== -1) {
            const newPermissions = [...prev]
            newPermissions.splice(existingIndex, 1)
            return newPermissions
          }
          return prev
        }
      })
    },
    [availableActions]
  )

  const handleActionChange = useCallback((resource: string, action: string, checked: boolean) => {
    setPermissions((prev) => {
      const existingIndex = prev.findIndex((p) => p.resource === resource)

      if (existingIndex === -1) {
        // Resource doesn't exist, create new entry if checked
        if (checked) {
          return [...prev, { resource, actions: [action] }]
        }
        return prev // Nothing to remove if not checked
      }

      // Resource exists, update its actions
      const currentActions = prev[existingIndex].actions
      const newActions = checked
        ? currentActions.includes(action)
          ? currentActions // Already exists, no change needed
          : [...currentActions, action]
        : currentActions.filter((a) => a !== action)

      const newPermissions = [...prev]
      if (newActions.length === 0) {
        // Remove the resource entry if no actions remain
        newPermissions.splice(existingIndex, 1)
      } else {
        // Update the resource entry
        newPermissions[existingIndex] = { resource, actions: newActions }
      }

      return newPermissions
    })
  }, [])

  // Memoized computed values for better performance
  const permissionStates = useMemo(() => {
    const states = availableResources.reduce(
      (
        acc: Record<string, { isChecked: boolean; isIndeterminate: boolean; actionsCount: number }>,
        resource: string
      ) => {
        const resourceActions = getResourceActions(resource)
        const isChecked =
          resourceActions.length === availableActions.length && resourceActions.length > 0
        const isIndeterminate =
          resourceActions.length > 0 && resourceActions.length < availableActions.length

        acc[resource] = { isChecked, isIndeterminate, actionsCount: resourceActions.length }
        return acc
      },
      {}
    )

    return states
  }, [availableResources, availableActions, getResourceActions])

  // Memoized global permission states
  const globalPermissionStates = useMemo(() => {
    const allResourceStates = Object.values(permissionStates) as Array<{
      isChecked: boolean
      isIndeterminate: boolean
      actionsCount: number
    }>
    const totalActions = availableActions.length * availableResources.length
    const selectedActions = allResourceStates.reduce((sum, state) => sum + state.actionsCount, 0)

    const isAllSelected = selectedActions === totalActions && totalActions > 0
    const isAnySelected = selectedActions > 0
    const isIndeterminate = isAnySelected && !isAllSelected

    return { isAllSelected, isAnySelected, isIndeterminate, selectedActions, totalActions }
  }, [permissionStates, availableActions.length, availableResources.length])

  // Optimized select all handler
  const handleSelectAllPermissions = useCallback(
    (checked: boolean) => {
      if (checked) {
        // Select all permissions for all resources
        const newPermissions = availableResources.map((resource: string) => ({
          resource,
          actions: [...availableActions]
        }))
        setPermissions(newPermissions)
      } else {
        // Clear all permissions
        setPermissions([])
      }
    },
    [availableResources, availableActions]
  )

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
            <CardTitle className='text-lg'>Permissions & Actions</CardTitle>
            <div className='flex items-center space-x-2 min-w-24'>
              <IndeterminateCheckbox
                id='select-all-permissions'
                checked={globalPermissionStates.isAllSelected}
                indeterminate={globalPermissionStates.isIndeterminate}
                onChange={handleSelectAllPermissions}
              />
              <label
                htmlFor='select-all-permissions'
                className='font-medium text-sm cursor-pointer'
              >
                Select All
              </label>
              <span className='ml-2 text-muted-foreground text-xs'>
                ({globalPermissionStates.selectedActions}/{globalPermissionStates.totalActions})
              </span>
            </div>
          </div>
          <p className='mt-1 text-muted-foreground text-sm'>
            Select permissions and their specific actions. Check a permission to select all actions,
            or choose individual actions.
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
            <div className='gap-4 grid grid-cols-12 bg-muted/80 p-4 border-b border-border font-semibold text-sm text-foreground'>
              <div className='col-span-3'>Permission</div>
              <div className='col-span-9'>Actions</div>
            </div>

            {/* Permissions Grid */}
            {resourcesData.data.resources.map((resource: string, resourceIndex: number) => {
              // Get validation errors for this specific resource
              const resourceErrors = Array.isArray(errors.permissions)
                ? errors.permissions[resourceIndex]
                : null

              return (
                <div
                  key={resource}
                  className={cn(
                    'flex flex-col items-start gap-4 hover:bg-accent/50 p-4 border-b border-border last:border-b-0 border-l-4 transition-colors',
                    {
                      'bg-primary/5 border-l-primary/50': permissionStates[resource]?.isIndeterminate,
                      'bg-destructive/10 border-l-destructive': resourceErrors?.resource
                    },
                    { 'bg-primary/10 border-l-primary': permissionStates[resource]?.isChecked }
                  )}
                >
                  {/* Permission Column */}
                  <div className='flex items-center space-x-2 pb-2 border-b border-border w-full'>
                    <IndeterminateCheckbox
                      id={`permission-${resource}`}
                      checked={permissionStates[resource]?.isChecked || false}
                      indeterminate={permissionStates[resource]?.isIndeterminate || false}
                      onChange={(checked) => handlePermissionChange(resource, checked)}
                    />
                    <label
                      htmlFor={`permission-${resource}`}
                      className='font-medium text-sm capitalize cursor-pointer'
                    >
                      {resource.toLowerCase().replace('_', ' ')}
                    </label>
                    <span className='ml-2 text-muted-foreground text-xs'>
                      ({permissionStates[resource]?.actionsCount || 0}/{availableActions.length})
                    </span>

                    {/* Resource validation error indicator */}
                    {resourceErrors?.resource && (
                      <span
                        className='inline-flex items-center bg-destructive/20 ml-2 px-2 py-0.5 rounded-full font-medium text-destructive text-xs'
                        title={resourceErrors.resource.message}
                      >
                        Invalid Resource
                      </span>
                    )}

                    {permissionStates[resource]?.isIndeterminate && !resourceErrors?.resource && (
                      <span className='inline-flex items-center bg-amber-500/20 ml-2 px-2 py-0.5 rounded-full font-medium text-amber-600 dark:text-amber-400 text-xs'>
                        Partial
                      </span>
                    )}
                    {permissionStates[resource]?.isChecked &&
                      !permissionStates[resource]?.isIndeterminate &&
                      !resourceErrors?.resource && (
                        <span className='inline-flex items-center bg-primary/20 ml-2 px-2 py-0.5 rounded-full font-medium text-primary text-xs'>
                          All Selected
                        </span>
                      )}
                  </div>

                  {/* Actions Column */}
                  <div className='flex flex-wrap gap-3'>
                    {actionsData.data.actions.map((action: string, actionIndex: number) => {
                      const isChecked = hasResourceAction(resource, action)
                      const actionError = resourceErrors?.actions?.[actionIndex]

                      return (
                        <div key={action} className='flex items-center space-x-2'>
                          <Checkbox
                            id={`${resource}-${action}`}
                            checked={isChecked}
                            onCheckedChange={(checked) =>
                              handleActionChange(resource, action, checked as boolean)
                            }
                            className={actionError ? 'border-destructive' : ''}
                          />
                          <label
                            htmlFor={`${resource}-${action}`}
                            className={cn(
                              'text-sm capitalize cursor-pointer text-foreground',
                              actionError ? 'text-destructive' : ''
                            )}
                            title={actionError ? actionError.message : undefined}
                          >
                            {action.toLowerCase()}
                            {actionError && <span className='ml-1 text-destructive'>*</span>}
                          </label>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {!watchedPermissions?.length && (
            <p className='text-destructive text-sm'>
              Please select at least one permission with actions.
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
