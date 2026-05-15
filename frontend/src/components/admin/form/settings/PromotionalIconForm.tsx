'use client'

import CustomInput from '@/components/common/CustomInput'
import CustomLink from '@/components/common/CustomLink'
import FileUploader from '@/components/common/FileUploader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { showError } from '@/lib/errMsg'
import {
  PromotionalIconsSchema,
  PromotionalIconsType
} from '@/lib/validations/schemas/promotionalIcon'
import requests from '@/services/network/http'
import { zodResolver } from '@hookform/resolvers/zod'
import { ExternalLink, ImageIcon, Plus, Trash2 } from 'lucide-react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { toast } from 'sonner'

type TProps = {
  settingsKey: string
  initialValues?: PromotionalIconsType | undefined
  refetch?: () => void
}

const PromotionalIconForm = ({ settingsKey, initialValues, refetch }: TProps) => {
  const {
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<PromotionalIconsType>({
    resolver: zodResolver(PromotionalIconsSchema),
    defaultValues: {
      icons: initialValues?.icons || [
        {
          icon: '',
          name: '',
          url: '',
          isActive: true
        }
      ]
    }
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'icons'
  })

  const watchedIcons = watch('icons')

  const onSubmit = handleSubmit(async (data) => {
    try {
      const res = await requests.post(`/admin/settings/${settingsKey}`, {
        value: data
      })
      if (res?.success) {
        toast.success('Promotional icons updated successfully!')
        refetch?.()
      }
    } catch (error) {
      showError(error)
    }
  })

  const addIcon = () => {
    append({
      icon: '',
      name: '',
      url: '',
      isActive: true
    })
  }

  const removeIcon = (index: number) => {
    if (fields.length > 1) {
      remove(index)
    }
  }

  return (
    <form onSubmit={onSubmit} className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <ImageIcon className='w-5 h-5' />
            Promotional Icons
          </CardTitle>
          <p className='text-muted-foreground text-sm'>
            Configure promotional icons with image, name, URL and active status. Maximum 10 icons
            allowed.
          </p>
        </CardHeader>

        <CardContent className='space-y-6'>
          {fields.map((field, index) => {
            const watchedUrl = watchedIcons?.[index]?.url

            return (
              <Card key={field.id} className='p-4 border-dashed'>
                <div className='flex justify-between items-center'>
                  <h3 className='font-medium text-sm'>Icon {index + 1}</h3>
                  {fields.length > 1 && (
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={() => removeIcon(index)}
                      // className='text-red-600 hover:text-red-700'
                    >
                      <Trash2 className='w-4 h-4' />
                    </Button>
                  )}
                </div>

                <div className='gap-4 grid'>
                  {/* Name Field */}
                  <div className='space-y-2'>
                    <label className='font-medium text-sm'>Name</label>
                    <Controller
                      control={control}
                      name={`icons.${index}.name`}
                      render={({ field }) => (
                        <CustomInput
                          placeholder='Enter promotional icon name'
                          error={errors.icons?.[index]?.name?.message}
                          {...field}
                          value={field.value || ''}
                        />
                      )}
                    />
                  </div>

                  {/* URL Field */}
                  <div className='space-y-2'>
                    <label className='font-medium text-sm'>URL</label>
                    <div className='flex gap-2'>
                      <Controller
                        control={control}
                        name={`icons.${index}.url`}
                        render={({ field }) => (
                          <CustomInput
                            placeholder='https://example.com'
                            error={errors.icons?.[index]?.url?.message}
                            {...field}
                            value={field.value || ''}
                            className='flex-1'
                          />
                        )}
                      />
                      {watchedUrl && (
                        <CustomLink
                          href={watchedUrl}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='text-muted-foreground hover:text-primary transition-colors'
                        >
                          <Button type='button' variant='outline' size='sm'>
                            <ExternalLink className='w-4 h-4' />
                          </Button>
                        </CustomLink>
                      )}
                    </div>
                  </div>

                  {/* Active Status */}
                  <div className='flex justify-between items-center rounded-lg border border-border p-3'>
                    <div>
                      <label className='font-medium text-sm'>Active Status</label>
                      <p className='text-muted-foreground text-xs'>
                        Control whether this promotional icon is displayed
                      </p>
                    </div>
                    <Controller
                      control={control}
                      name={`icons.${index}.isActive`}
                      render={({ field }) => (
                        <div className='flex items-center gap-2'>
                          <span className='text-muted-foreground text-sm'>
                            {field.value ? 'Active' : 'Inactive'}
                          </span>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </div>
                      )}
                    />
                  </div>

                  {/* Icon URL Field */}
                  <div className='space-y-2'>
                    <label className='block font-medium text-sm'>Icon</label>
                    <Controller
                      control={control}
                      name={`icons.${index}.icon`}
                      render={({ field }) => (
                        <FileUploader
                          value={field.value || ''}
                          onChangeAction={field.onChange}
                          maxAllow={1}
                          size='small'
                        />
                      )}
                    />
                    {errors.icons?.[index]?.icon && (
                      <p className='mt-1 text-red-600 text-sm'>
                        {errors.icons?.[index]?.icon?.message}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}

          {/* Add More Button */}
          {fields.length < 10 && (
            <div className='flex justify-center'>
              <Button type='button' variant='outline' onClick={addIcon} className='gap-2'>
                <Plus className='w-4 h-4' />
                Add More Icon
              </Button>
            </div>
          )}

          {/* Submit Button */}
          <div className='flex justify-end border-t border-border pt-4'>
            <Button type='submit' disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Promotional Icons'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}

export default PromotionalIconForm
