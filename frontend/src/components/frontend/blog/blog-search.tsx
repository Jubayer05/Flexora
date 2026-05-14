'use client'

import CustomInput from '@/components/common/CustomInput'
import { Typography } from '@/components/common/typography'
import { useRouter } from 'next/navigation'

export default function BlogSearch() {
  const router = useRouter()

  const onSearch = (e: any) => {
    router.push(`/blogs?q=${e.target.value}`, { scroll: false })
  }

  return (
    <div className='space-y-4 p-10 border border-gray-300 rounded-lg'>
      <Typography variant='h5' weight='medium' className='pb-2 border-gray-200 border-b'>
        Search
      </Typography>
      <CustomInput placeholder='Search for products' onBlur={onSearch} size='large' />
    </div>
  )
}
