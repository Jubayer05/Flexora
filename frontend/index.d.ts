/**
 * UHQ Frontend - Global Type Definitions
 *
 * This file contains all the type definitions for the UHQ application.
 * It serves as the central type registry for the entire frontend application.
 */

// ================================
// GLOBAL DECLARATIONS
// ================================

declare global {
  // ================================
  // GLOBAL ENUMS
  // ================================

  enum UserRole {
    ADMIN = 'ADMIN',
    CUSTOMER = 'CUSTOMER',
    GUEST = 'GUEST',
    MODERATOR = 'MODERATOR'
  }

  enum UserRank {
    NEW = 'NEW',
    NORMAL = 'NORMAL',
    FREQUENT = 'FREQUENT',
    ELITE = 'ELITE',
    VIP = 'VIP',
    MASTER = 'MASTER'
  }

  enum PlatformType {
    TELEGRAM = 'TELEGRAM',
    OTHER = 'OTHER'
  }

  enum OrderStatus {
    PENDING = 'PENDING',
    CONFIRMED = 'CONFIRMED',
    PARTIAL = 'PARTIAL',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
    REFUNDED = 'REFUNDED'
  }

  enum PaymentStatus {
    PENDING = 'PENDING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
    PARTIAL = 'PARTIAL',
    REFUNDED = 'REFUNDED'
  }

  enum PaymentMethod {
    BINANCE = 'BINANCE',
    NOWPAYMENT = 'NOWPAYMENT',
    STRIPE = 'STRIPE',
    PLISIO = 'PLISIO',
    CHANGENOW = 'CHANGENOW',
    CRYPTOMUS = 'CRYPTOMUS',
    OTHER = 'OTHER'
  }

  enum DeliveryStatus {
    PENDING = 'PENDING',
    PROCESSING = 'PROCESSING',
    DELIVERED = 'DELIVERED',
    FAILED = 'FAILED',
    PARTIAL = 'PARTIAL'
  }

  enum TelegramTransferStatus {
    PENDING = 'PENDING',
    VERIFICATION_REQUIRED = 'VERIFICATION_REQUIRED',
    CUSTOMER_JOINED = 'CUSTOMER_JOINED',
    TRANSFER_IN_PROGRESS = 'TRANSFER_IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED'
  }

  enum TicketStatus {
    OPEN = 'OPEN',
    IN_PROGRESS = 'IN_PROGRESS',
    RESOLVED = 'RESOLVED',
    CLOSED = 'CLOSED'
  }

  enum TicketPriority {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    URGENT = 'URGENT'
  }

  enum NotificationType {
    ORDER = 'ORDER',
    PAYMENT = 'PAYMENT',
    RESTOCK = 'RESTOCK',
    SYSTEM = 'SYSTEM',
    PROMOTION = 'PROMOTION'
  }

  enum CouponType {
    PERCENTAGE = 'PERCENTAGE',
    FIXED_AMOUNT = 'FIXED_AMOUNT'
  }

  enum CouponStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    EXPIRED = 'EXPIRED',
    DEPLETED = 'DEPLETED'
  }

  enum CouponScope {
    ALL_PRODUCTS = 'ALL_PRODUCTS',
    SPECIFIC_PRODUCTS = 'SPECIFIC_PRODUCTS',
    SPECIFIC_CATEGORIES = 'SPECIFIC_CATEGORIES'
  }

  enum WithdrawalStatus {
    PENDING = 'PENDING',
    DONE = 'DONE'
  }

  // ================================
  // GLOBAL BASE TYPES
  // ================================
  type Params<Key extends string> = Promise<{ [K in Key]: string }>
  type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

  interface BaseEntity {
    id: number
    createdAt: Date
    updatedAt: Date
    meta?: Record<string, any> | null
  }

  interface SettingsData<T = any> {
    success: boolean

    data: { id: number; key: string; value: T }
    message: string
  }

  interface BulkNamesResponse extends SettingsData<string[]> {
    data: {
      id: number
      key: 'system_feedback_names'
      value: string[]
    }
  }

  type DynamicPageKey =
    | 'returnsExchanges'
    | 'deliveryTerms'
    | 'paymentPricing'
    | 'paymentTerms'
    | 'privacyPolicy'
    | 'termsUse'
  // ================================
  // GLOBAL AUTH & USER TYPES
  // ================================

  interface TAdmin {
    id: number
    email: string
    username: string
    firstName: string
    lastName: string
    phone: string
    telegramUsername: string
    role: 'ADMIN'
    isActive: boolean
    isBanned: boolean
    banReason: string
    isVerified: boolean
    customRole: Role | null
  }

  interface User extends BaseEntity {
    profilePicture: any
    avatar: any
    email: string
    username?: string | null
    passwordHash?: string | null
    firstName?: string | null
    lastName?: string | null
    phone?: string | null
    telegramUsername?: string | null
    role: UserRole
    rank: Rank | string
    totalSpent: number
    totalOrders: number
    discountPercent: number
    isActive: boolean
    isVerified: boolean
    isBanned: boolean
    banReason?: string | null
    isGuest: boolean
    guestToken?: string | null
    tags: string[]
    note?: string | null
    roleId?: number | null
    lastLoginAt?: Date | null
    emailVerifiedAt?: Date | null
    lastLoginIp?: string | null
    lastLoginDevice?: string | null
    // Relations
    customRole?: Role | null
    orders?: Order[]
    tickets?: Ticket[]
    notifications?: Notification[]
    loginSessions?: LoginSession[]
    couponUsage?: CouponUsage[]
  }

  interface Rank extends BaseEntity {
    name: UserRank
    threshold?: number | null
    discount?: number | null
    icon?: string | null
  }

  interface Role extends BaseEntity {
    name: string
    description?: string | null
    isActive: boolean
    // Relations
    permissions?: RolePermission[]
    moderators?: User[]
  }

  interface RolePermission {
    id: number
    roleId: number
    resource: string
    actions: string[]
  }

  interface LoginSession extends BaseEntity {
    id: string
    userId: number
    token: string
    userAgent?: string | null
    ipAddress?: string | null
    isActive: boolean
    expiresAt: Date
    // Relations
    user?: User
  }

  // ================================
  // GLOBAL PRODUCT & CATALOG TYPES
  // ================================

  interface Category extends BaseEntity {
    name: string
    slug: string
    description?: string | null
    icon?: string | null
    isActive: boolean
    sortOrder: number
    parentId?: number | null
    // Relations
    parent?: Category | null
    children?: Category[]
    products?: Product[]
  }

  interface Product extends BaseEntity {
    policy: ReactNode
    sku: string
    name: string
    sortOrder?: number | null
    slug?: string
    description?: string | null
    type: ProductType
    platform?: PlatformType | null
    telegramUrl?: string | null
    price: number
    originalPrice?: number | null
    discount?: number | null
    btnText?: string | null
    costPrice?: number | null
    stockCount: number
    soldCount: number
    minQuantity: number
    maxQuantity: number
    isActive: boolean
    isPrivate: boolean
    privateUrl?: string | null
    isFeatured: boolean
    images: string[]
    thumbnail?: string | null
    categoryId: number
    seo?: Record<string, any> | null
    tags?: string[]
    reviewStats?: {
      averageRating: number
      reviewCount: number
    }
    feedbacks?: Array<{
      id: number
      name: string
      feedback: string
      rating: number
      createdAt: string
    }>
    // Relations
    category?: Category
    accounts?: Account[]
    orderItems?: OrderItem[]
    notifications?: Notification[]
  }

  interface Account extends BaseEntity {
    productId: number
    productName: string
    productSku: string
    platform: PlatformType
    encryptedData: string
    isUsed: boolean
    isValid: boolean
    requiresOtp: boolean
    hasPremium: boolean
    usedAt?: Date | null
    usedByOrderId?: number | null
    // Relations
    product?: Product
    usedByOrder?: Order | null
  }

  interface TransferProductMeta {
    members: number
    botAdded: boolean
    adminPhone: string
    yearCreated: number
    transferType: string
    originalOwner: string
  }

  interface TransferProductCategory {
    id: number
    name: string
    slug: string
  }

  interface TransferProduct {
    id: number
    sku: string
    name: string
    description: string
    type: string
    platform: string
    telegramUrl: string
    tags: string[]
    price: string
    originalPrice: string | null
    costPrice: string | null
    stockCount: number
    soldCount: number
    minQuantity: number
    maxQuantity: number
    isActive: boolean
    isPrivate: boolean
    privateUrl: string | null
    isFeatured: boolean
    images: string[]
    thumbnail: string
    createdAt: string
    updatedAt: string
    meta: TransferProductMeta
    seo: any | null
    categoryId: number
    category: TransferProductCategory
  }

  interface TransferProductPagination {
    page: number
    limit: number
    total: number
    pages: number
    hasNext: boolean
    hasPrev: boolean
  }

  interface TransferProductResponse {
    success: boolean
    data: TransferProduct[]
    pagination: TransferProductPagination
    message: string
  }

  // ================================
  // GLOBAL TELEGRAM TRANSFER TYPES
  // ================================

  interface TelegramOwnerShipData extends BaseEntity {
    orderItemId: number
    status: TelegramTransferStatus | 'WAITING_PERIOD'
    targetUrl: string
    customerTelegram: string
    transferType: 'group' | 'channel'
    proofData?: string // image url
    transferProofUrl?: string | null
    // Relations
    orderItem?: {
      order?: {
        user?: {
          firstName?: string | null
          lastName?: string | null
        }
      }
    }
    order?: {
      customerName?: string | null
      guestEmail?: string | null
      user?: {
        firstName?: string | null
        lastName?: string | null
        email?: string | null
        telegramUsername?: string | null
      }
    }
  }

  interface TelegramOwnerShipDataResponse {
    success: boolean
    data: TelegramOwnerShipData[]
    pagination: PaginationMeta
    message: string
  }

  // ================================
  // GLOBAL PRODUCT GROUP TYPES
  // ================================

  interface ProductGroup extends BaseEntity {
    slug: string
    name: string
    sortOrder?: number | null
    _count?: {
      products: number
    }
  }

  interface ProductGroupResponse {
    success: boolean
    data: ProductGroup[]
    message: string
  }

  // ================================
  // GLOBAL ORDER & PAYMENT TYPES
  // ================================

  interface Order extends BaseEntity {
    customerName: string
    customerName: any
    guestEmail: any
    id: number
    orderNumber: string
    status: OrderStatus
    subtotal: Decimal
    discount: Decimal
    total: Decimal
    deliveryStatus: DeliveryStatus
    deliveredAt: Date | null
    createdAt: Date
    productId?: number
    quantity: number
    product?: {
      id: number
      name: string
      platform: PlatformType
      sku: string
      type?: string
      thumbnail?: string | null
    }
    telegramTransfer?: {
      id: number
      status: TelegramTransferStatus | 'WAITING_PERIOD'
      targetUrl: string
      customerTelegram: string
      joinVerified: boolean
      transferCompletedAt: Date | null
      failureReason: string | null
    } | null
    items?: OrderItem[]
    user?: User
  }

  export interface OrderListResponse {
    success: boolean
    orders: OrderListItem[]
    pagination: PaginationMeta
    message: string
  }

  export interface OrderDetailResponse {
    success: boolean
    data: OrderListItem
  }

  export interface OrderListItem {
    id: number
    orderNumber: string
    status: OrderStatus
    deliveryStatus: DeliveryStatus
    subtotal: string
    discount: string
    total: string
    createdAt: string
    deliveredAt: string | null
    guestEmail?: string | null
    customerName?: string | null
    customerPhone?: string | null
    payment: {
      id: number
      method: string
      status: PaymentStatus
      amount: string
    } | null
    user: {
      telegramUsername: ReactNode
      telegramUsername: any
      username: ReactNode
      username: any
      lastName: ReactNode
      id: number
      email: string
      firstName: string
      totalOrders: number | null
      totalSpent: number | null
    } | null
    product: {
      id: number
      thumbnail: string | null
      name: string
      platform: PlatformType
      sku: string
    }
  }

  interface OrderItem extends BaseEntity {
    orderId: number
    productId: number
    quantity: number
    unitPrice: number
    totalPrice: number
    product?: {
      id: number
      thumbnail: string | null
      name: string
      sku: string
    }
    telegramTransfer?: TelegramTransfer | null
  }

  interface Payment extends BaseEntity {
    orderId: number
    method: PaymentMethod
    status: PaymentStatus
    amount: number
    paidAmount: number
    refundedAmount: number
    gateway: string
    gatewayTxnId?: string | null
    gatewayStatus?: string | null
    binanceOrderId?: string | null
    binanceStatus?: string | null
    processedAt?: Date | null
    failedAt?: Date | null
    failureReason?: string | null
    // Relations
    order?: Order
  }

  interface Delivery extends BaseEntity {
    orderId: number
    status: DeliveryStatus
    accounts: Record<string, any>
    fileUrl?: string | null
    format?: string | null
    deliveredAt?: Date | null
    downloadedAt?: Date | null
    downloadCount: number
    // Relations
    order?: Order
  }

  interface TelegramTransfer extends BaseEntity {
    orderItemId: number
    status: TelegramTransferStatus
    targetUrl: string
    customerTelegram: string
    joinVerified: boolean
    joinVerifiedAt?: Date | null
    transferStartedAt?: Date | null
    transferCompletedAt?: Date | null
    screenshotUrl?: string | null
    proofData?: Record<string, any> | null
    failureReason?: string | null
    retryCount: number
    // Relations
    orderItem?: OrderItem
  }

  // ================================
  // GLOBAL COUPON & PROMOTION TYPES
  // ================================

  interface Coupon extends BaseEntity {
    code: string
    name?: string | null
    description?: string | null
    type: CouponType
    status: CouponStatus
    scope: CouponScope
    discountValue: number
    maxDiscountAmount?: number | null
    minOrderAmount?: number | null
    usageLimit?: number | null
    usageCount: number
    userUsageLimit?: number | null
    startsAt?: Date | null
    expiresAt?: Date | null
    applicableProductIds: number[]
    applicableCategoryIds: number[]
    // Relations
    usage?: CouponUsage[]
  }

  interface CouponUsage {
    id: number
    couponId: number
    orderId: number
    userId?: number | null
    guestEmail?: string | null
    discountAmount: number
    orderAmount: number
    createdAt: Date
    // Relations
    coupon?: Coupon
    order?: Order
    user?: User | null
  }

  // ================================
  // GLOBAL CONTENT TYPES
  // ================================

  interface BlogCategory extends BaseEntity {
    name: string
    slug: string
    // Relations
    blogs?: Blog[]
  }

  interface BlogAuthorRef {
    role: import("react").JSX.Element
    role: ReactNode
    username: ReactNode
    id: number
    name: string
    email?: string
  }

  interface Blog extends BaseEntity {
    title: string
    slug: string
    excerpt: string
    content: string
    source?: string | null
    thumbnail?: string | null
    gallery: string[]
    tags: string[]
    views: number
    isPublished: boolean
    publishedAt?: Date | null
    categoryId: number
    seo?: Record<string, any> | null
    // Relations
    category?: BlogCategory
    author?: BlogAuthorRef | null
  }

  // ================================
  // GLOBAL SUPPORT TYPES
  // ================================

  interface Ticket extends BaseEntity {
    ticketNumber: string
    userId?: number | null
    guestEmail?: string | null
    subject: string
    description: string
    status: TicketStatus
    priority: TicketPriority
    assignedTo?: string | null
    resolvedAt?: Date | null
    // Relations
    user?: User | null
    replies?: TicketReply[]
  }

  interface TicketReply extends BaseEntity {
    ticketId: number
    content: string
    isStaff: boolean
    authorId?: number | null
    authorName?: string | null
    attachments: string[]
    // Relations
    ticket?: Ticket
  }

  interface Notification extends BaseEntity {
    userId?: number | null
    type: NotificationType
    title: string
    message: string
    data?: Record<string, any> | null
    isRead: boolean
    readAt?: Date | null
    productId?: number | null
    orderId?: number | null
    // Relations
    user?: User | null
    product?: Product | null
  }

  // ================================
  // GLOBAL WITHDRAWAL TYPES
  // ================================

  interface Withdrawal extends BaseEntity {
    userId: number
    amount: number
    method: string
    status: WithdrawalStatus
    meta?: Record<string, any> | null
    // Relations
    user?: User
  }

  // ================================
  // GLOBAL SYSTEM TYPES
  // ================================

  interface Settings {
    id: number
    key: string
    value?: Record<string, any> | null
  }

  interface AuditLog {
    id: number
    userId?: number | null
    action: string
    entity: string
    entityId?: string | null
    oldValues?: Record<string, any> | null
    newValues?: Record<string, any> | null
    ipAddress?: string | null
    userAgent?: string | null
    createdAt: Date
  }

  // ================================
  // GLOBAL UTILITY TYPES
  // ================================

  type CreateInput<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>
  type UpdateInput<T> = Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>

  // ================================
  // GLOBAL QUERY & FILTER TYPES
  // ================================

  interface BaseQuery {
    page?: number
    limit?: number
    search?: string
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  }

  interface UserFilters extends BaseQuery {
    role?: UserRole
    rank?: UserRank
    isActive?: boolean
    isBanned?: boolean
    isGuest?: boolean
  }

  interface ProductFilters extends BaseQuery {
    categoryId?: number
    platform?: PlatformType
    type?: ProductType
    isActive?: boolean
    isFeatured?: boolean
    minPrice?: number
    maxPrice?: number
    inStock?: boolean
  }

  interface OrderFilters extends BaseQuery {
    userId?: number
    status?: OrderStatus
    deliveryStatus?: DeliveryStatus
    dateFrom?: Date
    dateTo?: Date
  }

  interface BlogFilters extends BaseQuery {
    categoryId?: number
    isPublished?: boolean
    tags?: string[]
  }

  // ================================
  // GLOBAL API RESPONSE TYPES
  // ================================

  interface PaginationMeta {
    page: number
    limit: number
    total: number
    pages: number
    hasNext: boolean
    hasPrev: boolean
  }

  interface ApiResponse<T = any> {
    success: boolean
    data?: T
    message: string
    errors?: string[]
  }

  interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
    pagination: PaginationMeta
  }

  // ================================
  // GLOBAL BUSINESS LOGIC TYPES
  // ================================

  interface CartItem {
    productId: number
    quantity: number
    price: number
  }

  interface CheckoutData {
    items: CartItem[]
    guestEmail?: string
    couponCode?: string
    customerInfo?: {
      name?: string
      phone?: string
      telegramUsername?: string
    }
  }

  interface DeliveryData {
    accounts: Array<{
      platform: PlatformType
      username: string
      password: string
      email?: string
      phone?: string
      additionalData?: Record<string, any>
    }>
    format: 'txt' | 'xlsx' | 'json'
  }

  interface TelegramTransferData {
    customerTelegram: string
    targetUrl: string
    transferType: 'ownership' | 'admin' | 'member'
    verificationRequired: boolean
  }

  // ================================
  // GLOBAL STATISTICS TYPES
  // ================================

  interface SalesStats {
    totalRevenue: number
    totalOrders: number
    totalCustomers: number
    averageOrderValue: number
    conversionRate: number
  }

  interface ProductStats {
    totalProducts: number
    activeProducts: number
    outOfStock: number
    lowStock: number
    topSellingProducts: Array<{
      product: Product
      salesCount: number
      revenue: number
    }>
  }

  interface UserStats {
    totalUsers: number
    newUsers: number
    activeUsers: number
    usersByRank: Record<UserRank, number>
    usersByRole: Record<UserRole, number>
  }

  // ================================
  // TELEGRAM ACCOUNT TYPES
  // ================================

  interface TelegramAccountResponse {
    id: number
    phone: string | undefined
    meta?:
      | {
          phone?: string
          sessionFile?: string
          sessionString?: string
          notes?: string
          accountHealthStatus?:
            | 'AVAILABLE'
            | 'INVALID'
            | 'BROKE'
            | 'BANNED'
            | 'RELOGIN_REQUIRED'
          accountHealthMessage?: string
          lastStatusCheckedAt?: string
          [key: string]: any
        }
      | undefined
    sessionPath: string | undefined
    proxy:
      | {
          host?: string
          port?: number
          username?: string
          password?: string
        }
      | undefined
    status: 'used' | 'available' | 'invalid' | 'broke' | 'banned' | 'relogin_required'
    archived?: boolean
    createdAt: Date
    usedByOrder?: {
      id: number
      orderNumber: string
      createdAt: Date
      product?: {
        id: number
        name: string
        type: string
        platform: string
      } | null
    } | null
    product?: {
      id: number
      name: string
    } | null
  }

  interface TelegramAccountListResponse {
    accounts: TelegramAccountResponse[]
    pagination: PaginationMeta
  }
  interface SessionListResponse {
    success: boolean
    sessions: Array<{
      phone_number: string
      file_exists: boolean
      created_at: string
      modified_at: string
      size_bytes: number
    }>
    total: number
  }

  /** CUSTOMER = real customer, MANUAL = admin form, BULK_GENERATED = bulk fake reviews */
  type FeedbackSource = 'CUSTOMER' | 'MANUAL' | 'BULK_GENERATED'

  interface Feedback {
    id: number
    productId?: number | null
    name: string // Customer name
    feedback: string
    rating: number
    published: boolean
    source?: FeedbackSource
    isScheduled?: boolean
    scheduledAt?: string | null
    createdAt: Date
    product?: {
      id: number
      name: string
      slug?: string | null
    } | null
  }
  interface FeedbackResponse {
    success: boolean
    data: {
      feedbacks: Feedback[]
      pagination: PaginationMeta
    }
    message: string
  }
}

// ================================
// ENUMS
// ================================

export enum UserRole {
  ADMIN = 'ADMIN',
  CUSTOMER = 'CUSTOMER',
  GUEST = 'GUEST',
  MODERATOR = 'MODERATOR'
}

export enum UserRank {
  NEW = 'NEW',
  NORMAL = 'NORMAL',
  FREQUENT = 'FREQUENT',
  ELITE = 'ELITE',
  VIP = 'VIP',
  MASTER = 'MASTER'
}

export enum ProductType {
  FILE = 'FILE',
  SERVICE = 'SERVICE',
  SERIAL = 'SERIAL',
  PREMIUM = 'PREMIUM'
}

export enum PlatformType {
  INSTAGRAM = 'INSTAGRAM',
  FACEBOOK = 'FACEBOOK',
  TWITTER = 'TWITTER',
  TELEGRAM = 'TELEGRAM',
  TIKTOK = 'TIKTOK',
  YOUTUBE = 'YOUTUBE',
  OTHER = 'OTHER'
}

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PARTIAL = 'PARTIAL',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED'
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  PARTIAL = 'PARTIAL',
  REFUNDED = 'REFUNDED'
}

export enum PaymentMethod {
  BINANCE = 'BINANCE',
  NOWPAYMENT = 'NOWPAYMENT',
  STRIPE = 'STRIPE',
  PLISIO = 'PLISIO',
  CHANGENOW = 'CHANGENOW',
  CRYPTOMUS = 'CRYPTOMUS',
  OTHER = 'OTHER'
}

export enum DeliveryStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  PARTIAL = 'PARTIAL'
}

export enum TelegramTransferStatus {
  PENDING = 'PENDING',
  VERIFICATION_REQUIRED = 'VERIFICATION_REQUIRED',
  CUSTOMER_JOINED = 'CUSTOMER_JOINED',
  TRANSFER_IN_PROGRESS = 'TRANSFER_IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED'
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export enum NotificationType {
  ORDER = 'ORDER',
  PAYMENT = 'PAYMENT',
  RESTOCK = 'RESTOCK',
  SYSTEM = 'SYSTEM',
  PROMOTION = 'PROMOTION'
}

export enum CouponType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT'
}

export enum CouponStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  EXPIRED = 'EXPIRED',
  DEPLETED = 'DEPLETED'
}

export enum CouponScope {
  ALL_PRODUCTS = 'ALL_PRODUCTS',
  SPECIFIC_PRODUCTS = 'SPECIFIC_PRODUCTS',
  SPECIFIC_CATEGORIES = 'SPECIFIC_CATEGORIES'
}

// ================================
// BASE ENTITY TYPES
// ================================

export interface BaseEntity {
  id: number
  createdAt: Date
  updatedAt: Date
  meta?: Record<string, any> | null
}

// ================================
// AUTH & USER TYPES
// ================================

export interface TAdmin {
  id: number
  email: string
  username: string
  firstName: string
  lastName: string
  phone: string
  telegramUsername: string
  role: 'ADMIN'
  isActive: boolean
  isBanned: boolean
  banReason: string
  isVerified: boolean
}

export interface User extends BaseEntity {
  email: string
  username?: string | null
  passwordHash?: string | null
  firstName?: string | null
  lastName?: string | null
  phone?: string | null
  telegramUsername?: string | null
  role: UserRole
  rank: UserRank
  totalSpent: number
  totalOrders: number
  discountPercent: number
  isActive: boolean
  isVerified: boolean
  isBanned: boolean
  banReason?: string | null
  isGuest: boolean
  guestToken?: string | null
  tags: string[]
  note?: string | null
  roleId?: number | null
  lastLoginAt?: Date | null
  emailVerifiedAt?: Date | null
  lastLoginIp?: string | null
  lastLoginDevice?: string | null
  // Relations
  customRole?: Role | null
  orders?: Order[]
  tickets?: Ticket[]
  notifications?: Notification[]
  loginSessions?: LoginSession[]
  couponUsage?: CouponUsage[]
}

export interface Role extends BaseEntity {
  name: string
  description?: string | null
  isActive: boolean
  // Relations
  permissions?: RolePermission[]
  moderators?: User[]
}

export interface RolePermission {
  id: number
  roleId: number
  resource: string
  actions: string[]
}

export interface LoginSession extends BaseEntity {
  id: string
  userId: number
  token: string
  userAgent?: string | null
  ipAddress?: string | null
  isActive: boolean
  expiresAt: Date
  // Relations
  user?: User
}

// ================================
// PRODUCT & CATALOG TYPES
// ================================

export interface Category extends BaseEntity {
  name: string
  slug: string
  description?: string | null
  icon?: string | null
  isActive: boolean
  sortOrder: number
  parentId?: number | null
  // Relations
  parent?: Category | null
  children?: Category[]
  products?: Product[]
}

export interface Product extends BaseEntity {
  sku: string
  name: string
  description?: string | null
  type: ProductType
  platform?: PlatformType | null
  telegramUrl?: string | null
  price: number
  originalPrice?: number | null
  costPrice?: number | null
  stockCount: number
  soldCount: number
  minQuantity: number
  maxQuantity: number
  isActive: boolean
  isPrivate: boolean
  privateUrl?: string | null
  isFeatured: boolean
  images: string[]
  thumbnail?: string | null
  categoryId: number
  seo?: Record<string, any> | null
  // Relations
  category?: Category
  accounts?: Account[]
  orderItems?: OrderItem[]
  notifications?: Notification[]
}

export interface Account extends BaseEntity {
  productId: number
  platform: PlatformType
  encryptedData: string
  isUsed: boolean
  isValid: boolean
  requiresOtp: boolean
  hasPremium: boolean
  usedAt?: Date | null
  usedByOrderId?: number | null
  // Relations
  product?: Product
  usedByOrder?: Order | null
}

// ================================
// ORDER & PAYMENT TYPES
// ================================

export interface OrderItem extends BaseEntity {
  orderId: number
  productId: number
  quantity: number
  unitPrice: number
  totalPrice: number
  // Relations
  order?: Order
  product?: Product
  telegramTransfer?: TelegramTransfer | null
}

export interface Payment extends BaseEntity {
  orderId: number
  method: PaymentMethod
  status: PaymentStatus
  amount: number
  paidAmount: number
  refundedAmount: number
  gateway: string
  gatewayTxnId?: string | null
  gatewayStatus?: string | null
  binanceOrderId?: string | null
  binanceStatus?: string | null
  processedAt?: Date | null
  failedAt?: Date | null
  failureReason?: string | null
  // Relations
  order?: Order
}

export interface Delivery extends BaseEntity {
  orderId: number
  status: DeliveryStatus
  accounts: Record<string, any>
  fileUrl?: string | null
  format?: string | null
  deliveredAt?: Date | null
  downloadedAt?: Date | null
  downloadCount: number
  // Relations
  order?: Order
}

export interface TelegramTransfer extends BaseEntity {
  orderItemId: number
  status: TelegramTransferStatus
  targetUrl: string
  customerTelegram: string
  joinVerified: boolean
  joinVerifiedAt?: Date | null
  transferStartedAt?: Date | null
  transferCompletedAt?: Date | null
  screenshotUrl?: string | null
  proofData?: Record<string, any> | null
  failureReason?: string | null
  retryCount: number
  // Relations
  orderItem?: OrderItem
}

// ================================
// COUPON & PROMOTION TYPES
// ================================

export interface Coupon extends BaseEntity {
  code: string
  name?: string | null
  type: CouponType
  status: CouponStatus
  scope: CouponScope
  discountValue: number
  maxDiscountAmount?: number | null
  minOrderAmount?: number | null
  usageLimit?: number | null
  usageCount: number
  userUsageLimit?: number | null
  startsAt?: Date | null
  expiresAt?: Date | null
  applicableProductIds: number[]
  applicableCategoryIds: number[]
  // Relations
  usage?: CouponUsage[]
}

export interface CouponUsage {
  id: number
  couponId: number
  orderId: number
  userId?: number | null
  guestEmail?: string | null
  discountAmount: number
  orderAmount: number
  createdAt: Date
  // Relations
  coupon?: Coupon
  order?: Order
  user?: User | null
}

// ================================
// CONTENT TYPES
// ================================

export interface BlogCategory extends BaseEntity {
  name: string
  slug: string
  // Relations
  blogs?: Blog[]
}

export interface BlogAuthorRef {
  id: number
  name: string
  email?: string
}

export interface Blog extends BaseEntity {
  title: string
  slug: string
  content: string
  source?: string | null
  thumbnail?: string | null
  gallery: string[]
  tags: string[]
  views: number
  isPublished: boolean
  publishedAt?: Date | null
  categoryId: number
  seo?: Record<string, any> | null
  // Relations
  category?: BlogCategory
  author?: BlogAuthorRef | null
}

// ================================
// SUPPORT TYPES
// ================================

export interface Ticket extends BaseEntity {
  ticketNumber: string
  userId?: number | null
  guestEmail?: string | null
  subject: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  assignedTo?: string | null
  resolvedAt?: Date | null
  // Relations
  user?: User | null
  replies?: TicketReply[]
}

export interface TicketReply extends BaseEntity {
  ticketId: number
  content: string
  isStaff: boolean
  authorId?: number | null
  authorName?: string | null
  attachments: string[]
  // Relations
  ticket?: Ticket
}

export interface Notification extends BaseEntity {
  userId?: number | null
  type: NotificationType
  title: string
  message: string
  data?: Record<string, any> | null
  isRead: boolean
  readAt?: Date | null
  productId?: number | null
  orderId?: number | null
  // Relations
  user?: User | null
  product?: Product | null
}

// ================================
// SYSTEM TYPES
// ================================

export interface Settings {
  id: number
  key: string
  value?: Record<string, any> | null
}

export interface AuditLog {
  id: number
  userId?: number | null
  action: string
  entity: string
  entityId?: string | null
  oldValues?: Record<string, any> | null
  newValues?: Record<string, any> | null
  ipAddress?: string | null
  userAgent?: string | null
  createdAt: Date
}

// ================================
// UTILITY TYPES
// ================================

export type CreateInput<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateInput<T> = Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>

// ================================
// QUERY & FILTER TYPES
// ================================

export interface BaseQuery {
  page?: number
  limit?: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface UserFilters extends BaseQuery {
  role?: UserRole
  rank?: UserRank
  isActive?: boolean
  isBanned?: boolean
  isGuest?: boolean
}

export interface ProductFilters extends BaseQuery {
  categoryId?: number
  platform?: PlatformType
  type?: ProductType
  isActive?: boolean
  isFeatured?: boolean
  minPrice?: number
  maxPrice?: number
  inStock?: boolean
}

export interface OrderFilters extends BaseQuery {
  userId?: number
  status?: OrderStatus
  deliveryStatus?: DeliveryStatus
  dateFrom?: Date
  dateTo?: Date
}

export interface BlogFilters extends BaseQuery {
  categoryId?: number
  isPublished?: boolean
  tags?: string[]
}

// ================================
// API RESPONSE TYPES
// ================================

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  pages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message: string
  errors?: string[]
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: PaginationMeta
}

// ================================
// BUSINESS LOGIC TYPES
// ================================

export interface CartItem {
  productId: number
  quantity: number
  price: number
}

export interface CheckoutData {
  items: CartItem[]
  guestEmail?: string
  couponCode?: string
  customerInfo?: {
    name?: string
    phone?: string
    telegramUsername?: string
  }
}

export interface DeliveryData {
  accounts: Array<{
    platform: PlatformType
    username: string
    password: string
    email?: string
    phone?: string
    additionalData?: Record<string, any>
  }>
  format: 'txt' | 'xlsx' | 'json'
}

export interface TelegramTransferData {
  customerTelegram: string
  targetUrl: string
  transferType: 'ownership' | 'admin' | 'member'
  verificationRequired: boolean
}

// ================================
// STATISTICS TYPES
// ================================

export interface SalesStats {
  totalRevenue: number
  totalOrders: number
  totalCustomers: number
  averageOrderValue: number
  conversionRate: number
}

export interface ProductStats {
  totalProducts: number
  activeProducts: number
  outOfStock: number
  lowStock: number
  topSellingProducts: Array<{
    product: Product
    salesCount: number
    revenue: number
  }>
}

export interface UserStats {
  totalUsers: number
  newUsers: number
  activeUsers: number
  usersByRank: Record<UserRank, number>
  usersByRole: Record<UserRole, number>
}

// ================================
// FILE UPLOAD TYPES
// ================================

export enum FileType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  FILE = 'FILE'
}

export interface UploadedFile {
  id: number
  fileId: string
  url: string
  type: FileType
}

export interface FileUploadResponse extends ApiResponse<UploadedFile[]> {
  success: boolean
  data: UploadedFile[]
  message: string
}

// ================================
// EXPORT ALL TYPES FOR CONVENIENCE
// ================================

export type {
  Account,
  ApiResponse,
  AuditLog,
  BaseEntity,
  BaseQuery,
  Blog,
  BlogAuthorRef,
  BlogCategory,
  BlogFilters,
  CartItem,
  Category,
  CheckoutData,
  Coupon,
  CouponUsage,
  Delivery,
  DeliveryData,
  LoginSession,
  Notification,
  Order,
  OrderFilters,
  OrderItem,
  PaginatedResponse,
  PaginationMeta,
  Payment,
  Product,
  ProductFilters,
  ProductStats,
  Role,
  RolePermission,
  SalesStats,
  Settings,
  TAdmin,
  TelegramTransfer,
  TelegramTransferData,
  Ticket,
  TicketReply,
  User,
  UserFilters,
  UserStats
}

// Make this a module
export {}
