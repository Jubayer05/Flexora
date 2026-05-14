'use client'

import CustomInput from '@/components/common/CustomInput'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { showError } from '@/lib/errMsg'
import { FaqSettings, faqSettingsSchema } from '@/lib/validations/schemas/faqSettings'
import requests from '@/services/network/http'
import { zodResolver } from '@hookform/resolvers/zod'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { toast } from 'sonner'

type TProps = {
  settingsKey: string
  initialValues?: FaqSettings
  refetch?: () => void
}

// FaqGroupCard component for individual FAQ groups
const FaqGroupCard = ({
  control,
  groupIndex,
  onRemove,
  canRemove,
  errors
}: {
  control: any
  groupIndex: number
  onRemove: () => void
  canRemove: boolean
  errors: any
}) => {
  const {
    fields: faqFields,
    append: appendFaq,
    remove: removeFaq
  } = useFieldArray({
    control,
    name: `groups.${groupIndex}.faqs`
  })

  return (
    <Card className='border-dashed'>
      <CardHeader>
        <div className='flex justify-between items-center'>
          <CardTitle className='text-lg'>Group #{groupIndex + 1}</CardTitle>
          <Button
            type='button'
            variant='destructive'
            size='sm'
            onClick={onRemove}
            disabled={!canRemove}
            className='flex items-center gap-2'
          >
            <Trash2 className='w-4 h-4' />
            Remove
          </Button>
        </div>
      </CardHeader>
      <CardContent className='space-y-4'>
        <Controller
          control={control}
          name={`groups.${groupIndex}.name`}
          render={({ field }) => (
            <CustomInput
              label='Group Name'
              placeholder='Enter group name'
              error={errors?.groups?.[groupIndex]?.name?.message}
              {...field}
              value={field.value ?? ''}
            />
          )}
        />

        <Separator />

        <div className='space-y-4'>
          <Label className='font-medium text-base'>FAQs</Label>
          {faqFields.map((faqField, faqIndex) => (
            <div key={faqField.id} className='space-y-4 p-4 border rounded-lg'>
              <div className='flex justify-between items-center'>
                <Label className='font-medium text-sm'>FAQ #{faqIndex + 1}</Label>
                <div className='flex gap-2'>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={() => removeFaq(faqIndex)}
                    disabled={faqFields.length === 1}
                  >
                    <Minus className='w-4 h-4' />
                  </Button>
                  {faqIndex === faqFields.length - 1 && (
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={() => appendFaq({ question: '', answer: '' })}
                      disabled={faqFields.length >= 20}
                    >
                      <Plus className='w-4 h-4' />
                    </Button>
                  )}
                </div>
              </div>

              <Controller
                control={control}
                name={`groups.${groupIndex}.faqs.${faqIndex}.question`}
                render={({ field }) => (
                  <CustomInput
                    label='Question'
                    placeholder='Enter FAQ question'
                    error={errors?.groups?.[groupIndex]?.faqs?.[faqIndex]?.question?.message}
                    {...field}
                    value={field.value ?? ''}
                  />
                )}
              />

              <Controller
                control={control}
                name={`groups.${groupIndex}.faqs.${faqIndex}.answer`}
                render={({ field }) => (
                  <CustomInput
                    label='Answer'
                    type='textarea'
                    rows={3}
                    placeholder='Enter FAQ answer'
                    error={errors?.groups?.[groupIndex]?.faqs?.[faqIndex]?.answer?.message}
                    {...field}
                    value={field.value ?? ''}
                  />
                )}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

const FaqForm = ({ settingsKey, initialValues, refetch }: TProps) => {
  const {
    handleSubmit,
    control,
    formState: { errors, isSubmitting }
  } = useForm<FaqSettings>({
    resolver: zodResolver(faqSettingsSchema),
    defaultValues: {
      title: initialValues?.title || '',
      description: initialValues?.description || '',
      groups: initialValues?.groups || [{ name: '', faqs: [{ question: '', answer: '' }] }]
    }
  })

  const {
    fields: groupFields,
    append: appendGroup,
    remove: removeGroup
  } = useFieldArray({
    control,
    name: 'groups'
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
          <CardTitle>FAQ Settings</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <Controller
            control={control}
            name='title'
            render={({ field }) => (
              <CustomInput
                label='Title'
                placeholder='Enter FAQ title'
                error={errors.title?.message}
                {...field}
                value={field.value ?? ''}
              />
            )}
          />

          <Controller
            control={control}
            name='description'
            render={({ field }) => (
              <CustomInput
                label='Description'
                type='textarea'
                rows={4}
                placeholder='Short description...'
                error={errors.description?.message}
                {...field}
                value={field.value ?? ''}
              />
            )}
          />
        </CardContent>
      </Card>

      <div className='space-y-4'>
        <Label className='font-semibold text-lg'>FAQ Groups</Label>

        {groupFields.map((groupField, groupIndex) => (
          <FaqGroupCard
            key={groupField.id}
            control={control}
            groupIndex={groupIndex}
            onRemove={() => removeGroup(groupIndex)}
            canRemove={groupFields.length > 1}
            errors={errors}
          />
        ))}

        <Button
          type='button'
          variant='outline'
          onClick={() => appendGroup({ name: '', faqs: [{ question: '', answer: '' }] })}
          disabled={groupFields.length >= 10}
          className='flex items-center gap-2'
        >
          <Plus className='w-4 h-4' />
          Add FAQ Group
        </Button>
      </div>

      <Button type='submit' disabled={isSubmitting} className='w-full'>
        {isSubmitting ? 'Saving...' : initialValues ? 'Update Settings' : 'Save Settings'}
      </Button>
    </form>
  )
}

export default FaqForm
