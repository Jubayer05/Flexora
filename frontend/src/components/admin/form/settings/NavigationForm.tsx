'use client'

import CustomInput from '@/components/common/CustomInput'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { showError } from '@/lib/errMsg'
import { navigationSchema, NavSettings } from '@/lib/validations/schemas/navigations'
import requests from '@/services/network/http'
import { zodResolver } from '@hookform/resolvers/zod'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

type TProps = {
  settingsKey: string
  initialValues?: NavSettings
  refetch?: () => void
  allowChild?: boolean
}

// NavigationGroup component for individual nav groups
const NavigationGroup = ({
  control,
  navIndex,
  onRemove,
  canRemove,
  errors,
  allowChild
}: {
  control: any
  navIndex: number
  onRemove: () => void
  canRemove: boolean
  errors: any
  allowChild?: boolean
}) => {
  const {
    fields: menuItems,
    append: appendMenuItem,
    remove: removeMenuItem
  } = useFieldArray({
    control,
    name: `navItems.${navIndex}.children`
  })

  return (
    <Card className='border-dashed'>
      <CardHeader>
        <div className='flex justify-between items-center'>
          <CardTitle className='text-lg'>#{navIndex + 1}</CardTitle>
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
        <div className='space-y-2'>
          <Controller
            control={control}
            name={`navItems.${navIndex}.name`}
            render={({ field }) => (
              <CustomInput
                label='Title'
                placeholder='Menu title (e.g., Company, Support)'
                {...field}
                error={errors?.navItems?.[navIndex]?.name?.message}
              />
            )}
          />

          <Controller
            control={control}
            name={`navItems.${navIndex}.url`}
            render={({ field }) => (
              <CustomInput label='URL (optional)' placeholder='/category, /products' {...field} />
            )}
          />
        </div>
        {allowChild && (
          <>
            <Separator />

            <div className='space-y-4'>
              <Label className='font-medium text-base'>Menu Items</Label>
              {menuItems.map((item, itemIndex) => (
                <div key={item.id} className='flex items-end gap-4'>
                  <div className='flex-1 space-y-2'>
                    <Controller
                      control={control}
                      name={`navItems.${navIndex}.children.${itemIndex}.title`}
                      render={({ field }) => (
                        <CustomInput
                          label='Title'
                          placeholder='Link title'
                          {...field}
                          error={
                            errors?.navItems?.[navIndex]?.children?.[itemIndex]?.title?.message
                          }
                        />
                      )}
                    />
                  </div>
                  <div className='flex-1 space-y-2'>
                    <Controller
                      control={control}
                      name={`navItems.${navIndex}.children.${itemIndex}.url`}
                      render={({ field }) => (
                        <CustomInput
                          label='URL'
                          placeholder='/privacy-policy'
                          {...field}
                          error={errors?.navItems?.[navIndex]?.children?.[itemIndex]?.url?.message}
                        />
                      )}
                    />
                  </div>
                  <div className='flex gap-2 mb-2'>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={() => removeMenuItem(itemIndex)}
                      disabled={menuItems.length === 1}
                    >
                      <Minus className='w-4 h-4' />
                    </Button>
                    {itemIndex === menuItems.length - 1 && (
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={() => appendMenuItem({ title: '', url: '' })}
                        disabled={menuItems.length >= 20}
                      >
                        <Plus className='w-4 h-4' />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

const NavigationForm = ({ settingsKey, initialValues, refetch, allowChild = true }: TProps) => {
  const {
    handleSubmit,
    control,
    formState: { errors, isSubmitting }
  } = useForm<{ navItems: NavSettings }>({
    resolver: zodResolver(z.object({ navItems: navigationSchema })),
    defaultValues: {
      navItems: initialValues || [{ name: '', url: '', children: [{ title: '', url: '' }] }]
    }
  })

  const {
    fields: navGroups,
    append: appendNavGroup,
    remove: removeNavGroup
  } = useFieldArray({
    control,
    name: 'navItems'
  })

  const onSubmit = handleSubmit(async (data) => {
    try {
      const res = await requests.post(`/admin/settings/${settingsKey}`, {
        value: data.navItems
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
    <Card>
      <CardHeader>
        <CardTitle>Navigation Settings {settingsKey}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className='space-y-6'>
          {navGroups.map((navGroup, navIndex) => (
            <NavigationGroup
              key={navGroup.id}
              control={control}
              navIndex={navIndex}
              onRemove={() => removeNavGroup(navIndex)}
              canRemove={navGroups.length > 1}
              errors={errors}
              allowChild={allowChild}
            />
          ))}

          <Button
            type='button'
            variant='outline'
            onClick={() =>
              appendNavGroup({ name: '', url: '', children: [{ title: '', url: '' }] })
            }
            disabled={navGroups.length >= 10}
            className='flex items-center gap-2'
          >
            <Plus className='w-4 h-4' />
            Add Nav Group
          </Button>

          <Button type='submit' disabled={isSubmitting} className='w-full'>
            {isSubmitting ? 'Saving...' : initialValues ? 'Update Settings' : 'Save Settings'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default NavigationForm
