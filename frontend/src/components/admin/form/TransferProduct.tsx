'use client'

import CustomInput from '@/components/common/CustomInput'
import FileUploader from '@/components/common/FileUploader'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import useAsync from '@/hooks/useAsync'
import { showError } from '@/lib/errMsg'
import {
  type CreateTransferProduct,
  CreateTransferProductSchema,
  type UpdateTransferProduct,
  UpdateTransferProductSchema
} from '@/lib/validations/schemas/product'
import requests from '@/services/network/http'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Controller, SubmitHandler, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import DuplicateChecker from '@/components/admin/telegram/DuplicateChecker'
import GroupChannelSelection from '@/components/admin/telegram/GroupChannelSelection'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Trash2, ArrowRightLeft, Archive } from 'lucide-react'

type AssignedGroupChannel = {
  id?: number | string
  name?: string
  username?: string
  type: 'group' | 'channel'
  members?: number
  isPublic?: boolean
  description?: string
  url: string
  accountId?: number | string
}

type ManualGroupChannelForm = {
  url: string
  name: string
  username: string
  type: 'group' | 'channel'
  members: string
}

const normalizeAssignedGroupsChannels = (items: unknown): AssignedGroupChannel[] => {
  if (!Array.isArray(items)) return []

  const seen = new Set<string>()

  return items
    .filter((item): item is Record<string, any> => Boolean(item) && typeof item === 'object')
    .map((item) => ({
      id: item.id,
      name: typeof item.name === 'string' ? item.name : undefined,
      username: typeof item.username === 'string' ? item.username : undefined,
      type: (item.type === 'channel' ? 'channel' : 'group') as 'group' | 'channel',
      members: typeof item.members === 'number' ? item.members : undefined,
      isPublic: typeof item.isPublic === 'boolean' ? item.isPublic : undefined,
      description: typeof item.description === 'string' ? item.description : undefined,
      url: typeof item.url === 'string' ? item.url.trim() : '',
      accountId: item.accountId
    }))
    .filter((item) => item.url.length > 0)
    .filter((item) => {
      const key = item.url.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

type TProps = {
  initialData?: any
  categories: Category[]
  onSuccessAction?: () => void
}

type DiscountMode = 'amount' | 'percent'

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

export default function TransferProductForm({ initialData, categories, onSuccessAction }: TProps) {
  const router = useRouter()
  const isEditMode = Boolean(initialData)
  const [discount, setDiscount] = useState(0)
  const [discountMode, setDiscountMode] = useState<DiscountMode>('amount')
  const [showDuplicateChecker, setShowDuplicateChecker] = useState(false)
  const [showGroupChannelSelector, setShowGroupChannelSelector] = useState(false)
  const [showManualUrlDialog, setShowManualUrlDialog] = useState(false)
  const [selectedGroups, setSelectedGroups] = useState<AssignedGroupChannel[]>(
    normalizeAssignedGroupsChannels(initialData?.meta?.assignedGroupsChannels)
  )
  const [soldGroups, setSoldGroups] = useState<AssignedGroupChannel[]>(
    normalizeAssignedGroupsChannels(initialData?.meta?.soldGroupsChannels)
  )
  const [selectedAssignedUrls, setSelectedAssignedUrls] = useState<string[]>([])
  const [moveTargetProductId, setMoveTargetProductId] = useState('')
  const [manualGroupChannel, setManualGroupChannel] = useState<ManualGroupChannelForm>({
    url: '',
    name: '',
    username: '',
    type: initialData?.meta?.transferType === 'channel' ? 'channel' : 'group',
    members: ''
  })
  const [skuRequestKey] = useState(
    () => (!isEditMode ? `/admin/products/generate-sku?nonce=${Date.now()}-${Math.random()}` : null)
  )
  const { data: sku, mutate: mutateSku } = useAsync(skuRequestKey)
  const { data: transferProductsData } = useAsync<any>('/admin/transfer-products?limit=500')

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<CreateTransferProduct | UpdateTransferProduct>({
    resolver: zodResolver(
      isEditMode ? UpdateTransferProductSchema : CreateTransferProductSchema
    ) as any,
    mode: 'onTouched',
    defaultValues: {
      name: initialData?.name ?? '',
      slug: initialData?.slug ?? '',
      categoryId: initialData?.categoryId ?? undefined,
      platform: 'TELEGRAM',
      type: initialData?.type ?? 'TELEGRAM_CHANNEL_GROUPS',
      description: initialData?.description ?? '',
      tags: Array.isArray(initialData?.tags)
        ? initialData?.tags.join(', ')
        : initialData?.tags ?? '',
      originalPrice: toFiniteNumber(initialData?.originalPrice),
      minQuantity: initialData?.minQuantity ?? 1,
      maxQuantity: initialData?.maxQuantity ?? 1000,
      isActive: initialData?.isActive ?? true,
      isPrivate: initialData?.isPrivate ?? false,
      isFeatured: initialData?.isFeatured ?? false,
      thumbnail: initialData?.thumbnail ?? '',
      images: initialData?.images ?? [],
      privateUrl: initialData?.privateUrl ?? '',
      telegramUrl: initialData?.telegramUrl ?? '',
      meta: {
        transferType: initialData?.meta?.transferType ?? 'group',
        botAdded: initialData?.meta?.botAdded ?? false,
        adminPhone: initialData?.meta?.adminPhone ?? '',
        members: initialData?.meta?.members ?? undefined,
        originalOwner: initialData?.meta?.originalOwner ?? '',
        yearCreated: initialData?.meta?.yearCreated ?? undefined
      },
      seo: {
        title: initialData?.seo?.title ?? '',
        description: initialData?.seo?.description ?? '',
        keywords: initialData?.seo?.keywords ?? ''
      }
    }
  })

  const isPrivate = watch('isPrivate')
  const transferType = watch('meta.transferType')

  const name = watch('name')

  useEffect(() => {
    setSelectedGroups(normalizeAssignedGroupsChannels(initialData?.meta?.assignedGroupsChannels))
    setSoldGroups(normalizeAssignedGroupsChannels(initialData?.meta?.soldGroupsChannels))
  }, [initialData])

  useEffect(() => {
    setManualGroupChannel((prev) => ({
      ...prev,
      type: transferType === 'channel' ? 'channel' : 'group'
    }))
  }, [transferType])

  // Auto-update product name when transferType changes
  useEffect(() => {
    if (!isEditMode && transferType) {
      const autoName = transferType === 'channel'
        ? 'Telegram Channel Auto Delivery'
        : 'Telegram Group Auto Delivery'
      setValue('name', autoName)
    }
  }, [transferType, isEditMode, setValue])

  // Auto-generate slug from name (lowercase, hyphens, alphanumeric only)
  const generateSlug = (val: string) =>
    val
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || ''

  useEffect(() => {
    if (!isEditMode && name) {
      setValue('slug', generateSlug(name))
    }
  }, [name, isEditMode, setValue])

  const onSubmit: SubmitHandler<CreateTransferProduct | UpdateTransferProduct> = async (data) => {
    if (!isEditMode && !sku?.data?.sku) {
      toast.error('SKU is still generating. Please wait a moment and try again.')
      mutateSku()
      return
    }
    const discountAmount = getDiscountAmount(data.originalPrice || 0, discount, discountMode)
    const finalPrice = Math.max(0, Math.round(((data.originalPrice || 0) - discountAmount) * 100) / 100)

    try {
      if (isEditMode) {
        await requests.put(`/admin/transfer-products/${initialData.id}`, {
          ...data,
          meta: {
            ...data.meta,
            discountMode,
            discountValue: discount,
            discountAmount,
            assignedGroupsChannels: selectedGroups,
            soldGroupsChannels: soldGroups
          },
          // id: initialData.id,
          // sku: sku?.data?.sku,
          originalPrice: data.originalPrice,
          price: finalPrice
        })
        toast.success('Transfer product updated successfully')
      } else {
        await requests.post('/admin/transfer-products', {
          ...data,
          meta: {
            ...data.meta,
            discountMode,
            discountValue: discount,
            discountAmount,
            assignedGroupsChannels: selectedGroups,
            soldGroupsChannels: soldGroups
          },
          sku: sku?.data?.sku,
          originalPrice: data.originalPrice,
          price: finalPrice
        })
        toast.success('Transfer product created successfully')
      }

      if (onSuccessAction) {
        onSuccessAction()
      } else {
        router.push('/admin/telegram-management/manage-transfer-products')
      }
    } catch (error) {
      showError(error)
    }
  }

  useEffect(() => {
    if (initialData) {
      const originalPrice = toFiniteNumber(initialData?.originalPrice)
      const currentPrice = toFiniteNumber(initialData?.price, originalPrice)
      const savedDiscountMode = initialData?.meta?.discountMode === 'percent' ? 'percent' : 'amount'
      const savedDiscountValue = toFiniteNumber(initialData?.meta?.discountValue, NaN)
      setDiscountMode(savedDiscountMode)
      setDiscount(
        Number.isFinite(savedDiscountValue)
          ? savedDiscountValue
          : Math.max(0, Math.round((originalPrice - currentPrice) * 100) / 100)
      )
    }
  }, [initialData])

  const transferProducts = Array.isArray(transferProductsData?.data)
    ? transferProductsData.data
    : Array.isArray(transferProductsData?.data?.data)
      ? transferProductsData.data.data
      : []

  const moveTargetOptions = transferProducts
    .filter((product: any) => Number(product?.id) !== Number(initialData?.id))
    .map((product: any) => ({
      value: String(product.id),
      label: product.name
    }))

  const blockedAssignedUrls = new Set(
    transferProducts
      .filter((product: any) => Number(product?.id) !== Number(initialData?.id))
      .flatMap((product: any) =>
        Array.isArray(product?.meta?.assignedGroupsChannels)
          ? product.meta.assignedGroupsChannels
          : []
      )
      .map((item: any) => String(item?.url || '').trim().toLowerCase())
      .filter(Boolean)
  )

  const handleMoveSelectedToSold = () => {
    if (selectedAssignedUrls.length === 0) {
      toast.error('Select at least one URL to move to sold')
      return
    }

    const moving = selectedGroups.filter((item) => selectedAssignedUrls.includes(item.url))
    setSelectedGroups((prev) => prev.filter((item) => !selectedAssignedUrls.includes(item.url)))
    setSoldGroups((prev) => normalizeAssignedGroupsChannels([...prev, ...moving]))
    setSelectedAssignedUrls([])
    toast.success(`${moving.length} item(s) moved to sold`)
  }

  const handleMoveSelectedToAnotherItem = async () => {
    if (!isEditMode || !initialData?.id) {
      toast.error('Save the product first before moving channels/groups')
      return
    }

    if (!moveTargetProductId) {
      toast.error('Select a target item first')
      return
    }

    if (selectedAssignedUrls.length === 0) {
      toast.error('Select at least one URL to move')
      return
    }

    const targetProduct = transferProducts.find(
      (product: any) => String(product.id) === String(moveTargetProductId)
    )

    if (!targetProduct) {
      toast.error('Target item not found')
      return
    }

    const moving = selectedGroups.filter((item) => selectedAssignedUrls.includes(item.url))
    const targetAssigned = normalizeAssignedGroupsChannels(
      targetProduct?.meta?.assignedGroupsChannels
    )

    try {
      await requests.put(`/admin/transfer-products/${moveTargetProductId}`, {
        meta: {
          assignedGroupsChannels: normalizeAssignedGroupsChannels([...targetAssigned, ...moving])
        }
      })

      setSelectedGroups((prev) => prev.filter((item) => !selectedAssignedUrls.includes(item.url)))
      setSelectedAssignedUrls([])
      setMoveTargetProductId('')
      toast.success(`${moving.length} item(s) moved successfully`)
    } catch (error) {
      showError(error)
    }
  }

  const handleRemoveAssignedItem = (url: string) => {
    setSelectedGroups((prev) => prev.filter((item) => item.url !== url))
    setSelectedAssignedUrls((prev) => prev.filter((item) => item !== url))
  }

  const handleRestoreSoldItem = (url: string) => {
    const restoring = soldGroups.find((item) => item.url === url)
    if (!restoring) return
    setSoldGroups((prev) => prev.filter((item) => item.url !== url))
    setSelectedGroups((prev) => normalizeAssignedGroupsChannels([...prev, restoring]))
  }

  const resetManualGroupChannel = () => {
    setManualGroupChannel({
      url: '',
      name: '',
      username: '',
      type: transferType === 'channel' ? 'channel' : 'group',
      members: ''
    })
  }

  const handleAddManualGroupChannel = () => {
    const normalizedUrl = manualGroupChannel.url.trim()
    const normalizedKey = normalizedUrl.toLowerCase()

    if (!normalizedUrl) {
      toast.error('Channel/group URL is required')
      return
    }

    if (
      selectedGroups.some((item) => item.url.toLowerCase() === normalizedKey) ||
      soldGroups.some((item) => item.url.toLowerCase() === normalizedKey)
    ) {
      toast.error('This URL is already attached to this item')
      return
    }

    if (blockedAssignedUrls.has(normalizedKey)) {
      toast.error('This URL is already assigned to another item')
      return
    }

    setSelectedGroups((prev) =>
      normalizeAssignedGroupsChannels([
        ...prev,
        {
          url: normalizedUrl,
          name: manualGroupChannel.name.trim() || undefined,
          username: manualGroupChannel.username.trim() || undefined,
          type: manualGroupChannel.type,
          members: manualGroupChannel.members ? Number(manualGroupChannel.members) : undefined
        }
      ])
    )
    setShowManualUrlDialog(false)
    resetManualGroupChannel()
    toast.success('Channel/group URL added')
  }

  const assignedGroupsSection = (
    <div className='space-y-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg'>
      <div className='space-y-1'>
        <p className='font-medium text-sm text-blue-300'>
          Assigned Channels/Groups ({selectedGroups.length})
        </p>
        <p className='text-xs text-white/55'>
          Attach channels/groups to this item, then move them to another item or to sold when needed.
        </p>
      </div>

      {selectedGroups.length > 0 ? (
        <div className='space-y-2 max-h-64 overflow-y-auto pr-1'>
          {selectedGroups.map((item) => (
            <div
              key={item.url}
              className='flex items-start gap-3 p-3 bg-background/60 border border-white/10 rounded-lg'
            >
              <Checkbox
                checked={selectedAssignedUrls.includes(item.url)}
                onCheckedChange={(checked: boolean) => {
                  setSelectedAssignedUrls((prev) =>
                    checked ? [...prev, item.url] : prev.filter((url) => url !== item.url)
                  )
                }}
                className='mt-1'
              />
              <div className='flex-1 min-w-0 space-y-1'>
                <div className='flex items-center gap-2 flex-wrap'>
                  <span className='text-xs font-semibold px-2 py-1 rounded bg-white/10 text-white/70'>
                    {item.type.toUpperCase()}
                  </span>
                  {item.name && <span className='font-medium text-white'>{item.name}</span>}
                </div>
                <p className='text-sm text-white/80 break-all'>{item.url}</p>
                {item.username && (
                  <p className='text-xs text-white/50'>Username: {item.username}</p>
                )}
                {typeof item.members === 'number' && (
                  <p className='text-xs text-white/50'>
                    Members/Subscribers: {item.members.toLocaleString()}
                  </p>
                )}
              </div>
              <Button
                type='button'
                variant='ghost'
                size='icon'
                onClick={() => handleRemoveAssignedItem(item.url)}
                title='Remove URL'
              >
                <Trash2 className='w-4 h-4' />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className='p-3 bg-background/40 border border-dashed border-white/10 rounded-lg text-sm text-white/55'>
          No channels/groups assigned yet. Use &quot;Select Group &amp; Stock&quot; above to attach them to this item.
        </div>
      )}

      <div className='space-y-3 pt-2 border-white/10 border-t'>
        <p className='text-xs text-white/60'>
          Select assigned URLs to move them to another item or move them to sold.
        </p>
        <div className='grid grid-cols-1 lg:grid-cols-[1fr_auto_auto] gap-3 items-end'>
          <CustomInput
            label='Move Selected To'
            type='select'
            placeholder='Select another item'
            value={moveTargetProductId}
            onValueChange={setMoveTargetProductId}
            options={moveTargetOptions}
          />
          <Button
            type='button'
            variant='outline'
            onClick={handleMoveSelectedToAnotherItem}
            disabled={selectedGroups.length === 0 || selectedAssignedUrls.length === 0}
          >
            <ArrowRightLeft className='w-4 h-4 mr-2' />
            Move
          </Button>
          <Button
            type='button'
            variant='outline'
            onClick={handleMoveSelectedToSold}
            disabled={selectedGroups.length === 0 || selectedAssignedUrls.length === 0}
          >
            <Archive className='w-4 h-4 mr-2' />
            Move to Sold
          </Button>
        </div>
      </div>
    </div>
  )

  const soldGroupsSection = (
    <div className='space-y-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg'>
      <div className='space-y-1'>
        <p className='font-medium text-sm text-amber-300'>
          Sold Channels/Groups ({soldGroups.length})
        </p>
        <p className='text-xs text-white/55'>
          Sold entries stay here for reference and can be restored back to the active item list.
        </p>
      </div>
      {soldGroups.length > 0 ? (
        <div className='space-y-2 max-h-48 overflow-y-auto pr-1'>
          {soldGroups.map((item) => (
            <div
              key={item.url}
              className='flex items-start justify-between gap-3 p-3 bg-background/60 border border-white/10 rounded-lg'
            >
              <div className='min-w-0 space-y-1'>
                <div className='flex items-center gap-2 flex-wrap'>
                  <span className='text-xs font-semibold px-2 py-1 rounded bg-white/10 text-white/70'>
                    {item.type.toUpperCase()}
                  </span>
                  {item.name && <span className='font-medium text-white'>{item.name}</span>}
                </div>
                <p className='text-sm text-white/80 break-all'>{item.url}</p>
              </div>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => handleRestoreSoldItem(item.url)}
              >
                Restore
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className='p-3 bg-background/40 border border-dashed border-white/10 rounded-lg text-sm text-white/55'>
          No sold channels/groups for this item yet.
        </div>
      )}
    </div>
  )

  return (
    <div>
      <form
        onSubmit={handleSubmit(onSubmit, (err) => {
          const getFirstMessage = (obj: any): string | undefined => {
            if (!obj) return undefined
            if (obj.message) return obj.message
            for (const v of Object.values(obj)) {
              const m = getFirstMessage(v)
              if (m) return m
            }
            return undefined
          }
          const msg = getFirstMessage(err) || 'Please fill all required fields and fix any errors.'
          toast.error(msg)
        })}
      >
        <div className='items-start gap-8 lg:gap-6 grid grid-cols-1 lg:grid-cols-2'>
          <div className='gap-5 grid'>
            <Controller
              name='name'
              control={control}
              render={({ field }) => (
                <CustomInput
                  label='Product Name'
                  type='text'
                  placeholder='Enter product name'
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.name?.message}
                  required
                />
              )}
            />
            <Controller
              name='slug'
              control={control}
              render={({ field }) => (
                <CustomInput
                  label='Slug'
                  type='text'
                  placeholder='product-url-slug (auto-generated from name)'
                  value={field.value}
                  onChange={field.onChange}
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
                  onValueChange={(v) => field.onChange(Number(v))}
                  error={errors.categoryId?.message}
                  options={categories.map((cat) => ({ value: cat.id.toString(), label: cat.name }))}
                  required
                />
              )}
            />

            <Controller
              name='telegramUrl'
              control={control}
              render={({ field }) => (
                <CustomInput
                  label='Telegram URL'
                  type='text'
                  placeholder='https://t.me/...'
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.telegramUrl?.message}
                  required
                />
              )}
            />
            {/* Duplicate Checker Button */}
            <Button
              type='button'
              variant='outline'
              className='w-full'
              onClick={() => setShowDuplicateChecker(true)}
            >
              🔍 Check for Duplicates
            </Button>

            {/* Group/Channel Selector Button */}
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              <Button
                type='button'
                variant='outline'
                className='w-full'
                onClick={() => setShowGroupChannelSelector(true)}
              >
                📋 Select {transferType === 'channel' ? 'Channel' : 'Group'} & Stock
              </Button>
              <Button
                type='button'
                variant='outline'
                className='w-full'
                onClick={() => setShowManualUrlDialog(true)}
              >
                + Add Channel/Group URL
              </Button>
            </div>

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

            {/* Transfer Type */}
            <Controller
              name='meta.transferType'
              control={control}
              render={({ field }) => (
                <CustomInput
                  label='Transfer Type'
                  type='select'
                  placeholder='Select Type'
                  value={field.value}
                  onValueChange={field.onChange}
                  error={errors.meta?.transferType?.message}
                  options={[
                    { value: 'group', label: 'Group' },
                    { value: 'channel', label: 'Channel' }
                  ]}
                  required
                />
              )}
            />

            {/* Bot Added */}
            <Controller
              name='meta.botAdded'
              control={control}
              render={({ field }) => (
                <CustomInput
                  type='switch'
                  name='botAdded'
                  label={`Bot is ${field.value ? 'Added' : 'Not Added'}`}
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />

            {/* Admin Phone */}
            <Controller
              name='meta.adminPhone'
              control={control}
              render={({ field }) => (
                <CustomInput
                  label='Admin Phone'
                  type='text'
                  placeholder='+1234567890'
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.meta?.adminPhone?.message}
                  required
                />
              )}
            />

            {/* Original Owner */}
            <Controller
              name='meta.originalOwner'
              control={control}
              render={({ field }) => (
                <CustomInput
                  label='Original Owner'
                  type='text'
                  placeholder='@username'
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.meta?.originalOwner?.message}
                  required
                />
              )}
            />

            {/* Members (Optional) */}
            <Controller
              name='meta.members'
              control={control}
              render={({ field }) => (
                <CustomInput
                  label='Members Count'
                  type='number'
                  placeholder='50000'
                  value={field.value || ''}
                  onChange={(e) => {
                    const value = e.target.value
                    field.onChange(value ? Number(value) : undefined)
                  }}
                  error={errors.meta?.members?.message}
                />
              )}
            />

            {/* Year Created (Optional) */}
            <Controller
              name='meta.yearCreated'
              control={control}
              render={({ field }) => (
                <CustomInput
                  label='Year Created'
                  type='number'
                  placeholder='2020'
                  value={field.value || ''}
                  onChange={(e) => {
                    const value = e.target.value
                    field.onChange(value ? Number(value) : undefined)
                  }}
                  error={errors.meta?.yearCreated?.message}
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
              <Controller
                name='privateUrl'
                control={control}
                render={({ field }) => (
                  <CustomInput
                    label='Private URL'
                    type='text'
                    placeholder='https://example.com'
                    value={field.value}
                    onChange={field.onChange}
                    required={isPrivate}
                    error={errors.privateUrl?.message}
                  />
                )}
              />
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
                    onChangeAction={field.onChange}
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
                    value={field.value || ''}
                    onChangeAction={field.onChange}
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
              name='minQuantity'
              control={control}
              render={({ field }) => (
                <CustomInput
                  label='Minimum Quantity'
                  type='number'
                  value={field.value}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  error={errors.minQuantity?.message}
                  required
                />
              )}
            />
            <Controller
              name='maxQuantity'
              control={control}
              render={({ field }) => (
                <CustomInput
                  label='Maximum Quantity'
                  type='number'
                  value={field.value}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  error={errors.maxQuantity?.message}
                  required
                />
              )}
            />
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
        <div className='space-y-4 mt-6'>
          {assignedGroupsSection}
          {soldGroupsSection}
        </div>
        <div className='flex justify-center lg:justify-end gap-4 mt-5'>
          <Button
            type='button'
            variant='outline'
            onClick={() => (onSuccessAction ? onSuccessAction() : router.back())}
            className='lg:w-full max-w-52'
          >
            Cancel
          </Button>
          <Button type='submit' className='bg-green-500 lg:w-full max-w-52'>
            {isEditMode ? 'Update' : 'Create'} Channel/Group
          </Button>
        </div>
      </form>

      {/* Duplicate Checker Modal */}
      <Dialog open={showDuplicateChecker} onOpenChange={setShowDuplicateChecker}>
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>Check for Duplicates</DialogTitle>
            <DialogDescription>
              Search for similar groups/channels or accounts before creating this product
            </DialogDescription>
          </DialogHeader>
          <DuplicateChecker />
        </DialogContent>
      </Dialog>

      {/* Group/Channel Selection Modal */}
      <Dialog open={showGroupChannelSelector} onOpenChange={setShowGroupChannelSelector}>
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>
              Select {transferType === 'channel' ? 'Channel' : 'Group'}
            </DialogTitle>
            <DialogDescription>
              Choose which {transferType === 'channel' ? 'channels' : 'groups'} to include in this product
            </DialogDescription>
          </DialogHeader>
          <GroupChannelSelection
            onSelectionChange={(selected) => {
              setSelectedGroups((prev) => normalizeAssignedGroupsChannels([...prev, ...selected]))
              toast.success(`${selected.length} item(s) selected`)
            }}
            onClose={() => setShowGroupChannelSelector(false)}
            currentProductId={initialData?.id}
            currentAssignedUrls={selectedGroups.map((item) => item.url)}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={showManualUrlDialog}
        onOpenChange={(open) => {
          setShowManualUrlDialog(open)
          if (!open) resetManualGroupChannel()
        }}
      >
        <DialogContent className='max-w-xl'>
          <DialogHeader>
            <DialogTitle>Add Channel/Group URL</DialogTitle>
            <DialogDescription>
              Manually attach a Telegram channel or group URL to this item when it is not available in a transfer-only account.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4'>
            <CustomInput
              label='URL'
              type='text'
              placeholder='https://t.me/example'
              value={manualGroupChannel.url}
              onChange={(e) =>
                setManualGroupChannel((prev) => ({ ...prev, url: e.target.value }))
              }
              required
            />
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <CustomInput
                label='Type'
                type='select'
                value={manualGroupChannel.type}
                onValueChange={(value) =>
                  setManualGroupChannel((prev) => ({
                    ...prev,
                    type: value === 'channel' ? 'channel' : 'group'
                  }))
                }
                options={[
                  { value: 'group', label: 'Group' },
                  { value: 'channel', label: 'Channel' }
                ]}
              />
              <CustomInput
                label='Members/Subscribers'
                type='number'
                placeholder='Optional'
                value={manualGroupChannel.members}
                onChange={(e) =>
                  setManualGroupChannel((prev) => ({ ...prev, members: e.target.value }))
                }
              />
            </div>
            <CustomInput
              label='Name'
              type='text'
              placeholder='Optional display name'
              value={manualGroupChannel.name}
              onChange={(e) =>
                setManualGroupChannel((prev) => ({ ...prev, name: e.target.value }))
              }
            />
            <CustomInput
              label='Username'
              type='text'
              placeholder='Optional username'
              value={manualGroupChannel.username}
              onChange={(e) =>
                setManualGroupChannel((prev) => ({ ...prev, username: e.target.value }))
              }
            />
            <div className='flex justify-end gap-3'>
              <Button
                type='button'
                variant='outline'
                onClick={() => {
                  setShowManualUrlDialog(false)
                  resetManualGroupChannel()
                }}
              >
                Cancel
              </Button>
              <Button type='button' onClick={handleAddManualGroupChannel}>
                Add URL
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
