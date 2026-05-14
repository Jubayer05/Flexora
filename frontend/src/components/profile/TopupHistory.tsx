'use client'

import { useEffect, useState } from 'react'
import useAsync from '@/hooks/useAsync'
import { CheckCircle, Clock, XCircle, CreditCard } from 'lucide-react'

export function TopupHistory() {
  const [isClient, setIsClient] = useState(false)

  const { data: requestsData, loading } = useAsync<any>(
    () => '/customer/balance/topup-requests',
    false
  )

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) return null

  const requests = requestsData?.data || []

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
      case 'COMPLETED':
        return <CheckCircle className="w-4 h-4" />
      case 'PENDING':
        return <Clock className="w-4 h-4" />
      case 'REJECTED':
        return <XCircle className="w-4 h-4" />
      default:
        return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
      case 'APPROVED':
      case 'COMPLETED':
        return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
      case 'REJECTED':
        return 'bg-red-500/20 text-red-400 border border-red-500/40'
      default:
        return 'bg-gray-500/20 text-gray-400'
    }
  }

  const isStripeTopup = (reason: string) => {
    return reason?.includes('Stripe') || reason?.includes('stripe')
  }

  return (
    <div className="mt-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-white mb-2">
          Topup History
        </h3>
        <p className="text-sm text-gray-400">
          Track all your balance topups and payments
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-400 text-sm">Loading topup history...</p>
          </div>
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50 rounded-lg p-8 text-center">
          <div className="mb-3">
            <CreditCard className="w-12 h-12 text-gray-600 mx-auto opacity-50" />
          </div>
          <p className="text-gray-400 font-medium">No topup history yet</p>
          <p className="text-gray-500 text-sm mt-1">
            Your topup transactions will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req: any) => (
            <div
              key={req.id}
              className="bg-gradient-to-br from-indigo-950/40 to-gray-900/40 border border-indigo-500/30 hover:border-indigo-500/60 rounded-lg p-4 transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/10"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-2xl font-bold text-indigo-400">
                      ${Number(req.amount).toFixed(2)}
                    </span>
                    {isStripeTopup(req.reason) && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                        <CreditCard className="w-3 h-3" />
                        Stripe
                      </span>
                    )}
                  </div>
                  {req.reason && (
                    <p className="text-sm text-gray-400 line-clamp-1">
                      {req.reason}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(req.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold ${getStatusColor(req.status)}`}>
                    {getStatusIcon(req.status)}
                    {(req.status === 'APPROVED' || req.status === 'COMPLETED') && !isStripeTopup(req.reason) && 'Completed'}
                    {(req.status === 'APPROVED' || req.status === 'COMPLETED') && isStripeTopup(req.reason) && 'Completed'}
                    {req.status !== 'APPROVED' && req.status !== 'COMPLETED' && req.status}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
