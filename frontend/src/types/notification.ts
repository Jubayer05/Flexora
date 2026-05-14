export interface AdminNotification {
  id: number
  userId: number | null
  title: string
  message: string
  type: 'ORDER' | 'PAYMENT' | 'RESTOCK' | 'SYSTEM' | 'PROMOTION' | 'OTHERS'
  role: 'ADMIN' | 'CUSTOMER' | 'GUEST' | 'MODERATOR'
  isRead: boolean
  attachments: string[]
  meta: Record<string, any>
  createdAt: string
  updatedAt: string
}

export interface CustomerNotification {
  id: number
  userId: number | null
  title: string
  message: string
  type: 'ORDER' | 'PAYMENT' | 'RESTOCK' | 'SYSTEM' | 'PROMOTION' | 'OTHERS'
  isRead: boolean
  attachments: string[]
  meta: Record<string, any>
  createdAt: string
  updatedAt: string
}
