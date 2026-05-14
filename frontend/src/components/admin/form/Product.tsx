'use client'

import CustomInput from '@/components/common/CustomInput'
import FileUploader from '@/components/common/FileUploader'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import useAsync from '@/hooks/useAsync'
import {
  PRODUCT_TYPE_VALUES,
  productTypes
} from '@/lib/constants/productTypes'
import { showError } from '@/lib/errMsg'
import { type CreateProduct, CreateProductSchema } from '@/lib/validations/schemas/product'
import requests from '@/services/network/http'
import useSerialStockStore from '@/services/state/serial-stock-state'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Controller, SubmitErrorHandler, SubmitHandler, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { mutate as globalMutate } from 'swr'
import ProductPreviewDialog from './ProductPreviewDialog'
import SerialStock from './SerialStock'
import { convertToSlug } from '@/lib/slugUtils'
import { Copy } from 'lucide-react'

type TProps = {
  initialData?: Product
  categories: Category[]
}

type DiscountMode = 'amount' | 'percent'

const DB_STOCK_MANAGED_TYPES = new Set(['SERIAL', 'ACCOUNT', 'TELEGRAM_ACCOUNTS'])
const PREMIUM_PRODUCT_TYPES = new Set(['PREMIUM_1M', 'PREMIUM_3M', 'PREMIUM_6M', 'PREMIUM_12M'])
const TELEGRAM_AUTO_DELIVERY_TYPES = new Set(['TELEGRAM_ACCOUNTS', 'ACCOUNT'])
const CREDENTIALS_STOCK_TYPES = new Set(['SERIAL'])
const TELEGRAM_TRANSFER_TYPES = new Set(['SERVICE', 'TELEGRAM_CHANNEL_GROUPS'])

function getResolvedStockCount(initialData?: Product) {
  if (!initialData) return 0

  const accountCount = (initialData as any)?._count?.accounts

  if (DB_STOCK_MANAGED_TYPES.has(String(initialData.type))) {
    return accountCount ?? initialData.stockCount ?? 0
  }

  return initialData.stockCount ?? 0
}

function getUploadedFileCount(fileValue: unknown) {
  if (Array.isArray(fileValue)) {
    return fileValue.filter((item) => typeof item === 'string' && item.trim().length > 0).length
  }

  if (typeof fileValue === 'string') {
    return fileValue.trim().length > 0 ? 1 : 0
  }

  return 0
}

function toFiniteNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : fallback
}

function getDiscountAmount(originalPrice: number, discountValue: number, discountMode: DiscountMode) {
  const safeOriginalPrice = Math.max(0, toFiniteNumber(originalPrice))
  const safeDiscountValue = Math.max(0, toFiniteNumber(discountValue))
  const rawDiscount =
    discountMode === 'percent'
      ? safeOriginalPrice * (Math.min(safeDiscountValue, 100) / 100)
      : safeDiscountValue

  return Math.min(safeOriginalPrice, Math.round(rawDiscount * 100) / 100)
}

function getProductFormDefaults(initialData?: Product): Partial<CreateProduct> {
  const initialProductGroupId =
    (initialData as any)?.productGroupId ?? (initialData as any)?.productGroup?.id

  return {
    name: initialData?.name ?? '',
    slug: initialData?.slug ?? '',
    categoryId: initialData?.categoryId ?? undefined,
    productGroupId: initialProductGroupId ?? undefined,
    platform: initialData?.platform ?? 'OTHER',
    description: initialData?.description ?? '',
    tags: Array.isArray(initialData?.tags)
      ? initialData?.tags.join(', ')
      : initialData?.tags ?? '',
    originalPrice: toFiniteNumber(initialData?.originalPrice),
    btnText: initialData?.btnText ?? '',
    type: initialData?.type ?? 'FILE',
    stockCount: getResolvedStockCount(initialData),
    minQuantity: initialData?.minQuantity && initialData.minQuantity >= 1 ? initialData.minQuantity : 1,
    maxQuantity:
      initialData?.maxQuantity !== undefined && initialData?.maxQuantity !== null
        ? Math.max(0, Number(initialData.maxQuantity) || 0)
        : 0,
    isActive: initialData?.isActive ?? true,
    isPrivate: initialData?.isPrivate ?? false,
    isFeatured: initialData?.isFeatured ?? false,
    thumbnail: initialData?.thumbnail ?? undefined,
    images: initialData?.images ?? [],
    privateUrl: initialData?.privateUrl ?? '',
    meta: {
      policy: initialData?.meta?.policy ?? '',
      filePath: initialData?.meta?.filePath
        ? Array.isArray(initialData.meta.filePath)
          ? initialData.meta.filePath.length > 0
            ? initialData.meta.filePath
            : undefined
          : initialData.meta.filePath
            ? initialData.meta.filePath
            : undefined
        : undefined,
      licenseType: initialData?.meta?.licenseType ?? 'ULTIMATE',
      clientInputLabel: initialData?.meta?.clientInputLabel ?? '',
      moreInformation: initialData?.meta?.moreInformation ?? ''
    },
    seo: {
      title: initialData?.seo?.title ?? '',
      description: initialData?.seo?.description ?? '',
      keywords: initialData?.seo?.keywords ?? ''
    }
  }
}

export default function ProductForm({ initialData, categories }: TProps) {
  const router = useRouter()
  const { items, clearAllItems, setItems } = useSerialStockStore()
  const [discount, setDiscount] = useState(0)
  const [discountMode, setDiscountMode] = useState<DiscountMode>('amount')
  const [skuRequestKey] = useState(
    () => (!initialData ? `/admin/products/generate-sku?nonce=${Date.now()}-${Math.random()}` : null)
  )
  const { data: sku, mutate: mutateSku } = useAsync(skuRequestKey)
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<CreateProduct>({
    resolver: zodResolver(CreateProductSchema) as any,
    mode: 'onSubmit',
    defaultValues: getProductFormDefaults(initialData)
  })

  useEffect(() => {
    reset(getProductFormDefaults(initialData))
  }, [initialData, reset])

  useEffect(() => {
    if (initialData) {
      const originalPrice = toFiniteNumber(initialData?.originalPrice)
      const currentPrice = toFiniteNumber(initialData?.price, originalPrice)
      const savedDiscountMode =
        (initialData as any)?.meta?.discountMode === 'percent' ? 'percent' : 'amount'
      const savedDiscountValue = toFiniteNumber((initialData as any)?.meta?.discountValue, NaN)
      setDiscountMode(savedDiscountMode)
      setDiscount(
        Number.isFinite(savedDiscountValue)
          ? savedDiscountValue
          : Math.max(0, Math.round((originalPrice - currentPrice) * 100) / 100)
      )
    }
  }, [initialData])

  const isPrivate = watch('isPrivate')
  const fileType = watch('type')
  const selectedPlatform = watch('platform')
  const fileLicenseType = watch('meta.licenseType') ?? 'ULTIMATE'
  const uploadedFileValue = watch('meta.filePath')
  const privateUrl = watch('privateUrl')
  const selectedCategoryId = watch('categoryId')
  const watchedMinQuantity = watch('minQuantity')
  const watchedMaxQuantity = watch('maxQuantity')
  const resolvedSku = initialData?.sku || sku?.data?.sku
  const { data: groupsData, loading: groupsLoading } = useAsync<{
    data: { productGroups?: ProductGroup[] } | ProductGroup[]
  }>(() =>
    selectedCategoryId
      ? `/admin/product-groups/all?categoryId=${selectedCategoryId}&limit=100`
      : null
  )

  const availableGroups: ProductGroup[] = Array.isArray(groupsData?.data)
    ? groupsData?.data
    : ((groupsData?.data as any)?.productGroups ?? [])
  const isFileProduct = fileType === PRODUCT_TYPE_VALUES.FILE
  const isPremiumProduct = PREMIUM_PRODUCT_TYPES.has(String(fileType))
  const isCredentialsStockProduct = CREDENTIALS_STOCK_TYPES.has(String(fileType))
  const isTelegramAutoDeliveryProduct =
    TELEGRAM_AUTO_DELIVERY_TYPES.has(String(fileType)) ||
    (selectedPlatform === 'TELEGRAM' &&
      !isFileProduct &&
      !isPremiumProduct &&
      !TELEGRAM_TRANSFER_TYPES.has(String(fileType)))
  const shouldShowInlineStockCount =
    !isFileProduct && !isTelegramAutoDeliveryProduct && !isPremiumProduct && !isCredentialsStockProduct
  const shouldShowMinQuantity = !isPremiumProduct
  const shouldShowMaxQuantity =
    !isPremiumProduct && !(isFileProduct && fileLicenseType === 'ULTIMATE')

  useEffect(() => {
    if (fileType !== PRODUCT_TYPE_VALUES.SERIAL) {
      clearAllItems()
      return
    }

    const existingAccounts = Array.isArray(initialData?.accounts) ? initialData.accounts : []

    if (existingAccounts.length === 0) {
      clearAllItems()
      return
    }

    setItems(
      existingAccounts.map((account, index) => {
        const credentials = (account as any)?.credentials || {}
        const meta = (account as any)?.meta || {}

        return {
          _id: String((account as any)?.id ?? `existing-${index}`),
          id: String(credentials.id ?? credentials.socialId ?? credentials.userId ?? ''),
          email: String(credentials.email ?? ''),
          username: String(credentials.username ?? ''),
          password: String(credentials.password ?? ''),
          phone: String(credentials.phone ?? credentials.phoneNumber ?? ''),
          note: String(meta.adminNote ?? ''),
          stockFormat: meta.stockFormat === 'CUSTOM_DELIMITER' ? 'CUSTOM_DELIMITER' : 'NEWLINE',
          delimiter: typeof meta.delimiter === 'string' && meta.delimiter ? meta.delimiter : ',',
          batchId: typeof meta.batchId === 'string' && meta.batchId ? meta.batchId : 'existing-stock',
          isSelected: false
        }
      })
    )
  }, [initialData, fileType, setItems, clearAllItems])

  // Auto-generate private URL if isPrivate is true and privateUrl is empty
  useEffect(() => {
    if (isPrivate && !privateUrl) {
      const productName = watch('name')
      if (productName) {
        const generatedSlug = convertToSlug(productName)
        setValue('privateUrl', generatedSlug)
      }
    }
  }, [isPrivate, privateUrl, watch, setValue])

  // Normalize filePath in real-time: convert empty arrays to undefined
  useEffect(() => {
    const filePathValue = watch('meta.filePath')
    if (Array.isArray(filePathValue) && filePathValue.length === 0) {
      setValue('meta.filePath', undefined, { shouldValidate: false })
    } else if (typeof filePathValue === 'string' && filePathValue.trim() === '') {
      setValue('meta.filePath', undefined, { shouldValidate: false })
    }
  }, [watch('meta.filePath'), setValue])

  useEffect(() => {
    if (!isFileProduct) return

    const fileCount = getUploadedFileCount(uploadedFileValue)
    setValue('stockCount', fileCount, { shouldValidate: false })

    if (fileLicenseType === 'ULTIMATE') {
      setValue('maxQuantity', 1, { shouldValidate: false })
    }
  }, [isFileProduct, fileLicenseType, uploadedFileValue, setValue])

  useEffect(() => {
    if (!isPremiumProduct) return

    setValue('stockCount', 1, { shouldValidate: false })
    setValue('minQuantity', 1, { shouldValidate: false })
    setValue('maxQuantity', 1, { shouldValidate: false })
  }, [isPremiumProduct, setValue])

  useEffect(() => {
    if (!isCredentialsStockProduct) return

    setValue('stockCount', items.length, { shouldValidate: false, shouldDirty: false })
    if (!watchedMinQuantity || watchedMinQuantity < 1) {
      setValue('minQuantity', 1, { shouldValidate: false, shouldDirty: false })
    }
    if (watchedMaxQuantity === undefined || watchedMaxQuantity === null) {
      setValue('maxQuantity', 0, {
        shouldValidate: false,
        shouldDirty: false
      })
    }
  }, [isCredentialsStockProduct, items.length, setValue, watchedMinQuantity, watchedMaxQuantity])

  const onSubmit: SubmitHandler<CreateProduct> = async (data) => {
    console.log('Form submitted with data:', data)
    console.log('filePath value:', data.meta?.filePath, 'Type:', typeof data.meta?.filePath, 'IsArray:', Array.isArray(data.meta?.filePath))
    console.log('SKU:', resolvedSku)
    
    // Check SKU first
    if (!resolvedSku) {
      toast.error('SKU generation failed. Please try again.')
      if (!initialData) {
        mutateSku()
      }
      return // Prevent submission if SKU is missing
    }
    
    const discountAmount = getDiscountAmount(data.originalPrice, discount, discountMode)
    const finalPrice = Math.max(0, Math.round((data.originalPrice - discountAmount) * 100) / 100)

    // Validate discount
    if (discountAmount > data.originalPrice) {
      toast.error('Discount cannot be greater than price')
      return
    }

    // Validate private URL if product is private
    if (data.isPrivate && !data.privateUrl?.trim()) {
      toast.error('Private URL is required when product is private')
      return
    }

    try {
      // Normalize filePath: ensure it's an array when multiple files are expected, or undefined if empty
      const normalizedMeta = {
        ...data.meta,
        discountMode,
        discountValue: discount,
        discountAmount,
        filePath: data.meta?.filePath 
          ? (Array.isArray(data.meta.filePath) 
              ? (data.meta.filePath.length > 0 ? data.meta.filePath : undefined)
              : (typeof data.meta.filePath === 'string' && data.meta.filePath.trim() ? data.meta.filePath : undefined))
          : undefined
      }
      
      const payload = {
        ...data,
        platform:
          data.type === 'TELEGRAM_ACCOUNTS' ||
          data.type === 'ACCOUNT' ||
          data.type === 'TELEGRAM_CHANNEL_GROUPS'
            ? 'TELEGRAM'
            : data.platform,
        meta: normalizedMeta,
        originalPrice: data.originalPrice,
        price: finalPrice,
        sku: resolvedSku,
        ...(fileType === PRODUCT_TYPE_VALUES.SERIAL ? { stocks: items } : {}),
        ...(initialData?.id ? { id: initialData.id } : {})
      }
      console.log('Submitting payload:', payload)
      
      await requests[initialData?.id ? 'put' : 'post'](
        `/admin/products` + (initialData?.id ? `/${initialData?.id}` : ``),
        payload
      )
      toast.success(initialData?.id ? 'Product updated successfully' : 'Product created successfully')
      await globalMutate(
        (key) => typeof key === 'string' && key.startsWith('/admin/products'),
        undefined,
        { revalidate: true }
      )
      clearAllItems()
      router.push('/admin/products')
      router.refresh()
    } catch (error) {
      console.error('Error creating product:', error)
      showError(error)
    }
  }

  // Log validation errors for debugging
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      console.error('Form validation errors:', errors)
    }
  }, [errors])

  const onError: SubmitErrorHandler<CreateProduct> = (errors) => {
    // Handle validation errors - show all errors
    console.error('Form validation failed:', errors)
    
    // Get all error messages
    const errorMessages: string[] = []
    
    // Helper to extract error messages recursively
    const extractErrors = (obj: any, path = ''): void => {
      Object.keys(obj).forEach((key) => {
        const value = obj[key]
        const currentPath = path ? `${path}.${key}` : key
        
        if (value?.message) {
          errorMessages.push(`${currentPath}: ${value.message}`)
        } else if (typeof value === 'object' && value !== null) {
          extractErrors(value, currentPath)
        }
      })
    }
    
    extractErrors(errors)
    
    // Show first error or generic message
    if (errorMessages.length > 0) {
      // Format the error message to be more user-friendly
      const firstError = errorMessages[0]
      const fieldName = firstError.split(':')[0].replace(/([A-Z])/g, ' $1').trim()
      const errorMsg = firstError.split(':').slice(1).join(':').trim()
      
      toast.error(`${fieldName}: ${errorMsg}`, {
        description: errorMessages.length > 1 
          ? `And ${errorMessages.length - 1} more error(s). Check console for details.` 
          : undefined,
        duration: 5000
      })
      console.error('All validation errors:', errorMessages)
      console.error('Full error object:', errors)
    } else {
      toast.error('Please fix the form errors before submitting')
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit(onSubmit as SubmitHandler<CreateProduct>, onError)}>
        <div className='flex justify-center lg:justify-end gap-4 mt-4 mb-4'>
          <ProductPreviewDialog
            data={{
              ...watch(),
              discount: getDiscountAmount(watch('originalPrice') || 0, discount, discountMode),
              discountMode,
              discountValue: discount
            }}
            categories={categories}
          >
            <Button type='button' className='lg:w-full max-w-52'>
              Preview Product
            </Button>
          </ProductPreviewDialog>
          <Button 
            type='submit' 
            className='bg-green-500 lg:w-full max-w-52'
            disabled={isSubmitting || !resolvedSku}
          >
            {isSubmitting 
              ? 'Processing...' 
              : initialData 
                ? 'Update' 
                : 'Create'} Product
          </Button>
        </div>

        <div className='items-start gap-8 lg:gap-6 grid grid-cols-1 lg:grid-cols-2'>
          <div className='gap-5 grid'>

            {/* <Controller
              name='name'
              control={control}
              render={({ field }) => {
                const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                  const value = e.target.value
                  field.onChange(e)
                  // Auto-generate slug only if editing new product or slug is empty
                  if (!initialData?.slug || !field.value) {
                    const slug = convertToSlug(value)
                    setValue('slug', slug)
                  }
                }
                return (
                  <CustomInput
                    label='Product Name'
                    type='text'
                    placeholder='Enter product name'
                    value={field.value}
                    onChange={handleNameChange}
                    error={errors.name?.message}
                    required
                  />
                )
              }}
            /> */}
            <Controller
              name="name"
              control={control}
              render={({ field }) => {
                const handleNameChange = (
                  e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
                ) => {
                  const value = e.target.value
                  const currentSlug = watch('slug') ?? ''
                  const previousAutoSlug = convertToSlug(field.value ?? '', { style: 'compact' })
                  field.onChange(value) // pass value (works for both input/textarea)

                  // Keep slug synced with the name until the slug is manually customized.
                  if (!currentSlug || currentSlug === previousAutoSlug) {
                    setValue('slug', convertToSlug(value, { style: 'compact' }))
                  }
                }

                return (
                  <CustomInput
                    label="Product Name"
                    type="text"
                    placeholder="Enter product name"
                    value={field.value ?? ''}
                    onChange={handleNameChange}
                    error={errors.name?.message}
                    required
                  />
                )
              }}
            />

            {/* <Controller
              name='slug'
              control={control}
              render={({ field }) => (
                <CustomInput
                  label='Product Slug'
                  type='text'
                  placeholder='product-slug-url'
                  value={field.value || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const value = e.target.value || ''
                    const slugValue = convertToSlug(value, { realTime: true })
                    // Update the field value with slugified version
                    field.onChange(slugValue)
                  }}
                  error={errors.slug?.message}
                  required
                  helperText='URL-friendly identifier for the product. Auto-generated from name if left empty.'
                />
              )}
            /> */}
            <Controller
              name="slug"
              control={control}
              render={({ field }) => (
                <CustomInput
                  label="Product Slug"
                  type="text"
                  placeholder="ProductSlug"
                  value={field.value ?? ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
                    const value = e.target.value ?? ''
                    field.onChange(convertToSlug(value, { realTime: true, style: 'compact' }))
                  }}
                  error={errors.slug?.message}
                  required
                />
              )}
            />
            <CustomInput
              disabled
              label='Product SKU'
              type='text'
              placeholder='Enter product name'
              value={initialData?.sku || sku?.data?.sku || 'Generating...'}
            />
            <Controller
              name='categoryId'
              control={control}
              render={({ field }) => (
                <CustomInput
                  label='Product Category'
                  type='select'
                  placeholder='Select Category'
                  value={field.value?.toString() || ''}
                  onValueChange={(v) => {
                    field.onChange(Number(v))
                    setValue('productGroupId', undefined, { shouldValidate: true, shouldDirty: true })
                  }}
                  error={errors.categoryId?.message}
                  options={categories.map((cat) => ({ value: cat.id.toString(), label: cat.name }))}
                  required
                />
              )}
            />
            <Controller
              name='productGroupId'
              control={control}
              render={({ field }) => (
                <CustomInput
                  label='Group'
                  type='select'
                  placeholder={
                    selectedCategoryId
                      ? groupsLoading
                        ? 'Loading groups...'
                        : 'Select Group'
                      : 'Select category first'
                  }
                  value={field.value?.toString() || ''}
                  onValueChange={(v) => field.onChange(Number(v))}
                  error={errors.productGroupId?.message}
                  options={availableGroups.map((group) => ({
                    value: group.id.toString(),
                    label: group.name
                  }))}
                  disabled={!selectedCategoryId || groupsLoading || availableGroups.length === 0}
                />
              )}
            />

            <Controller
              name='description'
              control={control}
              render={({ field }) => (
                <CustomInput
                  label='Product Description'
                  type='textarea'
                  placeholder='Enter product description'
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.description?.message}
                  required
                />
              )}
            />
            <Controller
              name='btnText'
              control={control}
              render={({ field }) => (
                <CustomInput
                  label='Button Text'
                  type='text'
                  placeholder='Enter custom button text (leave empty for default)'
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.btnText?.message}
                  helperText='Custom text for the purchase button. Leave empty to use default text.'
                />
              )}
            />
            <Controller
              name='meta.policy'
              control={control}
              render={({ field }) => (
                <CustomInput
                  label='Product Buy/Return Policy'
                  type='textarea'
                  placeholder='Enter product buy/return policy (leave empty to use site default)'
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <Controller
              name='meta.moreInformation'
              control={control}
              render={({ field }) => (
                <CustomInput
                  label='More Information'
                  type='textarea'
                  placeholder='Enter additional product information'
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <Controller
              name='isPrivate'
              control={control}
              render={({ field }) => (
                <CustomInput
                  type='checkbox'
                  name='isPrivate'
                  label='Make Product Private'
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            {isPrivate && (
              <div className='space-y-2'>
                <Controller
                  name='privateUrl'
                  control={control}
                  render={({ field }) => (
                    <div className='space-y-2'>
                      <CustomInput
                        label='Private URL Slug'
                        type='text'
                        placeholder='tg-private-99 (auto-generated if empty)'
                        value={field.value}
                        onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
                          const value = e.target.value ?? ''
                          field.onChange(convertToSlug(value, { realTime: true }))
                        }}
                        required={isPrivate}
                        error={errors.privateUrl?.message}
                        helperText='Leave empty to auto-generate from product name'
                      />
                      {field.value && (
                        <div className='flex gap-2 items-end'>
                          <div className='flex-1'>
                            <Label className='text-xs text-muted-foreground mb-1'>Private Link</Label>
                            <div className='p-2 bg-muted rounded-md text-sm break-all'>
                              {typeof window !== 'undefined' ? `${window.location.origin}/shop/${field.value}` : `/shop/${field.value}`}
                            </div>
                          </div>
                          <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            onClick={() => {
                              const link = typeof window !== 'undefined' 
                                ? `${window.location.origin}/shop/${field.value}` 
                                : `/shop/${field.value}`
                              navigator.clipboard.writeText(link)
                              toast.success('Private link copied to clipboard!')
                            }}
                          >
                            Copy Link
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                />
              </div>
            )}
            <Controller
              name='tags'
              control={control}
              render={({ field }) => (
                <CustomInput
                  label='Product Tags'
                  type='text'
                  placeholder='#telegram, #crypto, #tg'
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <Controller
              name='seo.title'
              control={control}
              render={({ field }) => (
                <CustomInput
                  label='Meta Title'
                  type='text'
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <Controller
              name='seo.description'
              control={control}
              render={({ field }) => (
                <CustomInput
                  label='Meta Description'
                  type='textarea'
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <Controller
              name='seo.keywords'
              control={control}
              render={({ field }) => (
                <CustomInput
                  label='Meta Keywords'
                  type='text'
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </div>
          <div className='gap-5 grid'>
            <div>
              <Label className='mb-2'>Product Icon</Label>
              <Controller
                control={control}
                name='thumbnail'
                render={({ field }) => (
                  <FileUploader
                    value={field.value || ''}
                    onChangeAction={(url) => {
                      // Ensure it's a single string for thumbnail
                      const thumbnailValue = Array.isArray(url) ? url[0] || '' : url || ''
                      field.onChange(thumbnailValue)
                    }}
                    maxAllow={1}
                    size='extra-large'
                  />
                )}
              />
              {errors.thumbnail && (
                <span className='font-medium text-red-500 text-xs'>{errors.thumbnail.message}</span>
              )}
            </div>
            <div>
              <Label className='mb-2'>Product Images</Label>
              <Controller
                control={control}
                name='images'
                render={({ field }) => (
                  <FileUploader
                    multiple={true}
                    maxAllow={5}
                    value={Array.isArray(field.value) ? field.value : field.value ? [field.value] : []}
                    onChangeAction={(url) => {
                      // Ensure it's always an array for multiple images
                      const imageArray = Array.isArray(url) ? url : url ? [url] : []
                      field.onChange(imageArray)
                    }}
                    size='extra-large'
                  />
                )}
              />
            </div>

            <Controller
              name='originalPrice'
              control={control}
              render={({ field }) => (
                <CustomInput
                  label='Product Price'
                  type='number'
                  placeholder='0.00'
                  value={field.value}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  error={errors.originalPrice?.message}
                  required
                />
              )}
            />
            <CustomInput
              label='Discount Type'
              type='select'
              value={discountMode}
              onValueChange={(value) => setDiscountMode(value === 'percent' ? 'percent' : 'amount')}
              options={[
                { label: 'Fixed Amount ($)', value: 'amount' },
                { label: 'Percentage (%)', value: 'percent' }
              ]}
            />
            <CustomInput
              label={discountMode === 'percent' ? 'Discount Percentage' : 'Discount Amount'}
              type='number'
              placeholder={discountMode === 'percent' ? '0' : '0.00'}
              min={0}
              max={discountMode === 'percent' ? 100 : undefined}
              step={discountMode === 'percent' ? 1 : '0.01'}
              value={discount}
              suffix={discountMode === 'percent' ? '%' : undefined}
              prefix={discountMode === 'amount' ? '$' : undefined}
              onChange={(e) => {
                const value = toFiniteNumber(e.target.value)
                setDiscount(discountMode === 'percent' ? Math.min(value, 100) : value)
              }}
            />
            <Controller
              name='type'
              control={control}
              render={({ field }) => (
                <CustomInput
                  label='Selling Type'
                  type='select'
                  placeholder='Select Type'
                  value={field.value}
                  onValueChange={field.onChange}
                  error={errors.type?.message}
                  options={productTypes}
                  required
                />
              )}
            />
            {TELEGRAM_TRANSFER_TYPES.has(String(fileType)) && !isPremiumProduct && (
              <div className='space-y-4'>
                <Controller
                  name='meta.clientInputLabel'
                  control={control}
                  render={({ field }) => (
                    <CustomInput
                      label='Client Input Label'
                      type='text'
                      placeholder='e.g., Email, Username, Telegram Phone, etc.'
                      value={field.value}
                      onChange={field.onChange}
                      helperText='Label for the input field that customers must fill during checkout'
                    />
                  )}
                />
              </div>
            )}
            {isFileProduct && (
              <div className='space-y-4'>
                <div>
                  <Label className='mb-2'>Upload File</Label>
                  <Controller
                    control={control}
                    name='meta.filePath'
                    render={({ field }) => (
                      <FileUploader
                        value={
                          field.value === undefined || field.value === null
                            ? []
                            : Array.isArray(field.value)
                            ? field.value
                            : [field.value]
                        }
                        onChangeAction={(value) => {
                          // Normalize the value: convert empty arrays to undefined, keep non-empty arrays as-is
                          let normalizedValue: string | string[] | undefined
                          if (Array.isArray(value)) {
                            // Only set if array has items, otherwise set to undefined
                            normalizedValue = value.length > 0 ? value : undefined
                          } else if (typeof value === 'string') {
                            // Only set if string is non-empty, otherwise set to undefined
                            normalizedValue = value.trim().length > 0 ? value.trim() : undefined
                          } else {
                            normalizedValue = undefined
                          }
                          console.log('FileUploader onChange - Original:', value, 'Normalized:', normalizedValue)
                          field.onChange(normalizedValue)
                        }}
                        multiple={true}
                        maxAllow={10}
                        size='large'
                      />
                    )}
                  />
                  {errors.thumbnail && (
                    <span className='font-medium text-red-500 text-xs'>
                      {errors.thumbnail.message}
                    </span>
                  )}
                </div>

                {/* License Type */}
                <div>
                  <Label className='mb-2'>License Type</Label>
                  <Controller
                    control={control}
                    name='meta.licenseType'
                    render={({ field }) => (
                      <CustomInput
                        type='select'
                        placeholder='Select License Type'
                        value={field.value || 'ULTIMATE'}
                        onValueChange={field.onChange}
                        options={[
                          { value: 'ULTIMATE', label: 'Ultimate - File can be sold unlimited times' },
                          { value: 'ONE_TIME', label: 'One-Time - File sold once, then removed from stock' }
                        ]}
                      />
                    )}
                  />
                  <p className='text-xs text-muted-foreground mt-1'>
                    Ultimate: File can be sold unlimited times (no need to reupload). One-Time: File is sold once,
                    then removed from stock.
                  </p>
                </div>

                {/* File Preview */}
                {watch('meta.filePath') && (
                  <div>
                    <Label className='mb-2'>File Preview</Label>
                    <div className='space-y-2'>
                      {Array.isArray(watch('meta.filePath'))
                        ? (watch('meta.filePath') as string[]).map((filePath, idx) => (
                            <div key={idx} className='p-3 bg-muted rounded-lg'>
                              <p className='text-sm text-muted-foreground break-all'>{filePath}</p>
                              {filePath.match(/\.(jpg|jpeg|png|gif|pdf)$/i) && (
                                <a
                                  href={filePath}
                                  target='_blank'
                                  rel='noopener noreferrer'
                                  className='text-primary hover:underline text-sm mt-2 inline-block'
                                >
                                  View File
                                </a>
                              )}
                            </div>
                          ))
                        : typeof watch('meta.filePath') === 'string' && (
                            <div className='p-3 bg-muted rounded-lg'>
                              <p className='text-sm text-muted-foreground break-all'>
                                {watch('meta.filePath') as string}
                              </p>
                              {(watch('meta.filePath') as string).match(/\.(jpg|jpeg|png|gif|pdf)$/i) && (
                                <a
                                  href={watch('meta.filePath') as string}
                                  target='_blank'
                                  rel='noopener noreferrer'
                                  className='text-primary hover:underline text-sm mt-2 inline-block'
                                >
                                  View File
                                </a>
                              )}
                            </div>
                          )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ✅ Stock Count */}
            {isCredentialsStockProduct && (
              <Controller
                name='stockCount'
                control={control}
                render={({ field }) => (
                  <CustomInput
                    label='Stock Count'
                    type='number'
                    placeholder='0'
                    min={0}
                    value={items.length}
                    disabled
                    onChange={field.onChange}
                    helperText='Stock count is managed automatically from the credentials stock items below.'
                  />
                )}
              />
            )}
            {shouldShowInlineStockCount && (
              <Controller
                name='stockCount'
                control={control}
                render={({ field }) => (
                  <CustomInput
                    label='Stock Count'
                    type='number'
                    placeholder='0'
                    min={0}
                    value={field.value ?? ''}
                    onChange={(e) => {
                      const value = e.target.value
                      field.onChange(value === '' ? '' : Math.max(0, Number(value) || 0))
                    }}
                    error={errors.stockCount?.message}
                    required
                  />
                )}
              />
            )}
            {shouldShowMinQuantity && (
              <Controller
                name='minQuantity'
                control={control}
                render={({ field }) => (
                  <CustomInput
                    label='Minimum Quantity'
                    type='number'
                    min={1}
                    value={field.value}
                    onChange={(e) => field.onChange(Math.max(1, Number(e.target.value) || 1))}
                    error={errors.minQuantity?.message}
                    required
                  />
                )}
              />
            )}
            {shouldShowMaxQuantity && (
              <Controller
                name='maxQuantity'
                control={control}
                render={({ field }) => (
                  <CustomInput
                    label='Maximum Quantity'
                    type='number'
                    min={0}
                    value={field.value}
                    onChange={(e) => field.onChange(Math.max(0, Number(e.target.value) || 0))}
                    error={errors.maxQuantity?.message}
                    helperText='Use 0 to allow purchases up to available stock.'
                    required
                  />
                )}
              />
            )}

            <Controller
              name='isActive'
              control={control}
              render={({ field }) => (
                <CustomInput
                  type='switch'
                  name='isActive'
                  label={`Product is ${field.value ? 'Active' : 'Inactive'}`}
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <Controller
              name='isFeatured'
              control={control}
              render={({ field }) => (
                <CustomInput
                  type='switch'
                  name='isFeatured'
                  label={`Product is ${field.value ? 'Featured' : 'Not Featured'}`}
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>
        </div>
      </form>
      <div className='items-start gap-8 mt-4 lg:gap-6 grid grid-cols-1 lg:grid-cols-2'>
        {fileType === PRODUCT_TYPE_VALUES.SERIAL ? <SerialStock /> : null}
      </div>
    </div>
  )
}
