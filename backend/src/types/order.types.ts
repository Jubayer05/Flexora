import type { DeliveryStatus, OrderStatus, PaymentStatus, PlatformType } from '@prisma/client';

// ================================
// ORDER LIST TYPES
// ================================

export interface OrderListResponse {
  success: boolean;
  orders: OrderListItem[];
  pagination: PaginationMeta;
  message: string;
}

export interface OrderListItem {
  id: number;
  orderNumber: string;
  status: OrderStatus;
  deliveryStatus: DeliveryStatus;
  subtotal: string;
  discount: string;
  total: string;
  createdAt: string | Date;
  deliveredAt: string | Date | null;
  payment: PaymentInfo | null;
  user: OrderUser | null;
  product: OrderProduct;
}

// ================================
// ORDER DETAIL TYPES
// ================================

export interface OrderDetailResponse {
  success: boolean;
  data: OrderDetail;
  message: string;
}

export interface OrderDetail extends OrderListItem {
  userId?: number;
  // Can include more detailed fields here if needed
}

// ================================
// RELATED ENTITIES
// ================================

export interface OrderUser {
  id: number;
  email: string;
  firstName: string;
  totalOrders?: number;
  totalSpent?: string;
}

export interface OrderProduct {
  id: number;
  thumbnail: string | null;
  name: string;
  platform: PlatformType;
  sku: string;
}

export interface PaymentInfo {
  id: number;
  method: string;
  status: PaymentStatus;
  amount: string;
}

// ================================
// PAGINATION
// ================================

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
