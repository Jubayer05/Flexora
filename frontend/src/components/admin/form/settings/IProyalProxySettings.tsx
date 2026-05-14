'use client'

import CustomInput from '@/components/common/CustomInput'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select'
import { showError } from '@/lib/errMsg'
import requests from '@/services/network/http'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, ExternalLink, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

const iproyalProxySchema = z.object({
  host: z.string().min(1, 'Host is required'),
  port: z.coerce.number().min(1, 'Port must be greater than 0').max(65535, 'Invalid port number'),
  type: z.enum(['SOCKS5', 'HTTP']),
  username: z.string().optional(),
  password: z.string().optional()
})

type IProyalProxySchema = z.infer<typeof iproyalProxySchema>

type TProps = {
  settingsKey: string
  initialValues?: IProyalProxySchema | undefined
  refetch?: () => void
}

const IProyalProxySettings = ({ settingsKey, initialValues, refetch }: TProps) => {
  const [showPassword, setShowPassword] = useState(false)

  const {
    handleSubmit,
    control,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(iproyalProxySchema),
    defaultValues: {
      host: initialValues?.host || '',
      port: initialValues?.port || 32325,
      type: initialValues?.type || 'SOCKS5',
      username: initialValues?.username || '',
      password: initialValues?.password || ''
    }
  })

  const onSubmit = handleSubmit(async (data) => {
    try {
      const res = await requests.post(`/admin/settings/${settingsKey}`, {
        value: data
      })
      if (res?.success) {
        toast.success('IP Royal proxy configuration updated successfully!')
        refetch?.()
      }
    } catch (error) {
      showError(error)
    }
  })

  return (
    <form onSubmit={onSubmit} className='space-y-6'>
      <Card className='border-yellow-500/20 bg-yellow-500/5'>
        <CardHeader>
          <div className='flex items-start gap-2'>
            <AlertCircle className='h-5 w-5 text-yellow-500 mt-0.5' />
            <div className='flex-1'>
              <CardTitle className='text-base'>Important Setup Information</CardTitle>
              <CardDescription className='mt-2 space-y-2'>
                <p>
                  Get your IP Royal proxy credentials from:{' '}
                  <a
                    href='https://iproyal.com/dashboard'
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-blue-400 hover:underline inline-flex items-center gap-1'
                  >
                    IP Royal Dashboard
                    <ExternalLink className='h-3 w-3' />
                  </a>
                </p>
                <p className='text-xs'>
                  Navigate to: Dashboard → My Proxies → Setup → Authentication
                </p>
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Proxy Server Configuration</CardTitle>
          <CardDescription>Configure your IP Royal proxy endpoint</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            <Controller
              control={control}
              name='host'
              render={({ field }) => (
                <CustomInput
                  label='Host / Server Address'
                  placeholder='geo.iproyal.com'
                  error={errors.host?.message}
                  {...field}
                  value={field.value ?? ''}
                  helperText='The proxy server hostname or IP address'
                />
              )}
            />

            <Controller
              control={control}
              name='port'
              render={({ field }) => (
                <CustomInput
                  label='Port'
                  type='number'
                  placeholder='32325'
                  error={errors.port?.message}
                  {...field}
                  value={String(field.value ?? '')}
                  helperText='The proxy server port number (1-65535)'
                />
              )}
            />

            <div className='space-y-2'>
              <label className='text-sm font-medium'>Proxy Type</label>
              <Controller
                control={control}
                name='type'
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder='Select proxy type' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='SOCKS5'>SOCKS5 (Recommended)</SelectItem>
                      <SelectItem value='HTTP'>HTTP</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.type && <p className='text-sm text-red-500'>{errors.type.message}</p>}
              <p className='text-xs text-muted-foreground'>
                SOCKS5 is recommended for better reliability with Telegram API
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Authentication (Optional)</CardTitle>
          <CardDescription>
            Required if your proxy uses username/password authentication
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            <Controller
              control={control}
              name='username'
              render={({ field }) => (
                <CustomInput
                  label='Username'
                  placeholder='customer-yourname-country-us'
                  error={errors.username?.message}
                  {...field}
                  value={field.value ?? ''}
                  helperText='Your IP Royal proxy username (may include session parameters)'
                />
              )}
            />

            <div className='space-y-2'>
              <label className='text-sm font-medium'>Password</label>
              <div className='relative'>
                <Controller
                  control={control}
                  name='password'
                  render={({ field }) => (
                    <CustomInput
                      type={showPassword ? 'text' : 'password'}
                      placeholder='••••••••••••'
                      error={errors.password?.message}
                      {...field}
                      value={field.value ?? ''}
                      className='pr-10'
                    />
                  )}
                />
                <button
                  type='button'
                  onClick={() => setShowPassword(!showPassword)}
                  className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-card-foreground'
                >
                  {showPassword ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
                </button>
              </div>
              <p className='text-xs text-muted-foreground'>
                Your IP Royal proxy password (NOT your account password)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className='border-blue-500/20 bg-blue-500/5'>
        <CardHeader>
          <CardTitle className='text-base'>What Happens Next?</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className='text-sm space-y-2 text-muted-foreground'>
            <li className='flex items-start gap-2'>
              <span className='text-green-400 mt-0.5'>✓</span>
              <span>All new Telegram accounts will automatically use this proxy</span>
            </li>
            <li className='flex items-start gap-2'>
              <span className='text-green-400 mt-0.5'>✓</span>
              <span>Existing accounts can be updated via &quot;Assign New Proxy&quot; action</span>
            </li>
            <li className='flex items-start gap-2'>
              <span className='text-green-400 mt-0.5'>✓</span>
              <span>Customer OTP requests will use this proxy for protection</span>
            </li>
            <li className='flex items-start gap-2'>
              <span className='text-green-400 mt-0.5'>✓</span>
              <span>Session creation and all Telegram operations will be proxied</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      <div className='flex gap-3'>
        <Button type='submit' size='lg' disabled={isSubmitting}>
          {isSubmitting
            ? 'Saving...'
            : initialValues
            ? 'Update Proxy Configuration'
            : 'Save Proxy Configuration'}
        </Button>
        {initialValues && (
          <Button
            type='button'
            variant='outline'
            size='lg'
            onClick={() => refetch?.()}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}

export default IProyalProxySettings
