'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import CustomInput from '@/components/common/CustomInput'
import { Button } from '@/components/ui/button'
import { showError } from '@/lib/errMsg'
import requests from '@/services/network/http'
import { toast } from 'sonner'

// Simple schema - only name is required, slug is auto-generated
const BlogCategoryFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Category name is required')
    .max(100, 'Name must be less than 100 characters')
})

type BlogCategoryFormType = z.infer<typeof BlogCategoryFormSchema>

interface BlogCategoryFormProps {
  initialData?: { id?: number; name: string }
  onSuccess?: () => void
  onCancel?: () => void
}

export function BlogCategoryForm({ initialData, onSuccess, onCancel }: BlogCategoryFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch
  } = useForm<BlogCategoryFormType>({
    resolver: zodResolver(BlogCategoryFormSchema),
    defaultValues: {
      name: initialData?.name || ''
    }
  })

  // Auto-generate slug from name
  const watchName = watch('name')
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  // Set initial data if editing
  useEffect(() => {
    if (initialData) {
      setValue('name', initialData.name)
    }
  }, [initialData, setValue])

  const onSubmit = async (data: BlogCategoryFormType) => {
    try {
      const slug = generateSlug(data.name)
      const payload = { ...data, slug }

      if (initialData?.id) {
        // Update existing category
        await requests.put(`/admin/blogs/categories/${initialData.id}`, payload)
        toast.success('Category updated successfully')
      } else {
        // Create new category
        await requests.post('/admin/blogs/categories', payload)
        toast.success('Category created successfully')
      }

      onSuccess?.()
      if (!initialData?.id) {
        reset()
      }
    } catch (error) {
      showError(error)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
      <div className='space-y-4'>
        <CustomInput
          type='text'
          label='Category Name'
          placeholder='Enter category name'
          error={errors.name?.message}
          {...register('name')}
        />

        {/* Show preview of auto-generated slug */}
        {watchName && (
          <div className='text-muted-foreground text-sm'>
            <span className='font-medium'>Slug preview:</span> {generateSlug(watchName)}
          </div>
        )}
      </div>

      <div className='flex gap-3 pt-4'>
        <Button type='submit' disabled={isSubmitting}>
          {isSubmitting
            ? initialData?.id
              ? 'Updating...'
              : 'Creating...'
            : initialData?.id
            ? 'Update Category'
            : 'Create Category'}
        </Button>
        {onCancel && (
          <Button type='button' variant='outline' onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
