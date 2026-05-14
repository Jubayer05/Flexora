'use client'

import CustomInput from '@/components/common/CustomInput'
import { CustomSelect } from '@/components/common/CustomSelect'
import { Button } from '@/components/ui/button'
import { showError } from '@/lib/errMsg'
import { CreateCouponSchema, UpdateCouponSchema } from '@/lib/validations/schemas/coupon'
import requests from '@/services/network/http'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { DatePicker } from '../common/DatePicker'

interface CouponFormProps {
  initialValues?: Coupon | null
  onClose?: () => void
  onSuccess?: () => void
}

const CouponForm = ({ initialValues, onClose, onSuccess }: CouponFormProps) => {
  const [loading, setLoading] = useState(false)
  const isEditing = Boolean(initialValues)

  // Use appropriate schema based on whether we're creating or updating
  const schema = isEditing ? UpdateCouponSchema : CreateCouponSchema

  const toNumber = (value: unknown, fallback = 0) => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }

  const toOptionalNumber = (value: unknown) => {
    if (value === null || value === undefined || value === '') return null

    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      code: initialValues?.code || '',
      name: initialValues?.name || '',
      description: initialValues?.description || undefined,
      type: initialValues?.type || 'PERCENTAGE',
      status: initialValues?.status || 'ACTIVE',
      scope: (initialValues as any)?.scope || 'ALL_PRODUCTS',
      discountValue: toNumber(initialValues?.discountValue, 0),
      maxDiscountAmount: toOptionalNumber(initialValues?.maxDiscountAmount),
      minOrderAmount: toOptionalNumber(initialValues?.minOrderAmount),
      usageLimit: toOptionalNumber(initialValues?.usageLimit),
      userUsageLimit: toOptionalNumber(initialValues?.userUsageLimit),
      startsAt: initialValues?.startsAt ? new Date(initialValues.startsAt) : new Date(),
      expiresAt: initialValues?.expiresAt
        ? new Date(initialValues.expiresAt)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      applicableProductIds: initialValues?.applicableProductIds || [],
      applicableCategoryIds: (initialValues as any)?.applicableCategoryIds || [],
      applicableGroupIds: ((initialValues as any)?.meta as any)?.applicableGroupIds || [],
      ...(isEditing && initialValues?.id && { id: initialValues.id })
    }
  })

  const watchType = watch('type')
  const watchCategories = watch('applicableCategoryIds')
  const watchGroups = watch('applicableGroupIds')

  const parseDatePickerValue = (value: string) => {
    if (!value) return undefined

    return new Date(value.endsWith('Z') ? value : `${value}:00.000Z`)
  }

  const onSubmit = async (data: any) => {
    setLoading(true)
    try {
      const applicableProductIds = Array.isArray(data.applicableProductIds)
        ? data.applicableProductIds
        : []
      const applicableCategoryIds = Array.isArray(data.applicableCategoryIds)
        ? data.applicableCategoryIds
        : []
      const applicableGroupIds = Array.isArray(data.applicableGroupIds)
        ? data.applicableGroupIds
        : []

      const scope = applicableProductIds.length
        ? 'SPECIFIC_PRODUCTS'
        : applicableCategoryIds.length
          ? 'SPECIFIC_CATEGORIES'
          : 'ALL_PRODUCTS'

      const formData = {
        ...data,
        scope,
        description: data.description || null,
        maxDiscountAmount: data.maxDiscountAmount || null,
        minOrderAmount: data.minOrderAmount || null,
        usageLimit: data.usageLimit || null,
        userUsageLimit: data.userUsageLimit || null,
        applicableProductIds,
        applicableCategoryIds,
        meta: applicableGroupIds.length
          ? {
              ...(data.meta || {}),
              applicableGroupIds
            }
          : data.meta || undefined
      }

      if (isEditing) {
        await requests.put(`/admin/coupons/${initialValues?.id}`, formData)
        toast.success('Coupon updated successfully!')
      } else {
        await requests.post('/admin/coupons', formData)
        toast.success('Coupon created successfully!')
      }

      onSuccess?.()
      onClose?.()
    } catch (error) {
      setLoading(false)
      showError(error)
    }
  }

  const onInvalid = (formErrors: Record<string, any>) => {
    const firstError = Object.values(formErrors).find((error) => error?.message)
    toast.error(firstError?.message || 'Please fix the highlighted fields before saving.')
  }

  const typeOptions = [
    { value: 'PERCENTAGE', title: 'Percentage', label: 'Percentage' },
    { value: 'FIXED_AMOUNT', title: 'Fixed Amount', label: 'Fixed Amount' }
  ]

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} className='space-y-6'>
      <div className='space-y-4 pt-2'>
        {/* Basic Information */}
        <div className='gap-4 grid grid-cols-1 sm:grid-cols-2'>
          {/* Code Field */}
          <Controller
            name='code'
            control={control}
            render={({ field }) => (
              <CustomInput
                label='Coupon Code'
                {...field}
                placeholder='SAVE20'
                error={errors.code?.message}
                required
                helperText='Uppercase letters, numbers, underscores, and hyphens only'
                onChange={(e) => {
                  // Auto-format the coupon code
                  let value = e.target.value

                  // Convert to uppercase
                  value = value.toUpperCase()

                  // Replace spaces with underscores
                  value = value.replace(/\s+/g, '_')

                  // Remove special characters except underscores and hyphens
                  // Keep only alphanumeric, underscores, and hyphens
                  value = value.replace(/[^A-Z0-9_-]/g, '')

                  // Update the field value
                  field.onChange(value)
                }}
                value={field.value}
              />
            )}
          />

          {/* Name Field */}
          <Controller
            name='name'
            control={control}
            render={({ field }) => (
              <CustomInput
                label='Coupon Name'
                {...field}
                placeholder='Save 20% Discount'
                error={errors.name?.message}
                required
              />
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
              value={field.value ?? ''}
              placeholder='Enter coupon description (optional)'
              error={errors.description?.message}
            />
          )}
        />
        {/* Coupon/Discount Configuration */}
        <div className='gap-4 grid grid-cols-1 sm:grid-cols-2'>
          {/* Type Field */}
          <Controller
            name='type'
            control={control}
            render={({ field, fieldState }) => (
              <div>
                <CustomSelect
                  label='Discount Type'
                  staticOptions={typeOptions}
                  showSearch={false}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder='Select type'
                />
                {fieldState.error && (
                  <p className='mt-1 text-destructive text-sm'>{fieldState.error.message}</p>
                )}
              </div>
            )}
          />

          {/* Discount Value */}
          <Controller
            name='discountValue'
            control={control}
            render={({ field }) => (
              <CustomInput
                label={`Discount Value ${watchType === 'PERCENTAGE' ? '(%)' : '($)'}`}
                {...field}
                type='number'
                placeholder={watchType === 'PERCENTAGE' ? '20' : '10.00'}
                min={0}
                max={watchType === 'PERCENTAGE' ? 100 : undefined}
                step={watchType === 'PERCENTAGE' ? '1' : '0.01'}
                error={errors.discountValue?.message}
                required
                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                value={field.value?.toString() || '0'}
              />
            )}
          />
        </div>
        {/* Date Range */}
        <div className='gap-4 grid grid-cols-1 sm:grid-cols-2'>
          {/* Start Date */}
          <Controller
            name='startsAt'
            control={control}
            render={({ field }) => (
              <DatePicker
                label='Start Date'
                name='startsAt'
                showTime={true}
                value={field.value ? field.value.toISOString().slice(0, 16) : ''}
                onChange={(e) => field.onChange(parseDatePickerValue(e.target.value))}
                error={errors.startsAt?.message}
                required
                placeholder='Select start date and time'
              />
            )}
          />

          {/* End Date */}
          <Controller
            name='expiresAt'
            control={control}
            render={({ field }) => (
              <DatePicker
                label='Expiry Date'
                name='expiresAt'
                showTime={true}
                value={field.value ? field.value.toISOString().slice(0, 16) : ''}
                onChange={(e) => field.onChange(parseDatePickerValue(e.target.value))}
                error={errors.expiresAt?.message}
                required
                placeholder='Select expiry date and time'
              />
            )}
          />

          {/* Status Field */}
          <Controller
            name='status'
            control={control}
            render={({ field }) => (
              <div>
                <label className='block peer-disabled:opacity-70 mb-2 font-medium text-sm leading-none peer-disabled:cursor-not-allowed'>
                  Status <span className='text-destructive'>*</span>
                </label>
                <CustomInput
                  type='switch'
                  name='status'
                  label={`Coupon is ${field.value?.toLowerCase()}`}
                  checked={field.value === 'ACTIVE'}
                  onCheckedChange={(checked) => field.onChange(checked ? 'ACTIVE' : 'INACTIVE')}
                />
              </div>
            )}
          />
        </div>
        {/* Conditional Product/Category Selection */}
        <Controller
          name='applicableCategoryIds'
          control={control}
          render={({ field, fieldState }) => (
            <div>
              <label className='block peer-disabled:opacity-70 mb-2 font-medium text-sm leading-none peer-disabled:cursor-not-allowed'>
                Applicable Categories <span className='text-destructive'>*</span>
              </label>
              <CustomSelect
                url='/admin/categories'
                options={(data) =>
                  data?.data?.categories?.map((category: any) => ({
                    title: category.name,
                    label: category.name,
                    value: category.id.toString()
                  })) || []
                }
                multiple={true}
                showSearch={true}
                searchMode='server'
                value={field.value?.map((id: number) => id.toString()) || []}
                onChange={(values: string[]) => {
                  // Handle both array of strings and single string
                  const valueArray = Array.isArray(values) ? values : [values]
                  field.onChange(valueArray.map((v: string) => parseInt(v)))
                }}
                placeholder='Select categories'
              />
              {fieldState.error && (
                <p className='mt-1 text-destructive text-sm'>{fieldState.error.message}</p>
              )}
            </div>
          )}
        />
        <Controller
          name='applicableGroupIds'
          control={control}
          render={({ field, fieldState }) => (
            <div>
              <label className='block peer-disabled:opacity-70 mb-2 font-medium text-sm leading-none peer-disabled:cursor-not-allowed'>
                Applicable Groups <span className='text-destructive'>*</span>
              </label>
              <CustomSelect
                url='/admin/product-groups/all'
                options={(data) => {
                  const raw = data?.data
                  const groups = Array.isArray(raw) ? raw : raw?.productGroups
                  const list = Array.isArray(groups) ? groups : []
                  return list.map((group: any) => ({
                    title: group.name,
                    label: group.name,
                    value: group.id.toString()
                  }))
                }}
                multiple={true}
                value={field.value?.map((id: number) => id.toString()) || []}
                onChange={(values: string[]) => {
                  // Handle both array of strings and single string
                  const valueArray = Array.isArray(values) ? values : [values]
                  field.onChange(valueArray.map((v: string) => parseInt(v)))
                }}
                placeholder='Select groups'
              />
              {fieldState.error && (
                <p className='mt-1 text-destructive text-sm'>{fieldState.error.message}</p>
              )}
            </div>
          )}
        />
        <Controller
          name='applicableProductIds'
          control={control}
          render={({ field, fieldState }) => (
            <div>
              <CustomSelect
                label=' Applicable Products'
                url={`/admin/products/filter?categoryIds=${watchCategories?.join(',')}${
                  watchGroups ? `&groupIds=${watchGroups?.join(',')}` : ''
                }`}
                options={(data) =>
                  data?.data?.map((product: any) => ({
                    title: product.name,
                    label: product.name,
                    value: product.id.toString()
                  })) || []
                }
                multiple={true}
                showSearch={true}
                searchMode='server'
                disabled={!watchCategories?.length && !watchGroups?.length}
                value={field.value?.map((id: number) => id.toString()) || []}
                onChange={(values: string[]) => {
                  // Handle both array of strings and single string
                  const valueArray = Array.isArray(values) ? values : [values]
                  field.onChange(valueArray.map((v: string) => parseInt(v)))
                }}
                placeholder='Select products'
              />
              {fieldState.error && (
                <p className='mt-1 text-destructive text-sm'>{fieldState.error.message}</p>
              )}
            </div>
          )}
        />
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
            <>{isEditing ? 'Update Coupon' : 'Create Coupon'}</>
          )}
        </Button>
      </div>
    </form>
  )
}

export default CouponForm
