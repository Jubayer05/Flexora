/**
 * TypeScript type definitions for UHQ Backend Schema
 * Generated from Prisma schema.prisma
 */

// ================================
// ENUMS
// ================================

export enum UserRole {
  ADMIN = 'ADMIN',
  CUSTOMER = 'CUSTOMER',
  GUEST = 'GUEST',
  MODERATOR = 'MODERATOR',
}

export enum UserRank {
  NEW = 'NEW',
  NORMAL = 'NORMAL',
  FREQUENT = 'FREQUENT',
  ELITE = 'ELITE',
  VIP = 'VIP',
  MASTER = 'MASTER',
}

export enum PlatformType {
  INSTAGRAM = 'INSTAGRAM',
  FACEBOOK = 'FACEBOOK',
  TWITTER = 'TWITTER',
  TIKTOK = 'TIKTOK',
  YOUTUBE = 'YOUTUBE',
  OTHER = 'OTHER',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PARTIAL = 'PARTIAL',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export enum DeliveryStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  PARTIAL = 'PARTIAL',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  PARTIAL = 'PARTIAL',
  REFUNDED = 'REFUNDED',
}

export enum PaymentMethod {
  BINANCE = 'BINANCE',
  NOWPAYMENT = 'NOWPAYMENT',
  STRIPE = 'STRIPE',
  PLISIO = 'PLISIO',
  CHANGENOW = 'CHANGENOW',
  CRYPTOMUS = 'CRYPTOMUS',
  OTHER = 'OTHER',
}

export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum NotificationType {
  ORDER = 'ORDER',
  PAYMENT = 'PAYMENT',
  RESTOCK = 'RESTOCK',
  SYSTEM = 'SYSTEM',
  PROMOTION = 'PROMOTION',
}

export enum CouponType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
}

export enum CouponStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  EXPIRED = 'EXPIRED',
  DEPLETED = 'DEPLETED',
}

export enum CouponScope {
  ALL_PRODUCTS = 'ALL_PRODUCTS',
  SPECIFIC_PRODUCTS = 'SPECIFIC_PRODUCTS',
  SPECIFIC_CATEGORIES = 'SPECIFIC_CATEGORIES',
}

// ================================
// CORE TYPES
// ================================

export interface User {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  meta?: Record<string, any> | null;
  email: string;
  username?: string | null;
  passwordHash?: string | null;
  firstName?: string | null;
  phone?: string | null;
  role: UserRole;
  rank: UserRank;
  totalSpent: number;
  totalOrders: number;
  discountPercent: number;
  isActive: boolean;
  isVerified: boolean;
  isBanned: boolean;
  banReason?: string | null;
  isGuest: boolean;
  guestToken?: string | null;
  tags: string[];
  note?: string | null;
  roleId?: number | null;
  lastLoginAt?: Date | null;
  emailVerifiedAt?: Date | null;
  // Relations
  customRole?: Role | null;
  orders?: Order[];
  tickets?: Ticket[];
  notifications?: Notification[];
  loginSessions?: LoginSession[];
  couponUsage?: CouponUsage[];
}

export interface Role {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  name: string;
  description?: string | null;
  isActive: boolean;
  // Relations
  permissions?: RolePermission[];
  moderators?: User[];
}

export interface RolePermission {
  id: number;
  roleId: number;
  resource: string;
  actions: string[];
}

export interface Category {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  meta?: Record<string, any> | null;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  isActive: boolean;
  sortOrder: number;
  parentId?: number | null;
  // Relations
  parent?: Category | null;
  children?: Category[];
  products?: Product[];
}

export interface Product {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  meta?: Record<string, any> | null;
  sku: string;
  name: string;
  description?: string | null;
  type: ProductType;
  platform?: PlatformType | null;
  price: number;
  originalPrice?: number | null;
  costPrice?: number | null;
  stockCount: number;
  soldCount: number;
  minQuantity: number;
  maxQuantity: number;
  isActive: boolean;
  isPrivate: boolean;
  privateUrl?: string | null;
  isFeatured: boolean;
  images: string[];
  thumbnail?: string | null;
  categoryId: number;
  seo?: Record<string, any> | null;
  // Relations
  category?: Category;
  accounts?: Account[];
  orderItems?: OrderItem[];
  notifications?: Notification[];
}

export interface Account {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  meta?: Record<string, any> | null;
  productId: number;
  platform: PlatformType;
  encryptedData: string;
  isUsed: boolean;
  isValid: boolean;
  requiresOtp: boolean;
  hasPremium: boolean;
  usedAt?: Date | null;
  usedByOrderId?: number | null;
  // Relations
  product?: Product;
  usedByOrder?: Order | null;
}

export interface Coupon {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  meta?: Record<string, any> | null;
  code: string;
  name?: string | null;
  type: CouponType;
  status: CouponStatus;
  scope: CouponScope;
  discountValue: number;
  maxDiscountAmount?: number | null;
  minOrderAmount?: number | null;
  usageLimit?: number | null;
  usageCount: number;
  userUsageLimit?: number | null;
  startsAt?: Date | null;
  expiresAt?: Date | null;
  applicableProductIds: number[];
  applicableCategoryIds: number[];
  // Relations
  usage?: CouponUsage[];
}

export interface CouponUsage {
  id: number;
  couponId: number;
  orderId: number;
  userId?: number | null;
  guestEmail?: string | null;
  discountAmount: number;
  orderAmount: number;
  createdAt: Date;
  // Relations
  coupon?: Coupon;
  order?: Order;
  user?: User | null;
}

export interface BlogCategory {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  name: string;
  slug: string;
  // Relations
  blogs?: Blog[];
}

export interface Blog {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  meta?: Record<string, any> | null;
  title: string;
  slug: string;
  content: string;
  source?: string | null;
  thumbnail?: string | null;
  gallery: string[];
  tags: string[];
  views: number;
  isPublished: boolean;
  publishedAt?: Date | null;
  categoryId: number;
  seo?: Record<string, any> | null;
  // Relations
  category?: BlogCategory;
}

export interface Order {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  meta?: Record<string, any> | null;
  orderNumber: string;
  status: OrderStatus;
  userId?: number | null;
  guestEmail?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  subtotal: number;
  discount: number;
  total: number;
  deliveryStatus: DeliveryStatus;
  deliveredAt?: Date | null;
  isPartial: boolean;
  canResend: boolean;
  canReplace: boolean;
  // Relations
  user?: User | null;
  items?: OrderItem[];
  payment?: Payment | null;
  deliveries?: Delivery[];
  usedAccounts?: Account[];
  couponUsage?: CouponUsage[];
}

export interface OrderItem {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  meta?: Record<string, any> | null;
  orderId: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  // Relations
  order?: Order;
  product?: Product;
}

export interface Payment {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  meta?: Record<string, any> | null;
  orderId: number;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  paidAmount: number;
  refundedAmount: number;
  gateway: string;
  gatewayTxnId?: string | null;
  gatewayStatus?: string | null;
  binanceOrderId?: string | null;
  binanceStatus?: string | null;
  processedAt?: Date | null;
  failedAt?: Date | null;
  failureReason?: string | null;
  // Relations
  order?: Order;
}

export interface Delivery {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  meta?: Record<string, any> | null;
  orderId: number;
  status: DeliveryStatus;
  accounts: Record<string, any>;
  fileUrl?: string | null;
  format?: string | null;
  deliveredAt?: Date | null;
  downloadedAt?: Date | null;
  downloadCount: number;
  // Relations
  order?: Order;
}

// ================================
// SUPPORT & COMMUNICATION
// ================================

export interface Ticket {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  meta?: Record<string, any> | null;
  ticketNumber: string;
  userId?: number | null;
  guestEmail?: string | null;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  assignedTo?: string | null;
  resolvedAt?: Date | null;
  // Relations
  user?: User | null;
  replies?: TicketReply[];
}

export interface TicketReply {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  meta?: Record<string, any> | null;
  ticketId: number;
  content: string;
  isStaff: boolean;
  authorId?: number | null;
  authorName?: string | null;
  attachments: string[];
  // Relations
  ticket?: Ticket;
}

export interface Notification {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  meta?: Record<string, any> | null;
  userId?: number | null;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any> | null;
  isRead: boolean;
  readAt?: Date | null;
  productId?: number | null;
  orderId?: number | null;
  // Relations
  user?: User | null;
  product?: Product | null;
}

// ================================
// ADMIN & SYSTEM
// ================================

export interface LoginSession {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  meta?: Record<string, any> | null;
  userId: number;
  token: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  isActive: boolean;
  expiresAt: Date;
  // Relations
  user?: User;
}

export interface Settings {
  id: number;
  key: string;
  value?: Record<string, any> | null;
}

export interface AuditLog {
  id: number;
  userId?: number | null;
  action: string;
  entity: string;
  entityId?: string | null;
  oldValues?: Record<string, any> | null;
  newValues?: Record<string, any> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date;
}

// ================================
// UTILITY TYPES
// ================================

export type CreateInput<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateInput<T> = Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>;

// ================================
// SEARCH & FILTER TYPES
// ================================

export interface BaseQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UserFilters extends BaseQuery {
  role?: UserRole;
  rank?: UserRank;
  isActive?: boolean;
  isBanned?: boolean;
  isGuest?: boolean;
}

export interface ProductFilters extends BaseQuery {
  categoryId?: number;
  platform?: PlatformType;
  type?: ProductType;
  isActive?: boolean;
  isFeatured?: boolean;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
}

export interface OrderFilters extends BaseQuery {
  userId?: number;
  status?: OrderStatus;
  deliveryStatus?: DeliveryStatus;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface BlogFilters extends BaseQuery {
  categoryId?: number;
  isPublished?: boolean;
  tags?: string[];
}

// ================================
// API RESPONSE TYPES
// ================================

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message: string;
  errors?: string[];
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: PaginationMeta;
}

// ================================
// BUSINESS LOGIC TYPES
// ================================

export interface CartItem {
  productId: number;
  quantity: number;
  price: number;
}

export interface CheckoutData {
  items: CartItem[];
  guestEmail?: string;
  couponCode?: string;
  customerInfo?: {
    name?: string;
    phone?: string;
  };
}

export interface DeliveryData {
  accounts: Array<{
    platform: PlatformType;
    username: string;
    password: string;
    email?: string;
    phone?: string;
    additionalData?: Record<string, any>;
  }>;
  format: 'txt' | 'xlsx' | 'json';
}

// ================================
// STATISTICS TYPES
// ================================

export interface SalesStats {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  averageOrderValue: number;
  conversionRate: number;
}

export interface ProductStats {
  totalProducts: number;
  activeProducts: number;
  outOfStock: number;
  lowStock: number;
  topSellingProducts: Array<{
    product: Product;
    salesCount: number;
    revenue: number;
  }>;
}

export interface UserStats {
  totalUsers: number;
  newUsers: number;
  activeUsers: number;
  usersByRank: Record<UserRank, number>;
  usersByRole: Record<UserRole, number>;
}
