'use client'

import CustomInput from '@/components/common/CustomInput'
import FileUploader from '@/components/common/FileUploader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { showError } from '@/lib/errMsg'
import {
  homepageTestimonialSchema,
  HomepageTestimonialType
} from '@/lib/validations/schemas/testimonialSettings'
import requests from '@/services/network/http'
import { zodResolver } from '@hookform/resolvers/zod'
import { Minus, Plus } from 'lucide-react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { toast } from 'sonner'

type TProps = {
  settingsKey: string
  initialValues?: HomepageTestimonialType
  refetch?: () => void
}

const HomeTestimonial = ({ settingsKey, initialValues, refetch }: TProps) => {
  const {
    handleSubmit,
    control,
    formState: { errors, isSubmitting }
  } = useForm<HomepageTestimonialType>({
    resolver: zodResolver(homepageTestimonialSchema),
    defaultValues: {
      title: initialValues?.title || '',
      subTitle: initialValues?.subTitle || '',
      desc: initialValues?.desc || '',
      testimonials: initialValues?.testimonials || [
        { name: '', designation: '', company: '', avatar: '', rating: 5, review: '' }
      ]
    }
  })

  const {
    fields: testimonialFields,
    append: appendTestimonial,
    remove: removeTestimonial
  } = useFieldArray({
    control,
    name: 'testimonials'
  })

  const onSubmit = handleSubmit(async (data) => {
    try {
      const res = await requests.post(`/admin/settings/${settingsKey}`, {
        value: data
      })
      if (res?.success) {
        toast.success('Settings updated successfully!')
        refetch?.()
      }
    } catch (error) {
      showError(error)
    }
  })

  return (
    <form onSubmit={onSubmit} className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>Section Info</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <Controller
            control={control}
            name='title'
            render={({ field }) => (
              <CustomInput
                label='Title'
                placeholder='Enter section title'
                error={errors.title?.message}
                {...field}
                value={field.value ?? ''}
              />
            )}
          />

          <Controller
            control={control}
            name='subTitle'
            render={({ field }) => (
              <CustomInput
                label='Sub Title'
                placeholder='Enter section sub title'
                error={errors.subTitle?.message}
                {...field}
                value={field.value ?? ''}
              />
            )}
          />

          <Controller
            control={control}
            name='desc'
            render={({ field }) => (
              <CustomInput
                label='Description'
                type='textarea'
                rows={4}
                placeholder='Short description...'
                error={errors.desc?.message}
                {...field}
                value={field.value ?? ''}
              />
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Testimonial Items</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          {testimonialFields.map((testimonialField, testimonialIndex) => (
            <div
              key={testimonialField.id}
              className='space-y-4 p-4 border border-dashed rounded-lg'
            >
              <div className='flex justify-between items-center'>
                <Label className='font-medium text-sm'>Testimonial #{testimonialIndex + 1}</Label>
                <div className='flex gap-2'>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={() => removeTestimonial(testimonialIndex)}
                    disabled={testimonialFields.length === 1}
                  >
                    <Minus className='w-4 h-4' />
                  </Button>
                  {testimonialIndex === testimonialFields.length - 1 && (
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={() =>
                        appendTestimonial({
                          name: '',
                          designation: '',
                          company: '',
                          avatar: '',
                          rating: 5,
                          review: ''
                        })
                      }
                      disabled={testimonialFields.length >= 20}
                    >
                      <Plus className='w-4 h-4' />
                    </Button>
                  )}
                </div>
              </div>

              <div className='gap-4 grid grid-cols-1 md:grid-cols-2'>
                <Controller
                  control={control}
                  name={`testimonials.${testimonialIndex}.name`}
                  render={({ field }) => (
                    <CustomInput
                      label='Name'
                      placeholder='Customer name'
                      error={errors?.testimonials?.[testimonialIndex]?.name?.message}
                      {...field}
                      value={field.value ?? ''}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name={`testimonials.${testimonialIndex}.designation`}
                  render={({ field }) => (
                    <CustomInput
                      label='Designation'
                      placeholder='Job title'
                      error={errors?.testimonials?.[testimonialIndex]?.designation?.message}
                      {...field}
                      value={field.value ?? ''}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name={`testimonials.${testimonialIndex}.company`}
                  render={({ field }) => (
                    <CustomInput
                      label='Company'
                      placeholder='Company name'
                      error={errors?.testimonials?.[testimonialIndex]?.company?.message}
                      {...field}
                      value={field.value ?? ''}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name={`testimonials.${testimonialIndex}.rating`}
                  render={({ field }) => (
                    <CustomInput
                      label='Rating'
                      type='number'
                      placeholder='Rating (1-5)'
                      min={1}
                      max={5}
                      step={0.1}
                      error={errors?.testimonials?.[testimonialIndex]?.rating?.message}
                      {...field}
                      value={field.value ?? 5}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value)
                        if (isNaN(value)) return
                        const clampedValue = Math.min(Math.max(value, 1), 5)
                        const roundedValue = Math.round(clampedValue * 10) / 10
                        field.onChange(roundedValue)
                      }}
                    />
                  )}
                />

                <div className='space-y-2'>
                  <Label>Avatar</Label>
                  <Controller
                    control={control}
                    name={`testimonials.${testimonialIndex}.avatar`}
                    render={({ field }) => (
                      <FileUploader value={field.value || ''} onChangeAction={field.onChange} />
                    )}
                  />
                </div>
              </div>

              <Controller
                control={control}
                name={`testimonials.${testimonialIndex}.review`}
                render={({ field }) => (
                  <CustomInput
                    label='Review'
                    type='textarea'
                    rows={3}
                    placeholder='Customer testimonial/review'
                    error={errors?.testimonials?.[testimonialIndex]?.review?.message}
                    {...field}
                    value={field.value ?? ''}
                  />
                )}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Button type='submit' disabled={isSubmitting} size={'lg'}>
        {isSubmitting ? 'Saving...' : initialValues ? 'Update Settings' : 'Save Settings'}
      </Button>
    </form>
  )
}

export default HomeTestimonial
