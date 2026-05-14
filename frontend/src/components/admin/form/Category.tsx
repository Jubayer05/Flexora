'use client'

import CustomInput from '@/components/common/CustomInput'
import useAsync from '@/hooks/useAsync'
import { CustomSelect } from '@/components/common/CustomSelect'
import FileUploader from '@/components/common/FileUploader'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { showError } from '@/lib/errMsg'
import { createNameChangeHandler, createSlugChangeHandler } from '@/lib/slugUtils'
import { CreateCategorySchema, UpdateCategorySchema } from '@/lib/validations/schemas/category'
import requests from '@/services/network/http'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowDown, ArrowUp, MoveRight, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Controller, SubmitHandler, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { mutate as globalMutate } from 'swr'
import { z } from 'zod'

interface CategoryFormProps {
  initialValues?: Category | null
  onClose?: () => void
  onSuccess?: () => void
  allowParent?: boolean
}

const CategoryForm = ({
  initialValues,
  onClose,
  onSuccess,
  allowParent = false
}: CategoryFormProps) => {
  const [loading, setLoading] = useState(false)
  const [movingGroupId, setMovingGroupId] = useState<number | null>(null)
  const [removingGroupId, setRemovingGroupId] = useState<number | null>(null)
  const [moveTargets, setMoveTargets] = useState<Record<number, string>>({})
  const isEditing = Boolean(initialValues)
  // Use appropriate schema based on whether we're creating or updating
  const schema = isEditing ? UpdateCategorySchema : CreateCategorySchema

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initialValues?.name || '',
      slug: initialValues?.slug || '',
      description: initialValues?.description || '',
      icon: initialValues?.icon || '',
      isActive: initialValues?.isActive ?? true,
      sortOrder: initialValues?.sortOrder || 0,
      parentId: initialValues?.parentId || undefined,
      ...(isEditing && initialValues?.id && { id: initialValues.id })
    }
  })

  const showGroupsManager = isEditing && !allowParent && Boolean(initialValues?.id)

  const { data: groupsData, mutate: mutateGroups } = useAsync<{
    data: { productGroups?: ProductGroup[] }
  }>(
    () =>
      showGroupsManager
        ? `/admin/product-groups/all?categoryId=${initialValues?.id}&limit=100&sortBy=sortOrder&sortOrder=asc`
        : null
  )

  const { data: categoriesData } = useAsync<{
    data: { categories: Category[] }
  }>(() =>
    showGroupsManager ? '/admin/categories?isRoot=true&limit=100&sortBy=sortOrder&sortOrder=asc' : null
  )

  const groups = Array.isArray(groupsData?.data)
    ? groupsData?.data
    : groupsData?.data?.productGroups ?? []

  const moveableCategories = (categoriesData?.data?.categories ?? []).filter(
    (category) => category.id !== initialValues?.id
  )

  const refreshGroupData = async () => {
    await globalMutate(
      (key) => typeof key === 'string' && key.startsWith('/admin/product-groups'),
      undefined,
      { revalidate: true }
    )
    mutateGroups?.()
  }

  const handleMoveGroup = async (groupId: number) => {
    const targetCategoryId = moveTargets[groupId]
    if (!targetCategoryId) {
      toast.error('Please select a target category')
      return
    }

    const group = groups.find((item) => item.id === groupId)
    if (!group) return

    setMovingGroupId(groupId)
    try {
      await requests.put(`/admin/product-groups/${groupId}`, {
        name: group.name,
        slug: group.slug,
        categoryId: Number(targetCategoryId)
      })
      toast.success('Group moved successfully')
      setMoveTargets((prev) => {
        const next = { ...prev }
        delete next[groupId]
        return next
      })
      await refreshGroupData()
    } catch (error) {
      showError(error)
    } finally {
      setMovingGroupId(null)
    }
  }

  const handleRemoveGroup = async (groupId: number) => {
    const group = groups.find((item) => item.id === groupId)
    if (!group) return

    if (!window.confirm(`Remove group "${group.name}" from this category? This will delete the group.`)) {
      return
    }

    setRemovingGroupId(groupId)
    try {
      const response = await requests.delete(`/admin/product-groups/${groupId}`)
      toast.success(response?.data?.message || 'Group removed successfully')
      await refreshGroupData()
    } catch (error) {
      showError(error)
    } finally {
      setRemovingGroupId(null)
    }
  }

  const handleMovePosition = async (groupId: number, direction: 'up' | 'down') => {
    const currentIndex = groups.findIndex((group) => group.id === groupId)
    if (currentIndex === -1) return

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (targetIndex < 0 || targetIndex >= groups.length) return

    const prevItem = targetIndex > 0 ? groups[targetIndex - 1] : null
    const nextItem = groups[targetIndex]

    const prevSortOrder =
      prevItem && prevItem.sortOrder !== 0 && prevItem.sortOrder !== null ? prevItem.sortOrder : null
    const nextSortOrder =
      nextItem && nextItem.sortOrder !== 0 && nextItem.sortOrder !== null ? nextItem.sortOrder : null

    setMovingGroupId(groupId)
    try {
      await requests.patch(`/admin/product-groups/${groupId}/reorder`, {
        prevSortOrder,
        nextSortOrder
      })
      toast.success('Group order updated successfully')
      await refreshGroupData()
    } catch (error) {
      showError(error)
    } finally {
      setMovingGroupId(null)
    }
  }

  const onSubmit: SubmitHandler<z.infer<typeof schema>> = async (data) => {
    setLoading(true)
    try {
      // Convert empty strings to null for optional fields
      const formData = {
        ...data,
        description: data.description || '',
        icon: data.icon || '',
        parentId: data.parentId || undefined
      }

      if (isEditing) {
        await requests.put(`/admin/categories/${initialValues?.id}`, formData)
        toast.success('Category updated successfully!')
      } else {
        await requests.post('/admin/categories', formData)
        toast.success('Category created successfully!')
      }

      await globalMutate(
        (key) =>
          typeof key === 'string' &&
          (key.startsWith('/admin/categories') ||
            key.startsWith('/categories') ||
            key.startsWith('/admin/product-groups') ||
            key.startsWith('/product-groups')),
        undefined,
        { revalidate: true }
      )

      onSuccess?.()
      onClose?.()
    } catch (error) {
      setLoading(false)
      showError(error)
    }
  }

  const statusOptions = [
    { value: 'true', title: 'Active', label: 'Active' },
    { value: 'false', title: 'Inactive', label: 'Inactive' }
  ]

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
      <div className='space-y-4 pt-2'>
        {allowParent && (
          <Controller
            name='parentId'
            control={control}
            render={({ field }) => (
              <CustomSelect
                className='mb-6'
                label='Parent Category'
                url='/admin/categories?isRoot=true&limit=50'
                options={(data) =>
                  data?.data?.categories.map((category: Category) => ({
                    value: category.id,
                    title: category.name,
                    label: category.name
                  }))
                }
                {...field}
                showSearch
                placeholder='Select parent category (optional)'
                value={(field.value as string | null) ?? ''}
              />
            )}
          />
        )}

        {/* Name Field - Full Width */}
        <Controller
          name='name'
          control={control}
          rules={{
            required: 'Category name is required',
            minLength: {
              value: 2,
              message: 'Name must be at least 2 characters long'
            }
          }}
          render={({ field }) => (
            <CustomInput
              label='Category Name'
              {...field}
              onChange={(e) => {
                  const nameChangeHandler = createNameChangeHandler(
                    field.onChange,
                    (slug: string) => setValue('slug', slug),
                    {
                      skipIfEditing: isEditing && Boolean(initialValues?.slug),
                      style: 'compact'
                    }
                  )
                  nameChangeHandler(e.target.value)
                }}
              placeholder='Enter category name'
              error={errors.name?.message}
              required
            />
          )}
        />

        {/* Slug Field */}
        <Controller
          name='slug'
          control={control}
          rules={{
            required: 'Slug is required',
            pattern: {
              value: /^[A-Za-z0-9-]+$/,
              message: 'Slug can only contain letters, numbers, and hyphens'
            }
          }}
          render={({ field }) => (
            <CustomInput
              label='Slug'
              {...field}
              onChange={(e) => {
                const slugChangeHandler = createSlugChangeHandler(field.onChange)
                slugChangeHandler(e.target.value, { style: 'compact' })
              }}
              placeholder='CategorySlug'
              error={errors.slug?.message}
              required
              helperText='Auto-generated from the name and can be changed manually.'
            />
          )}
        />

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
              placeholder='Enter category description (optional)'
              error={errors.description?.message}
            />
          )}
        />
      </div>

      {/* Settings Section */}
      <div className='space-y-4'>
        <h3 className='font-semibold text-lg'>Settings</h3>

        <div className='gap-4 grid grid-cols-1 sm:grid-cols-2'>
          {/* Status Field */}
          <Controller
            name='isActive'
            control={control}
            render={({ field, fieldState }) => (
              <div>
                <label className='block peer-disabled:opacity-70 mb-2 font-medium text-sm leading-none peer-disabled:cursor-not-allowed'>
                  Status
                </label>
                <CustomSelect
                  staticOptions={statusOptions}
                  showSearch={false}
                  value={field.value?.toString()}
                  onChange={(value: string) => field.onChange(value === 'true')}
                  placeholder='Select status'
                />
                {fieldState.error && (
                  <p className='mt-1 text-destructive text-sm'>{fieldState.error.message}</p>
                )}
              </div>
            )}
          />

          {/* Sort Order Field */}
          <Controller
            name='sortOrder'
            control={control}
            rules={{
              min: {
                value: 0,
                message: 'Sort order must be 0 or greater'
              }
            }}
            render={({ field }) => (
              <CustomInput
                label='Sort Order'
                {...field}
                type='number'
                placeholder='0'
                min={0}
                error={errors.sortOrder?.message}
                helperText='Lower numbers appear first'
                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                value={field.value?.toString() || '0'}
              />
            )}
          />
        </div>
      </div>

      {/* Category Icon */}
      <Controller
        name='icon'
        control={control}
        render={({ field }) => (
          <div className='space-y-2'>
            <label className='block font-medium text-gray-700 text-sm'>Category Icon</label>
            <FileUploader
              value={field.value || undefined}
              onChangeAction={field.onChange}
              maxAllow={1}
              size='small'
            />
          </div>
        )}
      />

      {showGroupsManager && (
        <div className='space-y-4 pt-2 border-t'>
          <div className='space-y-1'>
            <h3 className='font-semibold text-lg'>Groups In This Category</h3>
            <p className='text-sm text-muted-foreground'>
              Move, remove, and sort groups directly inside this category. Groups assigned here will not appear under other categories.
            </p>
          </div>

          <div className='space-y-3'>
            {groups.length > 0 ? (
              groups.map((group, index) => (
                <div
                  key={group.id}
                  className='gap-3 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_220px_auto_auto] items-center p-4 border rounded-lg'
                >
                  <div className='min-w-0'>
                    <div className='font-medium truncate'>{group.name}</div>
                    <div className='text-xs text-muted-foreground truncate'>
                      {group.slug ? `${group.slug}` : 'No slug'}{group._count?.products !== undefined ? ` • ${group._count.products} products` : ''}
                    </div>
                  </div>

                  <Select
                    value={moveTargets[group.id] ?? ''}
                    onValueChange={(value) =>
                      setMoveTargets((prev) => ({
                        ...prev,
                        [group.id]: value
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='Move to category' />
                    </SelectTrigger>
                    <SelectContent>
                      {moveableCategories.map((category) => (
                        <SelectItem key={category.id} value={String(category.id)}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className='flex items-center gap-1'>
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      className='h-8 w-8'
                      disabled={index === 0 || movingGroupId === group.id}
                      onClick={() => handleMovePosition(group.id, 'up')}
                    >
                      <ArrowUp className='h-4 w-4' />
                    </Button>
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      className='h-8 w-8'
                      disabled={index === groups.length - 1 || movingGroupId === group.id}
                      onClick={() => handleMovePosition(group.id, 'down')}
                    >
                      <ArrowDown className='h-4 w-4' />
                    </Button>
                  </div>

                  <div className='flex sm:flex-row flex-col gap-2'>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      className='gap-2'
                      disabled={!moveTargets[group.id] || movingGroupId === group.id}
                      onClick={() => handleMoveGroup(group.id)}
                    >
                      <MoveRight className='h-4 w-4' />
                      Move
                    </Button>
                    <Button
                      type='button'
                      variant='destructive'
                      size='sm'
                      className='gap-2'
                      disabled={removingGroupId === group.id}
                      onClick={() => handleRemoveGroup(group.id)}
                    >
                      <Trash2 className='h-4 w-4' />
                      Remove
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className='p-4 border border-dashed rounded-lg text-sm text-muted-foreground'>
                No groups are assigned to this category yet.
              </div>
            )}
          </div>
        </div>
      )}

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
            <>{isEditing ? 'Update Category' : 'Create Category'}</>
          )}
        </Button>
      </div>
    </form>
  )
}

export default CategoryForm
