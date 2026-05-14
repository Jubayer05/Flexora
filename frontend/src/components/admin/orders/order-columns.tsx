'use client'

import { Ban, CheckCircle, FileText, MousePointerBan, OctagonAlert, Trash2, X } from 'lucide-react'
import { useState } from 'react'

import { ActionsDropdown } from '@/components/admin/common/ActionsDropdown'
import CustomInput from '@/components/common/CustomInput'
import { CustomSelect } from '@/components/common/CustomSelect'
import StatusBadge from '@/components/common/StatusBadge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { useConfirmationModal } from '@/hooks/useConfirmationModal'
import { useFilter } from '@/hooks/useFilter'
import { showError } from '@/lib/errMsg'
import requests from '@/services/network/http'
import jsCookie from 'js-cookie'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { getOrderActions, QuickViewState } from './orderActions'
import OrderQuickViewDialog from './OrderQuickViewDialog'

// Custom table column type
export interface TableColumn<T = any> {
  key: string
  header: string | React.ReactNode
  render?: (value: any, data: T, index: number) => React.ReactNode
  width?: string
  className?: string
}

type ResendItem = {
  id: number
  orderNumber: string
  name: string
  quantity: number
  type: string
  deliveryStatus: string
  status: string
}

type ReplacementProductFormItem = {
  productId: string
  quantity: number
  availableStock?: number
  productName?: string
}

const ActionsCell = ({ data, mutate }: { data: Order; mutate?: () => void }) => {
  const router = useRouter()
  const { setPage } = useFilter(10)
  const authToken = jsCookie.get('adminToken')

  const [currentDialog, setCurrentDialog] = useState<{
    type:
      | 'edit'
      | 'replace-product'
      | 'send-message'
      | 'ban'
      | 'unban'
      | 'cancel'
      | 'mark-complete'
      | 'mark-delivered'
      | 'resend-product'
    isOpen: boolean
    data?: Order
  }>({ type: 'edit', isOpen: false })

  const [quickViewState, setQuickViewState] = useState<QuickViewState>({
    open: false,
    order: null
  })

  // Form states
  const [replaceProductForm, setReplaceProductForm] = useState<{
    products: ReplacementProductFormItem[]
    reason: string
  }>({
    products: [],
    reason: ''
  })
  const [orderDetails, setOrderDetails] = useState<any>(null)
  const [resendDetails, setResendDetails] = useState<any>(null)
  const [resendForm, setResendForm] = useState<{
    selectedOrderIds: number[]
    reason: string
    sendEmail: boolean
  }>({
    selectedOrderIds: [],
    reason: '',
    sendEmail: true
  })

  const [sendMessageForm, setSendMessageForm] = useState({
    message: '',
    recipientType: 'customer'
  })

  const [banForm, setBanForm] = useState({
    reason: ''
  })

  // Define action configurations with onClick handlers for confirmation modals
  const actionConfigs = {
    delete: {
      title: 'Delete Order',
      description: 'Delete this order permanently? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'destructive' as const,
      icon: Trash2,
      showInput: false,
      inputConfig: undefined,
      onClick: async (data: Order) => {
        try {
          await requests.delete(`/admin/orders/${data?.id}`)
          toast.success('Order deleted.')
          mutate?.()
        } catch (error) {
          showError(error)
          throw error // Re-throw to prevent modal from closing
        }
      }
    },
    'resend-product': {
      title: 'Resend Product',
      description: 'Resend this product delivery to the customer?',
      confirmText: 'Resend',
      variant: 'default' as const,
      icon: MousePointerBan,
      showInput: false,
      inputConfig: undefined,
      onClick: async (data: Order) => {
        try {
          await requests.post(`/admin/orders/${data?.id}/resend`, {})
          toast.success('Product delivery resent.')
          mutate?.()
        } catch (error) {
          showError(error)
          throw error
        }
      }
    },
    refund: {
      title: 'Refund Order',
      description: 'Process a refund for this order?',
      confirmText: 'Refund',
      variant: 'destructive' as const,
      icon: OctagonAlert,
      showInput: false,
      inputConfig: undefined,
      onClick: async (data: Order) => {
        try {
          await requests.post(`/admin/orders/${data?.id}/refund`, {})
          toast.success('Refund processed.')
          mutate?.()
        } catch (error) {
          showError(error)
          throw error
        }
      }
    },
    'export-invoice': {
      title: 'Export Invoice',
      description: 'Download the invoice for this order?',
      confirmText: 'Export',
      variant: 'default' as const,
      icon: FileText,
      showInput: false,
      inputConfig: undefined,
      onClick: async (data: Order) => {
        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_APP_ROOT_API}/admin/orders/${data?.id}/invoice`,
            {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${authToken}`
              }
            }
          )

          if (!response.ok) {
            throw new Error('Failed to download invoice')
          }

          const blob = await response.blob()
          const url = window.URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.setAttribute('download', `invoice-${data.orderNumber}.pdf`)
          document.body.appendChild(link)
          link.click()
          link.remove()
          window.URL.revokeObjectURL(url)
          toast.success('Invoice downloaded.')
        } catch (error) {
          showError(error)
          throw error
        }
      }
    },
    ban: {
      title: 'Ban Customer',
      description:
        'Are you sure you want to ban this customer? They will no longer be able to access the platform.',
      confirmText: 'Ban',
      variant: 'destructive' as const,
      icon: Ban,
      showInput: true,
      inputConfig: {
        name: 'reason',
        label: 'Ban Reason',
        placeholder: 'Add the reason for banning this customer',
        type: 'textarea' as const,
        required: true
      },
      onClick: async (data: Order, inputData?: Record<string, any>) => {
        try {
          if (!data.user?.id) {
            throw new Error('Customer ID not found')
          }
          await requests.post(`/admin/customers/${data.user.id}/ban`, {
            reason: inputData?.reason || ''
          })
          toast.success('Customer has been banned.')
          mutate?.()
        } catch (error) {
          showError(error)
          throw error
        }
      }
    },
    unban: {
      title: 'Unban Customer',
      description: 'Unban this customer and restore platform access?',
      confirmText: 'Unban',
      variant: 'default' as const,
      icon: CheckCircle,
      showInput: false,
      inputConfig: undefined,
      onClick: async (data: Order) => {
        try {
          if (!data.user?.id) {
            throw new Error('Customer ID not found')
          }
          await requests.post(`/admin/customers/${data.user.id}/unban`, {})
          toast.success('Customer has been unbanned.')
          mutate?.()
        } catch (error) {
          showError(error)
          throw error
        }
      }
    },
    cancel: {
      title: 'Cancel Order',
      description: 'Cancel this order?',
      confirmText: 'Cancel Order',
      variant: 'destructive' as const,
      icon: X,
      showInput: false,
      inputConfig: undefined,
      onClick: async (data: Order) => {
        try {
          await requests.put(`/admin/orders/${data?.id}/status`, {
            status: 'CANCELLED'
          })
          toast.success('Order cancelled.')
          mutate?.()
        } catch (error) {
          showError(error)
          throw error
        }
      }
    },
    'mark-complete': {
      title: 'Mark as Completed',
      description: 'Mark this order as completed? Use this when the order is fully finished.',
      confirmText: 'Mark Complete',
      variant: 'default' as const,
      icon: CheckCircle,
      showInput: false,
      inputConfig: undefined,
      onClick: async (data: Order) => {
        try {
          await requests.put(`/admin/orders/${data?.id}/status`, {
            status: 'COMPLETED'
          })
          toast.success('Order marked as completed.')
          mutate?.()
        } catch (error) {
          showError(error)
          throw error
        }
      }
    },
    'mark-delivered': {
      title: 'Mark as Delivered',
      description: 'Mark this order as delivered? Use this when the customer has received the item.',
      confirmText: 'Mark Delivered',
      variant: 'default' as const,
      icon: CheckCircle,
      showInput: false,
      inputConfig: undefined,
      onClick: async (data: Order) => {
        try {
          await requests.put(`/admin/orders/${data?.id}/delivery`, {
            deliveryStatus: 'DELIVERED'
          })
          toast.success('Order marked as delivered.')
          mutate?.()
        } catch (error) {
          showError(error)
          throw error
        }
      }
    }
  }

  const [currentAction, setCurrentAction] = useState<{
    type: keyof typeof actionConfigs
  } | null>(null)

  const actionModal = useConfirmationModal({
    title: currentAction ? actionConfigs[currentAction.type].title : '',
    description: currentAction ? actionConfigs[currentAction.type].description : '',
    confirmText: currentAction ? actionConfigs[currentAction.type].confirmText : 'Confirm',
    cancelText: 'Cancel',
    variant: currentAction ? actionConfigs[currentAction.type].variant : 'default',
    icon: currentAction ? actionConfigs[currentAction.type].icon : Trash2,
    showInput: currentAction ? actionConfigs[currentAction.type].showInput : false,
    inputConfig: currentAction ? actionConfigs[currentAction.type].inputConfig : undefined
  })

  // Unified action handler
  const handleAction = async (action: string, data: any) => {
    switch (action) {
      case 'edit':
        setCurrentDialog({ type: 'edit', isOpen: true, data })
        break
      case 'delete':
        if (actionConfigs.delete) {
          setCurrentAction({ type: 'delete' })
          actionModal.openModal(async () => {
            await actionConfigs.delete.onClick(data)
          })
        }
        break
      case 'resend-product':
        try {
          const response = await requests.get(`/admin/orders/${data.id}`)
          const details = (response as any)?.data || response
          const itemDetails = Array.isArray(details?.itemDetails) ? details.itemDetails : []
          const selectedOrderIds =
            itemDetails.length > 0
              ? itemDetails
                  .map((item: any) => Number(item.childOrderId || item.orderId || item.id))
                  .filter((id: number) => Number.isInteger(id) && id > 0)
              : [Number(data.id)]

          setResendDetails(details)
          setResendForm({
            selectedOrderIds,
            reason: '',
            sendEmail: true
          })
          setCurrentDialog({ type: 'resend-product', isOpen: true, data })
        } catch (error) {
          showError(error)
        }
        break
      case 'refund':
        if (actionConfigs.refund) {
          setCurrentAction({ type: 'refund' })
          actionModal.openModal(async () => {
            await actionConfigs.refund.onClick(data)
          })
        }
        break
      case 'export-invoice':
        if (actionConfigs['export-invoice']) {
          setCurrentAction({ type: 'export-invoice' })
          actionModal.openModal(async () => {
            await actionConfigs['export-invoice'].onClick(data)
          })
        }
        break
      case 'replace-product':
        // Fetch order details to show current products
        const fetchOrderDetails = async () => {
          try {
            const response = await requests.get(`/admin/orders/${data.id}`)
            if (response?.data) {
              setOrderDetails(response.data)
            }
          } catch (error) {
            console.error('Failed to fetch order details:', error)
          }
        }
        fetchOrderDetails()
        setCurrentDialog({ type: 'replace-product', isOpen: true, data })
        // Initialize with one empty product so user can start adding immediately
        setReplaceProductForm({ products: [{ productId: '', quantity: 1 }], reason: '' })
        break
      case 'send-message':
        {
          const telegramUsername =
            typeof data?.user?.telegramUsername === 'string' ? data.user.telegramUsername.trim() : ''
          if (!telegramUsername) {
            toast.error('This customer has not added a Telegram username.')
            return
          }
          window.open(`https://t.me/${telegramUsername.replace('@', '')}`, '_blank')
        }
        break
      case 'quick-view':
        setQuickViewState({
          open: true,
          order: data
        })
        break
      case 'clone-order':
        try {
          await requests.post(`/admin/orders/${data?.id}/clone`, {})
          toast.success('Order cloned.')
          mutate?.()
          setPage(1)
        } catch (error) {
          showError(error)
        }
        break
      case 'copy-private-link':
        if (data?.orderNumber) {
          navigator.clipboard.writeText(data.orderNumber)
          toast.success('Order number copied.')
        } else {
          toast.error('No order number is available to copy.')
        }
        break
      case 'ban':
        if (actionConfigs.ban) {
          setCurrentAction({ type: 'ban' })
          actionModal.openModal(async (inputData?: Record<string, any>) => {
            await actionConfigs.ban.onClick(data, inputData)
          })
        }
        break
      case 'unban':
        if (actionConfigs.unban) {
          setCurrentAction({ type: 'unban' })
          actionModal.openModal(async () => {
            await actionConfigs.unban.onClick(data)
          })
        }
        break
      case 'cancel':
        if (actionConfigs.cancel) {
          setCurrentAction({ type: 'cancel' })
          actionModal.openModal(async () => {
            await actionConfigs.cancel.onClick(data)
          })
        }
        break
      case 'mark-complete':
        if (actionConfigs['mark-complete']) {
          setCurrentAction({ type: 'mark-complete' })
          actionModal.openModal(async () => {
            await actionConfigs['mark-complete'].onClick(data)
          })
        }
        break
      case 'mark-delivered':
        if (actionConfigs['mark-delivered']) {
          setCurrentAction({ type: 'mark-delivered' })
          actionModal.openModal(async () => {
            await actionConfigs['mark-delivered'].onClick(data)
          })
        }
        break
      case 'view-details':
        router.push(`/admin/orders/${data.id}`)
        break
      default:
        console.log(`Action ${action} not implemented yet.`)
    }
  }

  const handleDialogClose = () => {
    setCurrentDialog({ type: 'edit', isOpen: false, data: undefined })
    // Reset form states
    setReplaceProductForm({ products: [], reason: '' })
    setSendMessageForm({ message: '', recipientType: 'customer' })
    setBanForm({ reason: '' })
    setOrderDetails(null)
    setResendDetails(null)
    setResendForm({ selectedOrderIds: [], reason: '', sendEmail: true })
  }

  // Handle form submissions
  const handleReplaceProduct = async () => {
    if (replaceProductForm.products.length === 0) {
      toast.error('Select at least one replacement product.')
      return
    }

    // Validate all products have productId and valid quantity
    for (let i = 0; i < replaceProductForm.products.length; i++) {
      const product = replaceProductForm.products[i]
      if (!product.productId || product.productId === '') {
        toast.error(`Choose a replacement product for item #${i + 1}.`)
        return
      }
      if (!product.quantity || product.quantity < 1) {
        toast.error(`Enter a valid quantity for item #${i + 1}. Minimum is 1.`)
        return
      }
      if (
        typeof product.availableStock === 'number' &&
        product.availableStock >= 0 &&
        product.quantity > product.availableStock
      ) {
        toast.error(
          `${product.productName || `Product #${i + 1}`} only has ${product.availableStock} replacement stock available`
        )
        return
      }
    }

    try {
      // If multiple products, we'll need to handle them
      // For now, backend supports single product replacement
      // So we'll replace with the first product or send multiple requests
      if (replaceProductForm.products.length === 1) {
        await requests.post(`/admin/orders/${currentDialog.data?.id}/replace-product`, {
          newProductId: replaceProductForm.products[0].productId,
          quantity: parseInt(replaceProductForm.products[0].quantity.toString()),
          reason: replaceProductForm.reason
        })
        toast.success('Replacement product assigned.')
      } else {
        // Multiple products - send requests sequentially
        for (const product of replaceProductForm.products) {
          await requests.post(`/admin/orders/${currentDialog.data?.id}/replace-product`, {
            newProductId: product.productId,
            quantity: parseInt(product.quantity.toString()),
            reason: replaceProductForm.reason
          })
        }
        toast.success(`${replaceProductForm.products.length} replacement products assigned.`)
      }
      mutate?.()
      handleDialogClose()
    } catch (error) {
      showError(error)
    }
  }

  const addProductToReplace = () => {
    setReplaceProductForm({
      ...replaceProductForm,
      products: [...replaceProductForm.products, { productId: '', quantity: 1 }]
    })
  }

  const removeProductFromReplace = (index: number) => {
    setReplaceProductForm({
      ...replaceProductForm,
      products: replaceProductForm.products.filter((_, i) => i !== index)
    })
  }

  const updateProductInReplace = (
    index: number,
    field: keyof ReplacementProductFormItem,
    value: string | number | undefined
  ) => {
    const updatedProducts = [...replaceProductForm.products]
    updatedProducts[index] = { ...updatedProducts[index], [field]: value }
    setReplaceProductForm({ ...replaceProductForm, products: updatedProducts })
  }

  const updateReplacementProductSelection = (index: number, selectedOption: any) => {
    const productId = String(selectedOption?.value || '')
    const availableStock = Number(selectedOption?.availableStock ?? selectedOption?.stockCount ?? 0)
    const currentProduct = replaceProductForm.products[index]
    const nextQuantity =
      availableStock > 0 ? Math.min(Math.max(Number(currentProduct?.quantity || 1), 1), availableStock) : 1
    const updatedProducts = [...replaceProductForm.products]
    updatedProducts[index] = {
      ...currentProduct,
      productId,
      quantity: nextQuantity,
      availableStock,
      productName: selectedOption?.name || selectedOption?.label || ''
    }
    setReplaceProductForm({ ...replaceProductForm, products: updatedProducts })
  }

  const handleSendMessage = async () => {
    try {
      await requests.post(`/admin/orders/${currentDialog.data?.id}/send-message`, sendMessageForm)
      toast.success('Message sent.')
      handleDialogClose()
    } catch (error) {
      showError(error)
    }
  }

  const getResendItems = (): ResendItem[] => {
    const itemDetails = Array.isArray(resendDetails?.itemDetails) ? resendDetails.itemDetails : []

    if (itemDetails.length > 0) {
      return itemDetails.map((item: any, index: number) => ({
        id: Number(item.childOrderId || item.orderId || item.id),
        orderNumber: item.orderNumber || item.childOrderNumber || `Item #${index + 1}`,
        name: item.product?.name || item.productName || item.name || `Item #${index + 1}`,
        quantity: item.quantity || item.quantityOrdered || 1,
        type: item.product?.type || item.productType || item.type || 'N/A',
        deliveryStatus: item.deliveryStatus || 'N/A',
        status: item.status || 'N/A'
      }))
    }

    return [
      {
        id: Number(currentDialog.data?.id),
        orderNumber: currentDialog.data?.orderNumber || 'Current order',
        name: currentDialog.data?.product?.name || 'Product',
        quantity: currentDialog.data?.quantity || 1,
        type: currentDialog.data?.product?.type || 'N/A',
        deliveryStatus: currentDialog.data?.deliveryStatus || 'N/A',
        status: currentDialog.data?.status || 'N/A'
      }
    ].filter((item: ResendItem) => Number.isInteger(item.id) && item.id > 0)
  }

  const toggleResendItem = (itemId: number, checked: boolean) => {
    setResendForm((current) => ({
      ...current,
      selectedOrderIds: checked
        ? Array.from(new Set([...current.selectedOrderIds, itemId]))
        : current.selectedOrderIds.filter((id) => id !== itemId)
    }))
  }

  const handleResendProduct = async () => {
    const resendItems = getResendItems()
    const selectedOrderIds = resendForm.selectedOrderIds.filter((id) =>
      resendItems.some((item) => item.id === id)
    )

    if (selectedOrderIds.length === 0) {
      toast.error('Select at least one item to resend.')
      return
    }

    try {
      const response = await requests.post(`/admin/orders/${currentDialog.data?.id}/resend`, {
        selectedOrderIds,
        resendAll: selectedOrderIds.length === resendItems.length,
        reason: resendForm.reason,
        sendEmail: resendForm.sendEmail
      })
      const resentCount = (response as any)?.data?.resentCount || (response as any)?.resentCount || selectedOrderIds.length
      toast.success(`${resentCount} item${resentCount === 1 ? '' : 's'} resent.`)
      mutate?.()
      handleDialogClose()
    } catch (error) {
      showError(error)
    }
  }

  // Get dialog title based on type
  const getDialogTitle = () => {
    switch (currentDialog.type) {
      case 'edit':
        return 'Edit Order'
      case 'replace-product':
        return 'Replace Product'
      case 'send-message':
        return 'Send Telegram Message'
      case 'resend-product':
        return 'Resend Products'
      default:
        return 'Order Action'
    }
  }

  // Render dialog content based on type
  const renderDialogContent = () => {
    switch (currentDialog.type) {
      case 'replace-product':
        return (
          <div className='space-y-4'>
            {/* Show Current Products */}
            {orderDetails && (
              <div className='p-4 bg-muted/50 rounded-lg border'>
                <h4 className='font-semibold mb-3 text-sm'>Current Order Products:</h4>
                <div className='space-y-2'>
                  {orderDetails.items?.map((item: any, index: number) => (
                    <div key={index} className='flex items-center justify-between text-sm'>
                      <span>
                        {item.product?.name || `Product #${item.productId}`} (Qty: {item.quantity})
                      </span>
                      <Badge variant='outline'>{item.product?.platform || 'N/A'}</Badge>
                    </div>
                  )) || (
                    <div className='text-sm text-muted-foreground'>
                      {orderDetails.product?.name || 'Product'} (Qty: {orderDetails.quantity || 1})
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Replacement Products */}
            <div className='space-y-4'>
              <div className='flex items-center justify-between'>
                <label className='text-sm font-medium'>Replacement Products</label>
                <Button type='button' variant='outline' size='sm' onClick={addProductToReplace}>
                  + Add Product
                </Button>
              </div>

              {replaceProductForm.products.length === 0 && (
                <div className='text-sm text-muted-foreground text-center py-4'>
                      No replacement products selected yet. Use Add Product to choose what should
                      be delivered instead.
                </div>
              )}

              {replaceProductForm.products.map((product, index) => (
                <div key={index} className='p-4 border rounded-lg space-y-3'>
                  <div className='flex items-center justify-between'>
                    <span className='text-sm font-medium'>Product #{index + 1}</span>
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      onClick={() => removeProductFromReplace(index)}
                      className='text-destructive hover:text-destructive'
                    >
                      Remove
                    </Button>
                  </div>
                  <CustomSelect
                    showSearch
                    returnFullData
                    label='Select Replacement Product'
                    placeholder='Choose replacement product'
                    url='/admin/products'
                    options={(data) =>
                      data?.data?.products?.map((p: any) => {
                        const availableStock = Number(p?._count?.accounts ?? p.stockCount ?? 0)
                        return {
                          label: `${p.name} (${p.platform}) - Stock: ${availableStock}`,
                          title: `${p.name} (${p.platform}) - Stock: ${availableStock}`,
                          value: p.id.toString(),
                          disabled: availableStock <= 0,
                          stockCount: Number(p.stockCount ?? 0),
                          availableStock,
                          name: p.name,
                          platform: p.platform
                        }
                      }) || []
                    }
                    value={product.productId ? [product.productId] : []}
                    onChange={(selectedOption: any) => updateReplacementProductSelection(index, selectedOption)}
                  />
                  {product.productId && (
                    <div className='rounded-md border bg-muted/40 px-3 py-2 text-sm'>
                      <span className='font-medium'>Available replacement stock: </span>
                      <span
                        className={
                          Number(product.availableStock || 0) > 0 ? 'text-green-600' : 'text-destructive'
                        }
                      >
                        {Number(product.availableStock || 0)}
                      </span>
                    </div>
                  )}
                  <CustomInput
                    type='number'
                    label='Quantity'
                    value={product.quantity.toString()}
                    onChange={(e) =>
                      updateProductInReplace(
                        index,
                        'quantity',
                        Math.min(
                          parseInt(e.target.value) || 1,
                          typeof product.availableStock === 'number' && product.availableStock > 0
                            ? product.availableStock
                            : Number.MAX_SAFE_INTEGER
                        )
                      )
                    }
                    placeholder='Enter quantity'
                    min={1}
                    max={product.availableStock || undefined}
                    disabled={product.availableStock === 0}
                  />
                </div>
              ))}
            </div>

            <CustomInput
              type='textarea'
              label='Reason for replacement'
              value={replaceProductForm.reason}
              onChange={(e) =>
                setReplaceProductForm({ ...replaceProductForm, reason: e.target.value })
              }
              placeholder='Add a short reason for the replacement history.'
              rows={3}
              maxLength={160}
              showCharCount={true}
            />
          </div>
        )

      case 'send-message':
        return (
          <div className='space-y-4'>
            <CustomInput
              type='textarea'
              label='Message'
              value={sendMessageForm.message}
              onChange={(e) => setSendMessageForm({ ...sendMessageForm, message: e.target.value })}
              placeholder='Write the Telegram message for this customer.'
              maxLength={160}
              showCharCount={true}
            />
          </div>
        )

      case 'resend-product': {
        const resendItems = getResendItems()
        const allSelected =
          resendItems.length > 0 &&
          resendItems.every((item) => resendForm.selectedOrderIds.includes(item.id))

        return (
          <div className='space-y-5'>
            <div className='rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground'>
              Choose all items or only the products that should be resent. The customer email will
              include item details and TXT, JSON, and CSV downloads.
            </div>

            <div className='space-y-3'>
              <div className='flex items-center justify-between gap-3'>
                <div>
                  <p className='text-sm font-semibold'>Items in this order</p>
                  <p className='text-xs text-muted-foreground'>
                    {resendForm.selectedOrderIds.length} of {resendItems.length} selected
                  </p>
                </div>
                {resendItems.length > 1 && (
                  <label className='flex items-center gap-2 text-sm'>
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={(checked) =>
                        setResendForm((current) => ({
                          ...current,
                          selectedOrderIds: checked ? resendItems.map((item) => item.id) : []
                        }))
                      }
                    />
                    Select all
                  </label>
                )}
              </div>

              <div className='max-h-[320px] space-y-2 overflow-y-auto pr-1'>
                {resendItems.map((item) => {
                  const checked = resendForm.selectedOrderIds.includes(item.id)
                  return (
                    <label
                      key={item.id}
                      className='flex cursor-pointer items-start gap-3 rounded-lg border bg-background p-3'
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) => toggleResendItem(item.id, Boolean(value))}
                        className='mt-1'
                      />
                      <div className='min-w-0 flex-1 space-y-2'>
                        <div className='flex flex-wrap items-center gap-2'>
                          <p className='break-words text-sm font-semibold'>{item.name}</p>
                          <Badge variant='outline'>Qty: {item.quantity}</Badge>
                          <Badge variant='secondary'>{item.type}</Badge>
                        </div>
                        <div className='flex flex-wrap gap-2 text-xs text-muted-foreground'>
                          <span>{item.orderNumber}</span>
                          <span>Status: {item.status}</span>
                          <span>Delivery: {item.deliveryStatus}</span>
                        </div>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>

            <CustomInput
              type='textarea'
              label='Reason / internal note'
              value={resendForm.reason}
              onChange={(e) => setResendForm({ ...resendForm, reason: e.target.value })}
              placeholder='Optional note for resend history and the customer email.'
              rows={3}
              maxLength={200}
              showCharCount={true}
            />

            <label className='flex items-center gap-2 text-sm'>
              <Checkbox
                checked={resendForm.sendEmail}
                onCheckedChange={(checked) =>
                  setResendForm({ ...resendForm, sendEmail: Boolean(checked) })
                }
              />
              Send itemized email to customer
            </label>
          </div>
        )
      }

      default:
        return <div>Form content not implemented yet.</div>
    }
  }

  return (
    <>
      <ActionsDropdown data={data} actions={getOrderActions(data, mutate, handleAction)} />
      <actionModal.ModalComponent />

      {/* Quick View Dialog */}
      {quickViewState.order && (
        <OrderQuickViewDialog
          order={quickViewState.order}
          open={quickViewState.open}
          onOpenChange={(open) => setQuickViewState({ ...quickViewState, open })}
        />
      )}

      {/* Unified Dialog for all form-based actions */}
      <Dialog open={currentDialog.isOpen} onOpenChange={handleDialogClose}>
        <DialogContent className='sm:max-w-3xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>{getDialogTitle()}</DialogTitle>
          </DialogHeader>
          {renderDialogContent()}
          <DialogFooter>
            <Button variant='outline' onClick={handleDialogClose}>
              Cancel
            </Button>
            {currentDialog.type === 'replace-product' && (
              <Button
                onClick={handleReplaceProduct}
                disabled={replaceProductForm.products.length === 0}
              >
                Replace {replaceProductForm.products.length > 1 ? 'Products' : 'Product'}
              </Button>
            )}
            {currentDialog.type === 'send-message' && (
              <Button onClick={handleSendMessage}>Send Message</Button>
            )}
            {currentDialog.type === 'resend-product' && (
              <Button onClick={handleResendProduct} disabled={resendForm.selectedOrderIds.length === 0}>
                Resend Selected
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Product columns function that accepts mutate callback
export const orderColumns = (mutate?: () => void): TableColumn<Order>[] => {
  return [
    {
      key: 'orderNumber',
      header: 'Order ID',
      width: 'w-32'
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (_, record) => {
        // Check if it's a guest order
        const isGuest = !record?.user && (record?.guestEmail || record?.customerName)

        if (isGuest) {
          // Display guest information
          const guestName = record?.customerName || 'Guest'
          const guestEmail = record?.guestEmail || ''
          const guestPhone = record?.customerName || ''
          const initial = guestName?.[0] || guestEmail?.[0] || 'G'

          return (
            <div className='flex items-center gap-3'>
              <Avatar className='w-8 h-8'>
                <AvatarFallback className='bg-blue-500/10 text-blue-500 text-xs'>
                  {initial.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className='font-medium'>
                <div className='flex items-center gap-2'>
                  <span>{guestName}</span>
                  <Badge
                    variant='outline'
                    className='bg-blue-500/10 text-blue-500 border-blue-500/20 text-xs'
                  >
                    Guest
                  </Badge>
                </div>
                {guestEmail && <div className='text-muted-foreground text-sm'>{guestEmail}</div>}
                {guestPhone && (
                  <div className='text-muted-foreground text-xs'>Phone: {guestPhone}</div>
                )}
              </div>
            </div>
          )
        }

        // Display logged-in user information
        return (
          <div className='flex items-center gap-3'>
            <Avatar className='w-8 h-8'>
              <AvatarImage
                src={(() => {
                  const user = record?.user as any
                  return user?.avatar || user?.profilePicture || undefined
                })()}
                alt={record?.user?.firstName || 'Customer'}
              />
              <AvatarFallback className='bg-primary/10 text-primary text-xs'>
                {(record?.user?.firstName?.[0] || record?.user?.email?.[0] || 'C').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className='font-medium'>
              <div className='flex items-center gap-2'>
                <span>
                  {record?.user?.firstName} {record?.user?.lastName}
                </span>
                {record?.user?.username && (
                  <span className='text-muted-foreground text-xs'>@{record?.user?.username}</span>
                )}
                {record?.user?.isBanned && (
                  <Badge variant='destructive' className='text-xs'>
                    Banned
                  </Badge>
                )}
              </div>
              <div className='text-muted-foreground text-sm'>{record?.user?.email}</div>
              {record?.user?.telegramUsername && (
                <div className='text-muted-foreground text-xs'>
                  Telegram: @{record?.user?.telegramUsername}
                </div>
              )}
            </div>
          </div>
        )
      },
      width: 'w-64'
    },
    {
      key: 'total',
      header: 'Total Amount',
      render: (_, record) => <span className='font-medium'>${record?.total}</span>,
      width: 'w-32'
    },
    {
      key: 'status',
      header: 'Order Status',
      render: (_, record) => <StatusBadge type='order' status={record.status} />,
      width: 'w-32'
    },
    {
      key: 'deliveryStatus',
      header: 'Delivery',
      render: (_, record) => <StatusBadge status={record.deliveryStatus} />,
      width: 'w-28'
    },
    {
      key: 'createdAt',
      header: 'Order Date',
      render: (_, record) => (
        <div className='text-sm'>{new Date(record.createdAt).toLocaleDateString()}</div>
      ),
      width: 'w-32'
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, data) => <ActionsCell data={data} mutate={mutate} />,
      width: 'w-20'
    }
  ]
}
