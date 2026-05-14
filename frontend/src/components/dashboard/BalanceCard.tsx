'use client'

import { useEffect, useState } from 'react'
import useAsync from '@/hooks/useAsync'

export function DashboardBalanceCard() {
  const [isClient, setIsClient] = useState(false)

  const { data: balanceData, loading, error } = useAsync<any>(
    () => '/customer/balance',
    false
  )

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient || loading) {
    return (
      <div style={{
        padding: '20px',
        backgroundColor: '#1e40af',
        border: '2px solid #3b82f6',
        borderRadius: '8px',
        color: '#60a5fa'
      }}>
        ⏳ Loading balance...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        padding: '20px',
        backgroundColor: '#7f1d1d',
        border: '2px solid #ef4444',
        borderRadius: '8px',
        color: '#fca5a5'
      }}>
        ❌ Unable to load balance
      </div>
    )
  }

  const balance = balanceData?.data?.balance ?? 0

  return (
    <div style={{
      padding: '24px',
      backgroundColor: 'rgba(99, 102, 241, 0.15)',
      border: '2px solid #6366f1',
      borderRadius: '8px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <div>
        <div style={{ color: '#a5b4fc', fontSize: '13px', marginBottom: '8px' }}>
          \ud83d\udcb0 Available Balance
        </div>
        <div style={{
          color: '#6366f1',
          fontSize: '36px',
          fontWeight: 'bold'
        }}>
          ${Number(balance).toFixed(2)}
        </div>
      </div>
      <div style={{
        width: '80px',
        height: '80px',
        backgroundColor: 'rgba(99, 102, 241, 0.3)',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '40px'
      }}>
        💳
      </div>
    </div>
  )
}
