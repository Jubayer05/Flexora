'use client'

import CustomInput from '@/components/common/CustomInput'
import { CustomSelect } from '@/components/common/CustomSelect'
import { Button } from '@/components/ui/button'
import { showError } from '@/lib/errMsg'
import { CreateTicketSchema, UpdateTicketSchema } from '@/lib/validations/schemas/ticket'
import requests from '@/services/network/http'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

interface TicketFormProps {
  initialValues?: any | null
  onClose?: () => void
  onSuccess?: () => void
}

const TicketForm = ({ initialValues, onClose, onSuccess }: TicketFormProps) => {
  const [loading, setLoading] = useState(false)
  const isEditing = Boolean(initialValues)

  // Use appropriate schema based on whether we're creating or updating
  const schema = isEditing ? UpdateTicketSchema : CreateTicketSchema

  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      subject: initialValues?.subject || '',
      description: initialValues?.description || '',
      priority: initialValues?.priority || 'MEDIUM',
      status: initialValues?.status || 'OPEN',
      userId: initialValues?.userId || '',
      assignedToId: initialValues?.assignedToId || '',
      meta: {
        category: initialValues?.meta?.category || 'general',
        source: initialValues?.meta?.source || 'admin_panel',
        tags: initialValues?.meta?.tags || [],
        attachments: initialValues?.meta?.attachments || [],
        internalNotes: initialValues?.meta?.internalNotes || '',
        estimatedResolutionTime: initialValues?.meta?.estimatedResolutionTime || '',
        assignedDepartment: initialValues?.meta?.assignedDepartment || ''
      }
    }
  })

  const onSubmit = async (data: any) => {
    setLoading(true)
    try {
      const formData = {
        ...data,
        userId: parseInt(data.userId),
        assignedToId: data.assignedToId ? parseInt(data.assignedToId) : null,
        meta: {
          ...data.meta,
          estimatedResolutionTime: data.meta.estimatedResolutionTime
            ? parseInt(data.meta.estimatedResolutionTime)
            : undefined
        }
      }

      if (isEditing) {
        await requests.put(`/admin/tickets/${initialValues?.id}`, formData)
        toast.success('Ticket updated successfully!')
      } else {
        await requests.post('/admin/tickets', formData)
        toast.success('Ticket created successfully!')
      }

      onSuccess?.()
      onClose?.()
    } catch (error) {
      setLoading(false)
      showError(error)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
      <div className='space-y-4 pt-2'>
        {/* Basic Information */}
        <div className='gap-4 grid grid-cols-1 sm:grid-cols-2'>
          {/* Subject Field */}
          <Controller
            name='subject'
            control={control}
            render={({ field }) => (
              <CustomInput
                label='Subject'
                {...field}
                placeholder='Enter ticket subject'
                error={errors.subject?.message}
                required
              />
            )}
          />

          {/* Priority Field */}
          <Controller
            name='priority'
            control={control}
            render={({ field }) => (
              <div>
                <label className='block peer-disabled:opacity-70 mb-2 font-medium text-sm leading-none peer-disabled:cursor-not-allowed'>
                  Priority <span className='text-destructive'>*</span>
                </label>
                <CustomSelect
                  staticOptions={[
                    { title: 'Low', value: 'LOW' },
                    { title: 'Medium', value: 'MEDIUM' },
                    { title: 'High', value: 'HIGH' },
                    { title: 'Urgent', value: 'URGENT' }
                  ]}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder='Select priority'
                />
                {errors.priority && (
                  <p className='mt-1 text-destructive text-sm'>{errors.priority.message}</p>
                )}
              </div>
            )}
          />
        </div>

        {/* Description Field */}
        <Controller
          name='description'
          control={control}
          render={({ field }) => (
            <CustomInput
              label='Description'
              type='textarea'
              {...field}
              placeholder='Enter detailed description of the issue'
              error={errors.description?.message}
              required
            />
          )}
        />

        {/* User Assignment */}
        <div className='gap-4 grid grid-cols-1 sm:grid-cols-2'>
          {/* User ID Field */}
          <Controller
            name='userId'
            control={control}
            render={({ field }) => (
              <div>
                <label className='block peer-disabled:opacity-70 mb-2 font-medium text-sm leading-none peer-disabled:cursor-not-allowed'>
                  User <span className='text-destructive'>*</span>
                </label>
                <CustomSelect
                  url='/admin/users'
                  options={(data) =>
                    data?.data?.users?.map((user: any) => ({
                      label: `${user.name} (${user.email})`,
                      value: user.id.toString()
                    })) || []
                  }
                  showSearch={true}
                  searchMode='server'
                  value={field.value?.toString()}
                  onChange={(value: string) => field.onChange(value)}
                  placeholder='Select user'
                />
                {errors.userId && (
                  <p className='mt-1 text-destructive text-sm'>{errors.userId.message}</p>
                )}
              </div>
            )}
          />

          {/* Assigned To Field */}
          <Controller
            name='assignedToId'
            control={control}
            render={({ field }) => (
              <div>
                <label className='block peer-disabled:opacity-70 mb-2 font-medium text-sm leading-none peer-disabled:cursor-not-allowed'>
                  Assigned To
                </label>
                <CustomSelect
                  url='/admin/staff'
                  options={(data) =>
                    data?.data?.staff?.map((staff: any) => ({
                      label: `${staff.name} (${staff.role})`,
                      value: staff.id.toString()
                    })) || []
                  }
                  showSearch={true}
                  searchMode='server'
                  value={field.value?.toString() || ''}
                  onChange={(value: string) => field.onChange(value || null)}
                  placeholder='Select staff member'
                />
                {errors.assignedToId && (
                  <p className='mt-1 text-destructive text-sm'>{errors.assignedToId.message}</p>
                )}
              </div>
            )}
          />
        </div>

        {/* Status Field (only for editing) */}
        {isEditing && (
          <Controller
            name='status'
            control={control}
            render={({ field }) => (
              <div>
                <label className='block peer-disabled:opacity-70 mb-2 font-medium text-sm leading-none peer-disabled:cursor-not-allowed'>
                  Status <span className='text-destructive'>*</span>
                </label>
                <CustomSelect
                  staticOptions={[
                    { title: 'Open', value: 'OPEN' },
                    { title: 'In Progress', value: 'IN_PROGRESS' },
                    { title: 'Resolved', value: 'RESOLVED' },
                    { title: 'Closed', value: 'CLOSED' }
                  ]}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder='Select status'
                />
              </div>
            )}
          />
        )}

        {/* Meta Information */}
        <div className='space-y-4 bg-muted/20 p-4 border rounded-lg'>
          <h3 className='font-medium text-sm'>Additional Information</h3>

          <div className='gap-4 grid grid-cols-1 sm:grid-cols-2'>
            {/* Category */}
            <Controller
              name='meta.category'
              control={control}
              render={({ field }) => (
                <div>
                  <label className='block peer-disabled:opacity-70 mb-2 font-medium text-sm leading-none peer-disabled:cursor-not-allowed'>
                    Category <span className='text-destructive'>*</span>
                  </label>
                  <CustomSelect
                    staticOptions={[
                      { title: 'Technical', value: 'technical' },
                      { title: 'Billing', value: 'billing' },
                      { title: 'General', value: 'general' },
                      { title: 'Feature Request', value: 'feature_request' },
                      { title: 'Bug Report', value: 'bug_report' }
                    ]}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder='Select category'
                  />
                  {errors.meta?.category && (
                    <p className='mt-1 text-destructive text-sm'>{errors.meta.category.message}</p>
                  )}
                </div>
              )}
            />

            {/* Source */}
            <Controller
              name='meta.source'
              control={control}
              render={({ field }) => (
                <div>
                  <label className='block peer-disabled:opacity-70 mb-2 font-medium text-sm leading-none peer-disabled:cursor-not-allowed'>
                    Source <span className='text-destructive'>*</span>
                  </label>
                  <CustomSelect
                    staticOptions={[
                      { title: 'User Portal', value: 'user_portal' },
                      { title: 'Admin Panel', value: 'admin_panel' },
                      { title: 'Email', value: 'email' },
                      { title: 'API', value: 'api' },
                      { title: 'Chat', value: 'chat' }
                    ]}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder='Select source'
                  />
                  {errors.meta?.source && (
                    <p className='mt-1 text-destructive text-sm'>{errors.meta.source.message}</p>
                  )}
                </div>
              )}
            />
          </div>

          {/* Tags */}
          <Controller
            name='meta.tags'
            control={control}
            render={({ field }) => (
              <div>
                <label className='block peer-disabled:opacity-70 mb-2 font-medium text-sm leading-none peer-disabled:cursor-not-allowed'>
                  Tags
                </label>
                <CustomInput
                  {...field}
                  value={Array.isArray(field.value) ? field.value.join(', ') : ''}
                  onChange={(e) => {
                    const tags = e.target.value
                      .split(',')
                      .map((tag) => tag.trim())
                      .filter(Boolean)
                    field.onChange(tags)
                  }}
                  placeholder='Enter tags separated by commas'
                  helperText='Separate multiple tags with commas'
                />
              </div>
            )}
          />

          {/* Internal Notes */}
          <Controller
            name='meta.internalNotes'
            control={control}
            render={({ field }) => (
              <CustomInput
                label='Internal Notes'
                type='textarea'
                {...field}
                value={field.value || ''}
                placeholder='Internal notes (not visible to customer)'
              />
            )}
          />

          <div className='gap-4 grid grid-cols-1 sm:grid-cols-2'>
            {/* Estimated Resolution Time */}
            <Controller
              name='meta.estimatedResolutionTime'
              control={control}
              render={({ field }) => (
                <CustomInput
                  label='Estimated Resolution Time (hours)'
                  type='number'
                  {...field}
                  value={field.value || ''}
                  onChange={(e) =>
                    field.onChange(e.target.value ? parseInt(e.target.value) : undefined)
                  }
                  placeholder='24'
                  min='1'
                />
              )}
            />

            {/* Assigned Department */}
            <Controller
              name='meta.assignedDepartment'
              control={control}
              render={({ field }) => (
                <CustomInput
                  label='Assigned Department'
                  {...field}
                  value={field.value || ''}
                  placeholder='Support, Technical, Billing, etc.'
                />
              )}
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className='flex sm:flex-row flex-col-reverse justify-end gap-3 pt-4 border-t'>
        <Button
          type='button'
          variant='outline'
          onClick={onClose}
          className='w-full sm:w-auto'
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type='submit' className='w-full sm:w-auto' disabled={loading}>
          {loading ? (
            <>
              <div className='mr-2 border-2 border-current border-t-transparent rounded-full w-4 h-4 animate-spin' />
              {isEditing ? 'Updating...' : 'Creating...'}
            </>
          ) : (
            <>{isEditing ? 'Update Ticket' : 'Create Ticket'}</>
          )}
        </Button>
      </div>
    </form>
  )
}

export default TicketForm
