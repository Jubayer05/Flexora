'use client'

import CustomInput from '@/components/common/CustomInput'
import { CustomSelect } from '@/components/common/CustomSelect'
import FileUploader from '@/components/common/FileUploader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { showError } from '@/lib/errMsg'
import {
  DiscountType,
  paymentMethodSchema,
  PaymentMethodType
} from '@/lib/validations/schemas/gateway'
import requests from '@/services/network/http'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

interface GatewayFormProps {
  initialValues?: PaymentMethodType | null
  onClose?: () => void
  onSuccess?: () => void
}

const gatewayOptions = [
  { value: 'stripe', label: 'Stripe' },
  { value: 'nowpayments', label: 'NOWPayments' },
  { value: 'plisio', label: 'Plisio' },
  { value: 'cryptomus', label: 'Cryptomus' },
  { value: 'paygate', label: 'Paygate' },
  { value: 'volet', label: 'Volet' },
  { value: 'binance', label: 'Binance' }
]

const feeTypeOptions = [
  { value: DiscountType.FIXED, label: 'Fixed Amount' },
  { value: DiscountType.PERCENTAGE, label: 'Percentage' }
]

// Helper to check if a value is masked (contains bullet points)
const isMaskedValue = (value: string | null | undefined): boolean => {
  if (!value) return false
  return value.includes('•')
}

// Helper to check if a credential should be sent to backend
// Returns true if:
// - It's a new record (not editing)
// - The value is not masked (user entered a real value)
// - The value is empty string (user wants to clear it)
// - Original was null/undefined and user entered a value
const shouldSendCredential = (
  isEditing: boolean,
  original: string | null | undefined,
  current: string | null | undefined
): boolean => {
  if (!isEditing) {
    // New record - send if provided (even if empty)
    return current !== undefined
  }
  
  // Editing - send if:
  // 1. Value is empty string (clearing)
  if (current === '' || current === null) return true
  
  // 2. No current value provided
  if (!current || current === undefined) return false
  
  // 3. Original was null/undefined (not configured) and user entered a value
  if ((!original || original === null || original === undefined) && current && !isMaskedValue(current)) {
    return true
  }
  
  // 4. Original was masked and current is not masked (user replaced masked value)
  if (isMaskedValue(original) && !isMaskedValue(current)) {
    return true
  }
  
  // 5. Original was not masked and current is different
  if (original && !isMaskedValue(original) && current !== original) {
    return true
  }
  
  return false
}

export const GatewayForm = ({ initialValues, onClose, onSuccess }: GatewayFormProps) => {
  const [loading, setLoading] = useState(false)
  const isEditing = Boolean(initialValues)

  const {
    watch,
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<PaymentMethodType>({
    resolver: zodResolver(paymentMethodSchema),
    defaultValues: {
      name: initialValues?.name ?? '',
      gateway: initialValues?.gateway ?? '',
      // Load masked credentials if editing (they'll be masked from backend)
      apiKey: initialValues?.apiKey ?? undefined,
      apiSecret: initialValues?.apiSecret ?? undefined,
      merchantId: initialValues?.merchantId ?? undefined,
      webhookSecret: initialValues?.webhookSecret ?? undefined,
      minAmount: Number(initialValues?.minAmount) || 0,
      bonusThreshold: Number(initialValues?.bonusThreshold) || 0,
      bonus: Number(initialValues?.bonus) || 0,
      feeType: initialValues?.feeType ?? DiscountType.PERCENTAGE,
      feeValue: Number(initialValues?.feeValue) || 0,
      isActive: initialValues?.isActive ?? true
    }
  })

  const onSubmit = async (data: PaymentMethodType) => {
    setLoading(true)
    try {
      // Prepare payload - only include credentials if they've been changed
      const payload: any = { ...data }

      // For credentials, only send if they should be updated
      // Always trim values before checking
      if (payload.apiKey !== undefined) {
        const trimmed = typeof payload.apiKey === 'string' ? payload.apiKey.trim() : payload.apiKey
        if (!shouldSendCredential(isEditing, initialValues?.apiKey, trimmed)) {
          delete payload.apiKey
        } else {
          payload.apiKey = trimmed && trimmed.length > 0 ? trimmed : null
        }
      }

      if (payload.apiSecret !== undefined) {
        const trimmed = typeof payload.apiSecret === 'string' ? payload.apiSecret.trim() : payload.apiSecret
        if (!shouldSendCredential(isEditing, initialValues?.apiSecret, trimmed)) {
          delete payload.apiSecret
        } else {
          payload.apiSecret = trimmed && trimmed.length > 0 ? trimmed : null
        }
      }

      if (payload.merchantId !== undefined) {
        const trimmed = typeof payload.merchantId === 'string' ? payload.merchantId.trim() : payload.merchantId
        if (!shouldSendCredential(isEditing, initialValues?.merchantId, trimmed)) {
          delete payload.merchantId
        } else {
          payload.merchantId = trimmed && trimmed.length > 0 ? trimmed : null
        }
      }

      if (payload.webhookSecret !== undefined) {
        const trimmed = typeof payload.webhookSecret === 'string' ? payload.webhookSecret.trim() : payload.webhookSecret
        if (!shouldSendCredential(isEditing, initialValues?.webhookSecret, trimmed)) {
          delete payload.webhookSecret
        } else {
          payload.webhookSecret = trimmed && trimmed.length > 0 ? trimmed : null
        }
      }

      // Debug log to see what's being sent
      console.log('[GatewayForm] Submitting payload:', {
        ...payload,
        apiKey: payload.apiKey ? `${payload.apiKey.substring(0, 10)}...` : null,
        apiSecret: payload.apiSecret ? `${payload.apiSecret.substring(0, 10)}...` : null,
        webhookSecret: payload.webhookSecret ? `${payload.webhookSecret.substring(0, 10)}...` : null,
      })

      if (isEditing) {
        await requests.put(`/admin/payment-methods/${initialValues?.id}`, payload)
        toast.success('Payment method updated successfully!')
      } else {
        await requests.post('/admin/payment-methods', payload)
        toast.success('Payment method created successfully!')
      }
      onSuccess?.()
      onClose?.()
    } catch (error) {
      setLoading(false)
      showError(error)
    }
  }

  const selectedFeeType = watch('feeType')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
      {/* Basic Details */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex flex-wrap [&>*]:flex-[1_1_calc(50%-1.5rem)] items-end gap-4 w-full'>
            <Controller
              name='name'
              control={control}
              render={({ field }) => (
                <CustomInput
                  label='Payment Method Name'
                  {...field}
                  placeholder='e.g., Binance Pay'
                  error={errors.name?.message}
                  required
                />
              )}
            />

            <Controller
              name='gateway'
              control={control}
              render={({ field }) => (
                <div className='space-y-1'>
                  <CustomSelect
                    label='Gateway'
                    staticOptions={gatewayOptions}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder='Select gateway'
                  />
                  {errors.gateway && (
                    <p className='text-red-500 text-sm'>{errors.gateway?.message}</p>
                  )}
                </div>
              )}
            />

            {/* Branding */}
            <div className=''>
              <Label className='mb-2'>Icon</Label>
              <Controller
                control={control}
                name='thumbnail'
                render={({ field }) => (
                  <FileUploader
                    value={field.value || ''}
                    onChangeAction={field.onChange}
                    maxAllow={1}
                    size='small'
                  />
                )}
              />
              {errors.thumbnail && (
                <span className='font-medium text-red-500 text-xs'>{errors.thumbnail.message}</span>
              )}
            </div>

            {/* Status */}
            <div className=''>
              <Label className='mb-2'>Status</Label>
              <Controller
                name='isActive'
                control={control}
                render={({ field }) => (
                  <CustomInput
                    type='switch'
                    label={field.value ? 'Active' : 'Inactive'}
                    checked={!!field.value}
                    onCheckedChange={field.onChange}
                    error={errors.isActive?.message}
                  />
                )}
              />
              {errors.isActive && (
                <span className='font-medium text-red-500 text-xs'>{errors.isActive.message}</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Credentials */}
      <Card>
        <CardHeader>
          <CardTitle>Credentials</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <Controller
            name='apiKey'
            control={control}
            render={({ field }) => {
              const isMasked = isMaskedValue(field.value)
              const isEmpty = !field.value
              const isRequired = watch('gateway') === 'stripe' || watch('gateway') === 'nowpayments' || watch('gateway') === 'plisio' || watch('gateway') === 'cryptomus'
              
              const statusText = isEditing && isEmpty && isRequired
                ? ' (Required - Not configured)'
                : isEditing && isMasked
                ? ' (Configured - enter new value to update)'
                : ''
              
              const gatewayName = watch('gateway') || ''
              const isStripe = gatewayName === 'stripe'
              
              return (
                <div>
                  <CustomInput
                    label={`API Key${statusText}`}
                    {...field}
                    value={field.value ?? ''}
                    placeholder={
                      isEditing && isMasked
                        ? 'Enter new API key to update'
                        : isEditing && isEmpty && isRequired
                        ? '⚠️ Required: Enter API key'
                        : 'Enter API key (optional)'
                    }
                    error={errors.apiKey?.message}
                    type={isMasked ? 'password' : 'text'}
                  />
                  {isEditing && isEmpty && isRequired && (
                    <p className='text-red-500 text-xs mt-1'>⚠️ This field is required for {gatewayName} gateway</p>
                  )}
                  {isEditing && isMasked && (
                    <p className='text-green-500 text-xs mt-1'>✓ Credential is configured. Enter a new value to update it.</p>
                  )}
                  {isStripe && !isMasked && (
                    <p className='text-blue-500 text-xs mt-1'>
                      💡 For Stripe: Use your <strong>Secret Key</strong> (starts with <code>sk_test_</code> or <code>sk_live_</code>). 
                      Do NOT use the publishable key (<code>pk_test_</code> or <code>pk_live_</code>).
                    </p>
                  )}
                </div>
              )
            }}
          />

          <Controller
            name='apiSecret'
            control={control}
            render={({ field }) => {
              const isMasked = isMaskedValue(field.value)
              const isEmpty = !field.value
              const isRequired = watch('gateway') === 'nowpayments' || watch('gateway') === 'plisio'
              
              const gatewayName = watch('gateway') || ''
              const statusText = isEditing && isEmpty && isRequired
                ? ' (Required - Not configured)'
                : isEditing && isMasked
                ? ' (Configured - enter new value to update)'
                : ''
              
              return (
                <div>
                  <CustomInput
                    label={`API Secret${statusText}`}
                    type='password'
                    {...field}
                    value={field.value ?? ''}
                    placeholder={
                      isEditing && isMasked
                        ? 'Enter new API secret to update'
                        : isEditing && isEmpty && isRequired
                        ? '⚠️ Required: Enter API secret'
                        : 'Enter API secret (optional)'
                    }
                    error={errors.apiSecret?.message}
                  />
                  {isEditing && isEmpty && isRequired && (
                    <p className='text-red-500 text-xs mt-1'>⚠️ This field is required for {gatewayName} gateway</p>
                  )}
                  {isEditing && isMasked && (
                    <p className='text-green-500 text-xs mt-1'>✓ Credential is configured. Enter a new value to update it.</p>
                  )}
                </div>
              )
            }}
          />

          <Controller
            name='merchantId'
            control={control}
            render={({ field }) => {
              const isMasked = isMaskedValue(field.value)
              const isEmpty = !field.value
              const isRequired = watch('gateway') === 'cryptomus'
              
              const gatewayName = watch('gateway') || ''
              const statusText = isEditing && isEmpty && isRequired
                ? ' (Required - Not configured)'
                : isEditing && isMasked
                ? ' (Configured - enter new value to update)'
                : ''
              
              return (
                <div>
                  <CustomInput
                    label={`Merchant ID${statusText}`}
                    {...field}
                    value={field.value ?? ''}
                    placeholder={
                      isEditing && isMasked
                        ? 'Enter new merchant ID to update'
                        : isEditing && isEmpty && isRequired
                        ? '⚠️ Required: Enter merchant ID'
                        : 'Enter merchant ID (optional)'
                    }
                    error={errors.merchantId?.message}
                    type={isMasked ? 'password' : 'text'}
                  />
                  {isEditing && isEmpty && isRequired && (
                    <p className='text-red-500 text-xs mt-1'>⚠️ This field is required for {gatewayName} gateway</p>
                  )}
                  {isEditing && isMasked && (
                    <p className='text-green-500 text-xs mt-1'>✓ Credential is configured. Enter a new value to update it.</p>
                  )}
                </div>
              )
            }}
          />

          <Controller
            name='webhookSecret'
            control={control}
            render={({ field }) => {
              const isMasked = isMaskedValue(field.value)
              const isEmpty = !field.value
              const isRequired = watch('gateway') === 'stripe'
              
              const gatewayName = watch('gateway') || ''
              const statusText = isEditing && isEmpty && isRequired
                ? ' (Required - Not configured)'
                : isEditing && isMasked
                ? ' (Configured - enter new value to update)'
                : ''
              
              const isStripe = watch('gateway') === 'stripe'
              
              return (
                <div>
                  <CustomInput
                    label={`Webhook Secret${statusText}`}
                    type='password'
                    {...field}
                    value={field.value ?? ''}
                    placeholder={
                      isEditing && isMasked
                        ? 'Enter new webhook secret to update'
                        : isEditing && isEmpty && isRequired
                        ? '⚠️ Required: Enter webhook secret'
                        : 'Enter webhook secret (optional)'
                    }
                    error={errors.webhookSecret?.message}
                  />
                  {isEditing && isEmpty && isRequired && (
                    <p className='text-red-500 text-xs mt-1'>⚠️ This field is required for {gatewayName} gateway</p>
                  )}
                  {isEditing && isMasked && (
                    <p className='text-green-500 text-xs mt-1'>✓ Credential is configured. Enter a new value to update it.</p>
                  )}
                  {isStripe && !isMasked && (
                    <p className='text-blue-500 text-xs mt-1'>
                      💡 For Stripe: Get this from <strong>Stripe Dashboard → Developers → Webhooks → [Your Webhook] → Signing secret</strong>. 
                      It starts with <code>whsec_</code>.
                    </p>
                  )}
                </div>
              )
            }}
          />
        </CardContent>
      </Card>

      {/* Limits & Bonuses */}
      <Card>
        <CardHeader>
          <CardTitle>Limits & Bonuses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex flex-wrap [&>*]:flex-[1_1_calc(50%-1.5rem)] gap-4 w-full'>
            <Controller
              name='minAmount'
              control={control}
              render={({ field }) => (
                <CustomInput
                  label='Minimum Amount'
                  type='number'
                  {...field}
                  value={field.value}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  placeholder='0'
                  error={errors.minAmount?.message}
                  min={0}
                  step={0.01}
                />
              )}
            />

            <Controller
              name='bonusThreshold'
              control={control}
              render={({ field }) => (
                <CustomInput
                  label='Bonus Threshold (Min Amount)'
                  type='number'
                  {...field}
                  value={field.value}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  placeholder='100'
                  error={errors.bonusThreshold?.message}
                  min={0}
                  step={0.01}
                />
              )}
            />

            <Controller
              name='bonus'
              control={control}
              render={({ field }) => (
                <CustomInput
                  label='Bonus Percentage (0-100%)'
                  type='number'
                  {...field}
                  value={field.value}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  placeholder='5'
                  error={errors.bonus?.message}
                  min={0}
                  max={100}
                  step={0.1}
                />
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* Fees */}
      <Card>
        <CardHeader>
          <CardTitle>Fees</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='gap-4 grid grid-cols-1 sm:grid-cols-2'>
            <Controller
              name='feeType'
              control={control}
              render={({ field }) => (
                <div className='space-y-1'>
                  <CustomSelect
                    label='Fee Type'
                    staticOptions={feeTypeOptions}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder='Select fee type'
                  />
                  {errors.feeType && (
                    <p className='text-red-500 text-sm'>{errors.feeType?.message}</p>
                  )}
                </div>
              )}
            />

            <Controller
              name='feeValue'
              control={control}
              render={({ field }) => (
                <CustomInput
                  label={`Fee Value ${selectedFeeType === DiscountType.PERCENTAGE ? '(%)' : '($)'}`}
                  type='number'
                  {...field}
                  value={field.value}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  placeholder={selectedFeeType === DiscountType.PERCENTAGE ? '2.5' : '1.00'}
                  error={errors.feeValue?.message}
                  min={0}
                  max={selectedFeeType === DiscountType.PERCENTAGE ? 100 : undefined}
                  step={selectedFeeType === DiscountType.PERCENTAGE ? 0.1 : 0.01}
                />
              )}
            />
          </div>
        </CardContent>
      </Card>

      <div className='flex sm:flex-row flex-col-reverse justify-end gap-3'>
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
            <>{isEditing ? 'Update Payment Method' : 'Create Payment Method'}</>
          )}
        </Button>
      </div>
    </form>
  )
}

export default GatewayForm
