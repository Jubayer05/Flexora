'use client'

import { WalletTopupPanel } from '@/components/profile/WalletTopupPanel'

export default function WalletTopupPage() {
  return (
    <div className='mx-auto mt-6 max-w-3xl space-y-6 px-4 pb-12 font-manrope'>
      <WalletTopupPanel mode='page' />
    </div>
  )
}
