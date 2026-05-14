'use client'

import CustomInput from '@/components/common/CustomInput'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { showError } from '@/lib/errMsg'
import { telegramSchema, TelegramSchema } from '@/lib/validations/schemas/telegram'
import requests from '@/services/network/http'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

type TProps = {
  settingsKey: string
  initialValues?: TelegramSchema | undefined
  refetch?: () => void
}

const TelegramSettings = ({ settingsKey, initialValues, refetch }: TProps) => {
  const {
    handleSubmit,
    control,
    getValues,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(telegramSchema),
    defaultValues: {
      general: {
        token: initialValues?.general?.token || '',
        chatId: initialValues?.general?.chatId || ''
      },
      order: {
        token: initialValues?.order?.token || '',
        chatId: initialValues?.order?.chatId || ''
      },
      transfer: {
        token: initialValues?.transfer?.token || '',
        chatId: initialValues?.transfer?.chatId || ''
      },
      premium: {
        token: initialValues?.premium?.token || '',
        chatId: initialValues?.premium?.chatId || ''
      }
    }
  })

  const testNotification = async (type: 'general' | 'order' | 'transfer' | 'premium') => {
    try {
      const section = getValues(type)

      if (!section?.token || !section?.chatId) {
        toast.error('Please enter both bot token and chat ID first.')
        return
      }

      const res = await requests.post('/admin/telegram/test-config', {
        type,
        token: section.token,
        chatId: section.chatId
      })

      if (res?.success) {
        toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} notification sent successfully!`)
      }
    } catch (error) {
      showError(error)
    }
  }

  const renderSection = (
    type: 'general' | 'order' | 'transfer' | 'premium',
    title: string,
    tokenPlaceholder: string,
    chatPlaceholder: string
  ) => (
    <Card>
      <CardHeader className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <CardTitle>{title}</CardTitle>
        <Button type='button' variant='outline' onClick={() => testNotification(type)}>
          Send Test Notification
        </Button>
      </CardHeader>
      <CardContent>
        <div className='space-y-4'>
          <Controller
            control={control}
            name={`${type}.token`}
            render={({ field }) => (
              <CustomInput
                label='Bot Token'
                placeholder={tokenPlaceholder}
                error={errors[type]?.token?.message}
                {...field}
                value={field.value ?? ''}
              />
            )}
          />

          <Controller
            control={control}
            name={`${type}.chatId`}
            render={({ field }) => (
              <CustomInput
                label='Chat ID'
                placeholder={chatPlaceholder}
                error={errors[type]?.chatId?.message}
                {...field}
                value={field.value ?? ''}
              />
            )}
          />
        </div>
      </CardContent>
    </Card>
  )

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
      {renderSection(
        'general',
        'General Notifications',
        'Enter Telegram bot token',
        'Enter Telegram chat ID'
      )}

      {renderSection(
        'order',
        'Order Notifications',
        'Enter Telegram bot token for orders',
        'Enter Telegram chat ID for orders'
      )}

      {renderSection(
        'transfer',
        'Transfer Notifications',
        'Enter Telegram bot token for transfers',
        'Enter Telegram chat ID for transfers'
      )}

      {renderSection(
        'premium',
        'Premium Notifications',
        'Enter Telegram bot token for premium updates',
        'Enter Telegram chat ID for premium updates'
      )}
      
      <div className='flex justify-center sm:justify-start'> 
      <Button type='submit' size={'lg'}>
        {isSubmitting ? 'Submitting...' : initialValues ? 'Update Settings' : 'Save Settings'}
      </Button>
       </div>
    </form>
  )
}

export default TelegramSettings
