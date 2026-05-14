'use client'

import TransferProductForm from '@/components/admin/form/TransferProduct'
import useAsync from '@/hooks/useAsync'
import { useState } from 'react'

export default function AddNewTransferProduct() {
  const [categoriesUrl] = useState(() => `/admin/categories?limit=100&nonce=${Date.now()}`)
  const { data } = useAsync<{ data: { categories: Category[] } }>(
    categoriesUrl,
    true,
    true
  )
  return <TransferProductForm categories={data?.data?.categories || []} />
}
