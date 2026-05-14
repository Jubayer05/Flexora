'use client'

import CustomInput from '@/components/common/CustomInput'
import { CustomSelect } from '@/components/common/CustomSelect'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { showError } from '@/lib/errMsg'
import { FooterSettings, footerSettingsSchema } from '@/lib/validations/schemas/footerMenuSchema'
import requests from '@/services/network/http'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2, X } from 'lucide-react'
import { useEffect } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { toast } from 'sonner'

type TProps = {
  settingsKey: string
  initialValues?: FooterSettings | null
  refetch?: () => void
}

// Individual Menu Item Component
const MenuItemCard = ({
  control,
  groupIndex,
  itemIndex,
  onRemove,
  watch,
  errors
}: {
  control: any
  groupIndex: number
  itemIndex: number
  onRemove: () => void
  watch: any
  errors: any
}) => {
  const watchType = watch(`footerMenus.${groupIndex}.children.${itemIndex}.type`) ?? 'EXTERNAL'

  return (
    <div className='relative flex flex-wrap *:flex-[1_1_calc(50%-16px)] gap-4 p-4 border border-muted-foreground rounded-lg'>
      <div className='lg:col-span-2'>
        <Controller
          control={control}
          name={`footerMenus.${groupIndex}.children.${itemIndex}.title`}
          render={({ field, fieldState: { error } }) => (
            <CustomInput
              label='Menu Title'
              placeholder='About Us'
              error={error?.message}
              {...field}
              value={field.value ?? ''}
            />
          )}
        />
      </div>

      <Controller
        control={control}
        name={`footerMenus.${groupIndex}.children.${itemIndex}.type`}
        render={({ field, fieldState: { error } }) => (
          <CustomInput
            type='select'
            label='Page Type'
            name={`footerMenus.${groupIndex}.children.${itemIndex}.type`}
            value={(field.value as any) ?? 'EXTERNAL'}
            onValueChange={field.onChange as any}
            options={[
              { value: 'EXTERNAL', label: 'External URL (redirect/link)' },
              { value: 'HYBRID', label: 'Hybrid (Pre build pages)' }
            ]}
            error={error?.message}
          />
        )}
      />

      {watchType === 'HYBRID' && (
        <Controller
          control={control}
          name={`footerMenus.${groupIndex}.children.${itemIndex}.url`}
          render={({ field }) => (
            <div className='space-y-2'>
              <CustomSelect
                label='Select Page'
                placeholder='Select Page'
                url='/admin/custom-pages?location=FOOTER&page=1&limit=50&sortBy=createdAt&sortOrder=desc' // Fetch roles from this endpoint
                value={field.value.toString()}
                onChange={field.onChange}
                options={(data: any) =>
                  data?.data?.pages
                    ?.filter((item: any) => {
                      // Filter out EXTERNAL pages with empty/invalid URLs
                      if (item?.type === 'EXTERNAL') {
                        return item?.url && item.url.trim() !== ''
                      }
                      return true
                    })
                    .map((item: any) => ({
                      title: item.title,
                      label: item.title,
                      value: item?.type === 'EXTERNAL' ? item?.url : `/pages/${item.slug}`
                    }))
                }
              />
              {errors.url && <p className='text-destructive text-sm'>{errors.url.message}</p>}
            </div>
          )}
        />
      )}

      {watchType === 'EXTERNAL' && (
        <div className='lg:col-span-2'>
          <Controller
            control={control}
            name={`footerMenus.${groupIndex}.children.${itemIndex}.url`}
            render={({ field, fieldState: { error } }) => (
              <CustomInput
                label='Menu URL'
                placeholder='/about-us'
                error={error?.message}
                {...field}
                value={field.value ?? ''}
              />
            )}
          />
        </div>
      )}

      <div className='-top-2 -right-2 absolute flex items-end'>
        <Button type='button' variant='outline' size='sm' onClick={onRemove} className='px-1!'>
          <X className='w-4 h-4' />
        </Button>
      </div>
    </div>
  )
}

// Menu Group Component
const MenuGroupCard = ({
  control,
  groupIndex,
  onRemove,
  errors,
  watch
}: {
  control: any
  groupIndex: number
  onRemove: () => void
  errors: any
  watch: any
}) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `footerMenus.${groupIndex}.children`
  })

  return (
    <Card className='border-2 border-muted-foreground/20'>
      <CardHeader>
        <div className='flex justify-between items-center'>
          <CardTitle className='text-lg'>Menu Group {groupIndex + 1}</CardTitle>
          <Button type='button' variant='destructive' size='sm' onClick={onRemove}>
            <Trash2 className='mr-2 w-4 h-4' />
            Remove Group
          </Button>
        </div>
      </CardHeader>

      <CardContent className='space-y-4'>
        {/* Group Name */}
        <Controller
          control={control}
          name={`footerMenus.${groupIndex}.groupName`}
          render={({ field, fieldState: { error } }) => (
            <CustomInput
              label='Group Name'
              placeholder='Company'
              error={error?.message}
              {...field}
              value={field.value ?? ''}
              required
            />
          )}
        />

        {/* Menu Items */}
        <div className='space-y-4'>
          <div className='flex justify-between items-center'>
            <h4 className='font-medium text-sm'>Menu Items</h4>
          </div>

          {fields.length === 0 && (
            <div className='py-8 border-2 border-muted-foreground/20 border-dashed rounded-lg text-muted-foreground text-center'>
              <p className='text-sm'>No menu items yet</p>
              <p className='mt-1 text-xs'>Click &quot;Add Menu Item&quot; to get started</p>
            </div>
          )}

          {fields.map((field, itemIndex) => (
            <MenuItemCard
              key={field.id}
              control={control}
              groupIndex={groupIndex}
              itemIndex={itemIndex}
              onRemove={() => remove(itemIndex)}
              watch={watch}
              errors={errors}
            />
          ))}
           
           <div className='flex justify-center sm:justify-end'> 
          <Button
            type='button'
            variant='outline'
            onClick={() => append({ title: '', url: '' })}
            className='float-right '
          >
            <Plus className='w-4 h-4' />
            Add Menu Item
          </Button>
           </div>

          {/* Children error display */}
          {errors?.footerMenus?.[groupIndex]?.children?.message && (
            <p className='text-destructive text-sm'>
              {errors.footerMenus[groupIndex].children.message}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function FooterMenuForm({ settingsKey, initialValues, refetch }: TProps) {
  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<FooterSettings>({
    resolver: zodResolver(footerSettingsSchema) as any,
    defaultValues: {
      footerMenus: [
        {
          groupName: '',
          children: [{ title: '', type: 'EXTERNAL' as const, url: '' }]
        }
      ]
    }
  })

  // Reset form when initialValues changes (after data loads)
  useEffect(() => {
    if (
      initialValues?.footerMenus &&
      Array.isArray(initialValues.footerMenus) &&
      initialValues.footerMenus.length > 0
    ) {
      console.log('Resetting form with initial values:', initialValues)
      reset(initialValues)
    }
  }, [initialValues, reset])

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'footerMenus'
  })

  const onSubmit = handleSubmit(async (data) => {
    try {
      console.log('Final Footer Menu Data:', JSON.stringify(data, null, 2))

      // API call to save settings
      const response = await requests.post(`/admin/settings/${settingsKey}`, {
        key: settingsKey,
        value: data
      })

      if (response?.success) {
        toast.success('Footer menu settings saved successfully!')
        refetch?.()
      }
    } catch (error) {
      console.error('Error saving footer menu settings:', error)
      showError(error)
    }
  })

  return (
    <form onSubmit={onSubmit} className='space-y-6'>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>Footer Menu Settings</CardTitle>
          <p className='text-muted-foreground text-sm'>
            Configure footer menu groups and their menu items. Each group will be displayed as a
            column in the footer.
          </p>
        </CardHeader>
      </Card>

      {/* Menu Groups */}
      <div className='space-y-6'>
        {fields.map((field, groupIndex) => (
          <MenuGroupCard
            key={field.id}
            control={control}
            groupIndex={groupIndex}
            onRemove={() => remove(groupIndex)}
            errors={errors}
            watch={watch}
          />
        ))}

        {/* Add Group Button */}
        <Card className='border-2 border-muted-foreground/20 border-dashed'>
          <CardContent className='flex flex-col justify-center items-center py-8'>
            <Button
              type='button'
              variant='outline'
              onClick={() =>
                append({
                  groupName: '',
                  children: [{ title: '', type: 'EXTERNAL' as const, url: '' }]
                })
              }
              className='mb-2'
            >
              <Plus className='mr-2 w-4 h-4' />
              Add Menu Group
            </Button>
            <p className='text-muted-foreground text-sm'>Create a new footer menu group</p>
          </CardContent>
        </Card>
      </div>

      {/* Form Actions */}
      <div className='flex justify-end gap-3'>
        <Button type='submit' disabled={isSubmitting} size='lg'>
          {isSubmitting ? 'Saving...' : 'Save Footer Menu Settings'}
        </Button>
      </div>
    </form>
  )
}
