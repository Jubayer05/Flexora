export interface SubscriptionPackage {
  id: number
  name: string
  description: string | null
  price: string
  discount: string
  duration: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  meta?: {
    icon?: string
    features?: string[]
    [key: string]: any
  } | null
}

export interface ActiveSubscription {
  package: {
    id: number
    name: string
    discount: string
    price: string
    duration?: number
  } | null
  startDate: string | null
  endDate: string | null
  daysRemaining: number
}

export interface SubscriptionPayment {
  id: number
  userId: number
  subscriptionPackageId: number
  paymentMethodId: number
  amount: string
  paymentStatus: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED'
  periodStart: string
  periodEnd: string
  paidAt: string | null
  processedAt: string | null
  gatewayTxnId: string | null
  createdAt: string
  updatedAt: string
  subscriptionPackage?: {
    id: number
    name: string
    discount: string
  }
  paymentMethod?: {
    name: string
    gateway: string
  }
}

export interface PurchaseSubscriptionRequest {
  subscriptionPackageId: number
  paymentMethodId: number
}

export interface RenewSubscriptionRequest {
  paymentMethodId: number
}

export interface PurchaseSubscriptionResponse {
  subscriptionPayment: SubscriptionPayment
  subscriptionPackage: SubscriptionPackage
  periodStart: string
  periodEnd: string
}

export interface SubscriptionHistoryResponse {
  data: SubscriptionPayment[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface SubscriptionPackagesResponse {
  data: SubscriptionPackage[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}
