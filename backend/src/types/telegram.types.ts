// Telegram Account Meta Interface - Simplified
export interface TelegramAccountMeta {
  // Phone reference (for quick lookups and session management - non-confidential)
  // This is NOT the full credential, just a reference stored for display/session management
  phone?: string;

  // Session data
  sessionFile?: string; // session1.dat, session2.dat
  sessionString?: string; // Telethon session string

  // Technical configuration
  proxy?: {
    host: string;
    port: number;
    type: 'http' | 'socks5' | 'HTTP' | 'SOCKS5';
    username?: string;
    password?: string;
  };

  // Admin notes
  notes?: string; // Admin notes about the account

  // Health/status tracking for Telegram management
  accountHealthStatus?:
    | 'AVAILABLE'
    | 'INVALID'
    | 'BROKE'
    | 'BANNED'
    | 'RELOGIN_REQUIRED';
  accountHealthMessage?: string;
  lastStatusCheckedAt?: string;
}

// Telegram Credentials Interface (for encryption)
export interface TelegramCredentials {
  phone: string; // Phone number with country code
  email?: string; // Associated email
  username?: string; // @username
  password?: string; // Account password (if 2FA enabled)
  sessionData: string; // Session file content or session string
  backupCodes?: string[]; // 2FA backup codes (if available)
}

// Account creation/update schemas
export interface CreateTelegramAccount {
  productId?: number | null;
  credentials: TelegramCredentials;
  meta: TelegramAccountMeta;
  hasPremium?: boolean;
}

export interface UpdateTelegramAccount {
  productId?: number;
  credentials?: Partial<TelegramCredentials>;
  meta?: Partial<TelegramAccountMeta>;
  hasPremium?: boolean;
  isValid?: boolean;
  archived?: boolean; // Allow archiving/unarchiving accounts
  isUsed?: boolean; // Allow marking account as used/sold
  usedAt?: string | Date; // Allow setting used timestamp
}

// Account assignment and delivery types
export interface TelegramAccountAssignment {
  orderItemId: number;
  accountId: number;
  requiresOTP: boolean;
  deliveredAt: Date;
}

// Account statistics interface
export interface TelegramAccountStats {
  total: number;
  available: number;
  used: number;
  invalid: number;
  premium: number;
  usageRate: number;
}

// Account details for customer access
export interface TelegramAccountDetails {
  id: number;
  productId: number;
  productName?: string;
  productSku?: string;
  platform: string;
  requiresOtp: boolean;
  hasPremium: boolean;
  isUsed: boolean;
  usedAt?: Date;
  meta: TelegramAccountMeta;
  createdAt: Date;
  credentials?: TelegramCredentials; // Only included for authorized access
}

// Customer account access response
export interface CustomerAccountAccess {
  account: {
    id: number;
    productName?: string;
    credentials: TelegramCredentials;
    meta: TelegramAccountMeta;
    accessedAt: Date;
  };
}

// Account status for customer dashboard
export interface TelegramAccountStatus {
  orderItemId: number;
  productName: string;
  orderStatus: string;
  accountAssigned: boolean;
  accountId?: number;
  requiresOTP: boolean;
  hasPremium: boolean;
  deliveredAt?: Date;
  accountMeta?: TelegramAccountMeta;
}

// Notification data structure
export interface TelegramAccountDeliveryNotification {
  userId?: number;
  userEmail?: string;
  orderItemId: number;
  accountId: number;
  productName: string;
  requiresOTP: boolean;
  otp?: string;
}

// Product enhancement for Telegram
export interface EnhancedTelegramProduct {
  id: number;
  name: string;
  sku: string;
  platform: 'TELEGRAM';
  type: string;
  price: number;
  stockCount: number;
  telegramMeta?: { description?: string } | null;
  availableAccounts: number;
  requiresOTP: boolean;
  category?: any;
  _count: { accounts: number };
  [key: string]: any; // Allow other product fields
}
