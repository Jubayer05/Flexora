// Telegram Ownership Transfer Types

import { TelegramTransferStatus } from '@prisma/client';

// Transfer Product Meta Interface
export interface TelegramTransferProductMeta {
  transferType: 'group' | 'channel';
  botAdded: true;
  adminPhone: string;
  members: number;
  originalOwner: string;
  yearCreated: number;
}

// Transfer Creation Data
export interface CreateTelegramTransfer {
  orderItemId: number;
  targetUrl: string;
  transferType: 'group' | 'channel';
  customerTelegram: string; // @username or phone number
  meta?: Record<string, any>;
}

// Transfer Update Data
export interface UpdateTelegramTransfer {
  status?: TelegramTransferStatus;
  joinVerified?: boolean;
  transferProofUrl?: string;
  proofFileId?: number;
  failureReason?: string;
  adminNotes?: string;
  manualOverride?: boolean;
  verifiedBy?: string;
  meta?: Record<string, any>;
}

// Transfer Details for Customer
export interface TelegramTransferDetails {
  id: number;
  orderItemId: number;
  status: TelegramTransferStatus;
  targetUrl: string;
  transferType: 'group' | 'channel';
  customerTelegram: string;
  joinVerified: boolean;
  joinVerifiedAt?: Date;
  transferStartedAt?: Date;
  transferCompletedAt?: Date;
  completedAt?: Date;
  transferProofUrl?: string;
  retryCount: number;
  maxRetries: number;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
  orderItem?: {
    id: number;
    productId: number;
    quantity: number;
    product: {
      id: number;
      name: string;
      sku: string;
      meta: any;
    };
  };
}

// Transfer List Item for Admin
export interface TelegramTransferListItem {
  id: number;
  orderItemId: number;
  orderId: number;
  orderNumber: string;
  status: TelegramTransferStatus;
  targetUrl: string;
  transferType: 'group' | 'channel';
  customerTelegram: string;
  customerEmail?: string;
  joinVerified: boolean;
  retryCount: number;
  productName: string;
  createdAt: Date;
  updatedAt: Date;
}

// Transfer Statistics
export interface TelegramTransferStats {
  total: number;
  pending: number;
  verificationRequired: number;
  customerJoined: number;
  inProgress: number;
  waitingPeriod: number;
  completed: number;
  failed: number;
  successRate: number;
  avgCompletionTime?: number; // in hours
}

// Transfer Verification Request
export interface VerifyTransferJoinRequest {
  transferId: number;
  customerTelegram: string;
}

// Transfer Verification Response
export interface VerifyTransferJoinResponse {
  verified: boolean;
  message: string;
  transferId: number;
  status: TelegramTransferStatus;
}

// Transfer Execution Request (for Python microservice)
export interface ExecuteTransferRequest {
  transferId: number;
  targetUrl: string;
  transferType: 'group' | 'channel';
  customerTelegram: string;
  originalOwnerSession: string; // Encrypted session data
  proxyConfig?: {
    host: string;
    port: number;
    type: 'http' | 'socks5';
    username?: string;
    password?: string;
  };
}

// Transfer Execution Response (from Python microservice)
export interface ExecuteTransferResponse {
  success: boolean;
  transferId: number;
  status: TelegramTransferStatus;
  message: string;
  proofUrl?: string;
  error?: string;
  retryable?: boolean;
}

// Proof Generation Request
export interface GenerateTransferProofRequest {
  transferId: number;
  targetUrl: string;
  sessionData: string;
  screenshotType: 'ownership' | 'admin_rights' | 'membership';
}

// Proof Generation Response
export interface GenerateTransferProofResponse {
  success: boolean;
  transferId: number;
  proofUrl?: string;
  proofData?: {
    timestamp: string;
    targetUrl: string;
    customerTelegram: string;
    screenshotType: string;
  };
  error?: string;
}

// Transfer Retry Request
export interface RetryTransferRequest {
  transferId: number;
  reason?: string;
  adminUsername?: string;
}

// Manual Complete Request
export interface ManualCompleteTransferRequest {
  transferId: number;
  adminUsername: string;
  proofUrl?: string;
  notes?: string;
}

// Transfer Notification Data
export interface TelegramTransferNotification {
  transferId: number;
  orderItemId: number;
  userId?: number;
  userEmail?: string;
  customerTelegram: string;
  targetUrl: string;
  transferType: 'group' | 'channel';
  status: TelegramTransferStatus;
  productName: string;
  message: string;
}

// Transfer Filter/Query Parameters
export interface TelegramTransferQuery {
  page?: number;
  limit?: number;
  status?: TelegramTransferStatus | TelegramTransferStatus[];
  transferType?: 'group' | 'channel';
  customerTelegram?: string;
  joinVerified?: boolean;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'completedAt' | 'status';
  sortOrder?: 'asc' | 'desc';
}

// Transfer Status Change Event
export interface TransferStatusChangeEvent {
  transferId: number;
  oldStatus: TelegramTransferStatus;
  newStatus: TelegramTransferStatus;
  userId?: number;
  customerEmail?: string;
  targetUrl: string;
  timestamp: Date;
}
