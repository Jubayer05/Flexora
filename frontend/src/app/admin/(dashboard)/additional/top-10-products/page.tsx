'use client'

import PageHeader from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import useAsync from '@/hooks/useAsync'
import { showError } from '@/lib/errMsg'
import requests from '@/services/network/http'
import { ArrowDown, ArrowUp, Loader2, Save, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

type TopTenMode = 'auto' | 'manual'

type TopTenSettings = {
  mode?: TopTenMode
  productIds?: number[]
}

type Product = {
  id: number
  name: string
  sku: string
  soldCount: number
  price: number | string
  isActive: boolean
  category?: {
    id: number
    name: string
  } | null
}

export default function TopTenProductsAdminPage() {
  const [mode, setMode] = useState<TopTenMode>('auto')
  const [productIds, setProductIds] = useState<number[]>([])
  const [selectedToAdd, setSelectedToAdd] = useState<string>('')
  const [saving, setSaving] = useState(false)

  const { data: settingData, loading: settingsLoading } = useAsync<{ data?: { value?: TopTenSettings } }>(
    () => '/admin/settings/key/shop_top_ten_products',
    true
  )

  useEffect(() => {
    const value = settingData?.data?.value
    if (!value) return

    setMode(value.mode === 'manual' ? 'manual' : 'auto')
    setProductIds(
      Array.from(
        new Set(
          ((value.productIds ?? []) as Array<number | string>)
            .map((id: number | string) => Number(id))
            .filter((id: number) => Number.isInteger(id) && id > 0)
        )
      ).slice(0, 10)
    )
  }, [settingData?.data?.value])

  const { data: autoProductsData, loading: autoProductsLoading } = useAsync<{ data?: { products?: Product[] } }>(
    () => '/admin/products?limit=10&sortBy=soldCount&sortOrder=desc'
  )

  const { data: manualProductsData, loading: manualProductsLoading } = useAsync<{ data?: { products?: Product[] } }>(
    () => (productIds.length ? `/admin/products?ids=${productIds.join(',')}&limit=20` : null)
  )

  const { data: searchableProductsData } = useAsync<{ data?: { products?: Product[] } }>(
    () => '/admin/products?limit=100&sortBy=createdAt&sortOrder=desc'
  )

  const manualProducts = useMemo(() => {
    const fetched = manualProductsData?.data?.products ?? []
    const orderMap = new Map(productIds.map((id, index) => [id, index]))
    return [...fetched].sort(
      (a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999)
    )
  }, [manualProductsData?.data?.products, productIds])

  const availableProducts = useMemo(() => {
    const fetched = searchableProductsData?.data?.products ?? []
    return fetched.filter((product: Product) => !productIds.includes(product.id))
  }, [searchableProductsData?.data?.products, productIds])

  const addProduct = () => {
    const id = Number(selectedToAdd)
    if (!Number.isInteger(id) || id <= 0) return
    if (productIds.includes(id)) return
    if (productIds.length >= 10) {
      toast.error('Top 10 can only contain 10 products')
      return
    }
    setProductIds((prev) => [...prev, id])
    setSelectedToAdd('')
  }

  const removeProduct = (id: number) => {
    setProductIds((prev) => prev.filter((productId) => productId !== id))
  }

  const moveProduct = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= productIds.length) return

    setProductIds((prev) => {
      const updated = [...prev]
      const [item] = updated.splice(index, 1)
      if (item === undefined) return prev
      updated.splice(nextIndex, 0, item)
      return updated
    })
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const payload: TopTenSettings = {
        mode,
        productIds: mode === 'manual' ? productIds.slice(0, 10) : []
      }

      const res = await requests.post('/admin/settings/shop_top_ten_products', {
        value: payload
      })

      if (res?.success) {
        toast.success('Top 10 products updated successfully')
      }
    } catch (error) {
      showError(error)
    } finally {
      setSaving(false)
    }
  }

  const autoProducts = autoProductsData?.data?.products ?? []

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Top 10 Products'
        subTitle='Manage the dedicated Top 10 section shown between group products and all products.'
        extra={
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : <Save className='mr-2 h-4 w-4' />}
            Save
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Top 10 Mode</CardTitle>
          <CardDescription>
            Use manual mode for a fixed curated list, or auto mode to show the most sold products.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='max-w-sm'>
            <Select value={mode} onValueChange={(value) => setMode(value as TopTenMode)}>
              <SelectTrigger>
                <SelectValue placeholder='Select mode' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='auto'>Auto by sold count</SelectItem>
                <SelectItem value='manual'>Manual selection</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {mode === 'manual' ? (
        <Card>
          <CardHeader>
            <CardTitle>Manual Top 10 List</CardTitle>
            <CardDescription>
              Add up to 10 products, then move them up or down to control the exact order shown on the shop page.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='flex flex-col gap-3 md:flex-row'>
              <Select value={selectedToAdd} onValueChange={setSelectedToAdd}>
                <SelectTrigger className='w-full'>
                  <SelectValue placeholder='Select a product to add' />
                </SelectTrigger>
                <SelectContent>
                  {availableProducts.map((product: Product) => (
                    <SelectItem key={product.id} value={String(product.id)}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={addProduct} disabled={!selectedToAdd || productIds.length >= 10}>
                Add Product
              </Button>
            </div>

            {settingsLoading || manualProductsLoading ? (
              <div className='space-y-3'>
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className='h-20 w-full rounded-xl' />
                ))}
              </div>
            ) : manualProducts.length ? (
              <div className='space-y-3'>
                {manualProducts.map((product: Product, index: number) => (
                  <div
                    key={product.id}
                    className='flex flex-col gap-3 rounded-xl border border-border bg-card p-4 md:flex-row md:items-center md:justify-between'
                  >
                    <div>
                      <div className='font-semibold'>
                        {index + 1}. {product.name}
                      </div>
                      <div className='text-sm text-muted-foreground'>
                        {product.category?.name || 'No category'} • SKU: {product.sku} • Sold:{' '}
                        {product.soldCount ?? 0}
                      </div>
                    </div>
                    <div className='flex items-center gap-2'>
                      <Button
                        variant='outline'
                        size='icon'
                        onClick={() => moveProduct(index, -1)}
                        disabled={index === 0}
                      >
                        <ArrowUp className='h-4 w-4' />
                      </Button>
                      <Button
                        variant='outline'
                        size='icon'
                        onClick={() => moveProduct(index, 1)}
                        disabled={index === manualProducts.length - 1}
                      >
                        <ArrowDown className='h-4 w-4' />
                      </Button>
                      <Button
                        variant='destructive'
                        size='icon'
                        onClick={() => removeProduct(product.id)}
                      >
                        <Trash2 className='h-4 w-4' />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className='rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground'>
                No products selected for Top 10 yet.
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Auto Preview</CardTitle>
            <CardDescription>
              These are the products that will appear when Top 10 uses sold-count ranking.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {autoProductsLoading ? (
              <div className='space-y-3'>
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className='h-20 w-full rounded-xl' />
                ))}
              </div>
            ) : autoProducts.length ? (
              <div className='space-y-3'>
                {autoProducts.map((product: Product, index: number) => (
                  <div key={product.id} className='rounded-xl border border-border bg-card p-4'>
                    <div className='font-semibold'>
                      {index + 1}. {product.name}
                    </div>
                    <div className='text-sm text-muted-foreground'>
                      {product.category?.name || 'No category'} • SKU: {product.sku} • Sold:{' '}
                      {product.soldCount ?? 0}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className='rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground'>
                No products available for auto Top 10 preview.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
