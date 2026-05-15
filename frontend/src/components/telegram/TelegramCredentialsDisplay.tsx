'use client'

interface Account {
  id?: number
  username?: string
  password?: string
  phone?: string
  [key: string]: any
}

interface TelegramCredentialsDisplayProps {
  accounts: Account[]
  productName?: string
  orderId?: number
}

export default function TelegramCredentialsDisplay({
  accounts,
  productName,
  orderId
}: TelegramCredentialsDisplayProps) {
  if (!accounts || accounts.length === 0) {
    return (
      <div className="text-center py-4 text-on-surface-variant">
        No account details available
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-headline-md text-headline-md text-on-surface">
          Your Telegram Credentials
        </h3>
        {productName && (
          <span className="text-xs text-on-surface-variant">{productName}</span>
        )}
      </div>

      <div className="space-y-3">
        {accounts.map((account, index) => (
          <div
            key={account.id || index}
            className="glass-card rounded-lg p-md border border-outline-variant/20"
          >
            <div className="text-xs text-on-surface-variant mb-sm">
              Account #{index + 1}
            </div>
            <div className="space-y-xs">
              {account.username && (
                <div className="flex items-center gap-sm">
                  <span className="text-xs text-on-surface-variant w-20">Username:</span>
                  <span className="font-data-md text-sm text-on-surface">{account.username}</span>
                </div>
              )}
              {account.password && (
                <div className="flex items-center gap-sm">
                  <span className="text-xs text-on-surface-variant w-20">Password:</span>
                  <span className="font-data-md text-sm text-on-surface">{account.password}</span>
                </div>
              )}
              {account.phone && (
                <div className="flex items-center gap-sm">
                  <span className="text-xs text-on-surface-variant w-20">Phone:</span>
                  <span className="font-data-md text-sm text-on-surface">{account.phone}</span>
                </div>
              )}
              {Object.entries(account).map(([key, value]) => {
                if (['id', 'username', 'password', 'phone'].includes(key)) return null
                return (
                  <div key={key} className="flex items-center gap-sm">
                    <span className="text-xs text-on-surface-variant w-20 capitalize">{key}:</span>
                    <span className="font-data-md text-sm text-on-surface">{String(value)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="text-xs text-on-surface-variant/50 text-center">
        Order ID: {orderId || 'N/A'}
      </div>
    </div>
  )
}