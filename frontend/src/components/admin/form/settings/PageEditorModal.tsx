'use client'

import CustomInput from '@/components/common/CustomInput'
import { CustomSelect } from '@/components/common/CustomSelect'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { generateSlug } from '@/lib/pageTreeUtils'
import {
  PageItem,
  PageItemFormData,
  pageItemFormSchema
} from '@/lib/validations/schemas/pageSchema'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'

interface PageEditorModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (page: Omit<PageItem, 'id'>) => void
  allPages: PageItem[]
  parentSlug?: string
  initialValues?: PageItem | null
}

export default function PageEditorModal({
  isOpen,
  onClose,
  onSave,
  allPages,
  parentSlug,
  initialValues
}: PageEditorModalProps) {
  const {
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<PageItemFormData>({
    resolver: zodResolver(pageItemFormSchema),
    defaultValues: {
      title: '',
      slug: '',
      parentSlug: parentSlug || undefined,
      isActive: true,
      showInMenu: true,
      menuOrder: 0,
      depth: 0,
      hasContent: true,
      target: '_self',
      url: '',
      path: '',
      icon: '',
      isExternal: false
    }
  })

  const isExternal = watch('isExternal')
  const title = watch('title')

  useEffect(() => {
    if (initialValues) {
      reset({
        ...initialValues,
        isExternal: !!initialValues.url
      })
    } else if (parentSlug) {
      const parentDepth = allPages.find((p) => p.slug === parentSlug)?.depth || 0
      reset({
        title: '',
        slug: '',
        parentSlug: parentSlug || undefined,
        isActive: true,
        showInMenu: true,
        menuOrder: 0,
        depth: parentDepth + 1,
        hasContent: true,
        target: '_self',
        url: '',
        path: '',
        icon: '',
        isExternal: false
      })
    }
  }, [initialValues, parentSlug, allPages, reset])

  // Auto-generate slug from title
  useEffect(() => {
    if (title && !initialValues) {
      setValue('slug', generateSlug(title))
    }
  }, [title, initialValues, setValue])

  const onSubmit = handleSubmit(async (data) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { isExternal, ...formData } = data // Remove helper field

    const pageData: Omit<PageItem, 'id'> = {
      ...formData,
      hasContent: !data.isExternal,
      url: data.isExternal ? data.url : undefined
    }

    onSave(pageData)
    handleClose()
  })

  const handleClose = () => {
    reset()
    onClose()
  }

  // Create parent page options
  const parentOptions = [
    { value: 'none', title: 'No Parent (Top Level)', label: 'No Parent (Top Level)' },
    ...allPages
      .filter((page) => page.slug !== initialValues?.slug) // Don't allow self as parent
      .map((page) => ({
        value: page.slug,
        title: `${'  '.repeat(page.depth)}${page.title}`,
        label: `${'  '.repeat(page.depth)}${page.title}`
      }))
  ]

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className='max-w-2xl'>
        <DialogHeader>
          <DialogTitle>{initialValues ? 'Edit Page' : 'Add New Page'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className='space-y-6'>
          <div className='gap-4 grid grid-cols-1 md:grid-cols-2'>
            <Controller
              control={control}
              name='title'
              render={({ field }) => (
                <CustomInput
                  label='Page Title'
                  placeholder='e.g., About Us, Contact'
                  error={errors.title?.message}
                  required
                  {...field}
                />
              )}
            />

            <Controller
              control={control}
              name='slug'
              render={({ field }) => (
                <CustomInput
                  label='URL Slug'
                  placeholder='e.g., about-us, contact'
                  helperText='Used in the URL: /pages/your-slug'
                  error={errors.slug?.message}
                  required
                  {...field}
                />
              )}
            />
          </div>

          <div className='space-y-4'>
            <div>
              <Label htmlFor='parent'>Parent Page</Label>
              <Controller
                control={control}
                name='parentSlug'
                render={({ field }) => (
                  <CustomSelect
                    value={field.value || 'none'}
                    staticOptions={parentOptions}
                    onChange={(value) => field.onChange(value === 'none' ? undefined : value)}
                    placeholder='Select parent page (optional)'
                  />
                )}
              />
              {errors.parentSlug && (
                <p className='mt-1 text-red-500 text-sm'>{errors.parentSlug.message}</p>
              )}
            </div>

            <Controller
              control={control}
              name='isExternal'
              render={({ field }) => (
                <div className='flex items-center space-x-2'>
                  <Switch id='external' checked={field.value} onCheckedChange={field.onChange} />
                  <Label htmlFor='external'>External Link</Label>
                </div>
              )}
            />

            {isExternal && (
              <div className='gap-4 grid grid-cols-1 md:grid-cols-2'>
                <Controller
                  control={control}
                  name='url'
                  render={({ field }) => (
                    <CustomInput
                      label='External URL'
                      placeholder='https://example.com'
                      error={errors.url?.message}
                      {...field}
                    />
                  )}
                />

                <div className='space-y-2'>
                  <Label htmlFor='target'>Link Target</Label>
                  <Controller
                    control={control}
                    name='target'
                    render={({ field }) => (
                      <CustomSelect
                        {...field}
                        staticOptions={[
                          { value: '_self', title: 'Same Tab' },
                          { value: '_blank', title: 'New Tab' }
                        ]}
                      />
                    )}
                  />
                  {errors.target && (
                    <p className='mt-1 text-red-500 text-sm'>{errors.target.message}</p>
                  )}
                </div>
              </div>
            )}

            <div className='gap-4 grid grid-cols-2'>
              <Controller
                control={control}
                name='isActive'
                render={({ field }) => (
                  <div className='flex items-center space-x-2'>
                    <Switch id='active' checked={field.value} onCheckedChange={field.onChange} />
                    <Label htmlFor='active'>Active</Label>
                  </div>
                )}
              />

              <Controller
                control={control}
                name='showInMenu'
                render={({ field }) => (
                  <div className='flex items-center space-x-2'>
                    <Switch
                      id='showInMenu'
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                    <Label htmlFor='showInMenu'>Show in Menu</Label>
                  </div>
                )}
              />
            </div>

            <Controller
              control={control}
              name='menuOrder'
              render={({ field }) => (
                <CustomInput
                  label='Menu Order'
                  type='number'
                  placeholder='0'
                  helperText='Lower numbers appear first'
                  error={errors.menuOrder?.message}
                  {...field}
                  value={field.value.toString()}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              )}
            />
          </div>

          <div className='flex justify-end gap-2'>
            <Button type='button' variant='outline' onClick={handleClose}>
              Cancel
            </Button>
            <Button type='submit' disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : initialValues ? 'Update Page' : 'Create Page'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
