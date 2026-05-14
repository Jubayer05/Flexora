'use client'

import ProductForm from '@/components/admin/form/Product'
import useAsync from '@/hooks/useAsync'
import { useState } from 'react'

export default function AddNewProduct() {
  const [categoriesUrl] = useState(() => `/admin/categories?limit=100&nonce=${Date.now()}`)
  const { data } = useAsync<{ data: { categories: Category[] } }>(
    categoriesUrl,
    true,
    true
  )
  return <ProductForm categories={data?.data?.categories || []} />
}
