'use client'

import ProductForm from '@/components/admin/form/Product'
import ProductStockManager from '@/components/admin/products/ProductStockManager'
import PageHeader from '@/components/common/PageHeader'
import useAsync from '@/hooks/useAsync'
import { isTelegramTransferProduct } from '@/lib/productTypeUtils'
import { useParams } from 'next/navigation'
import { useState } from 'react'

const PREMIUM_PRODUCT_TYPES = new Set(['PREMIUM_1M', 'PREMIUM_3M', 'PREMIUM_6M', 'PREMIUM_12M'])

const usesTelegramStockManager = (product: Product) =>
  product.platform === 'TELEGRAM' &&
  !isTelegramTransferProduct(product) &&
  !PREMIUM_PRODUCT_TYPES.has(String(product.type))

export default function EditProduct() {
  const params = useParams()
  const [productUrl] = useState(
    () => `/admin/products/${params.id}?includeAccounts=true&nonce=${Date.now()}`
  )
  const [categoriesUrl] = useState(() => `/admin/categories?limit=100&nonce=${Date.now()}`)
  const { data: productData } = useAsync<{ data: Product }>(productUrl, true, true)
  const { data: categoriesData } = useAsync<{ data: { categories: Category[] } }>(
    categoriesUrl,
    true,
    true
  )

  if (!productData?.data || !categoriesData?.data) {
    return <div>Loading...</div>
  }

  return (
    <div className='space-y-6'>
      <PageHeader title='Edit Product' subTitle='Update product information and stock' />

      <ProductForm
        initialData={productData.data}
        categories={categoriesData.data?.categories || []}
      />

      {usesTelegramStockManager(productData.data) && (
        <ProductStockManager product={productData.data} />
      )}
    </div>
  )
}
