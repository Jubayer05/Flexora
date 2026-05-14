import type { User, UserRole } from '@prisma/client';
import type { Request } from 'express';

// Extend Request interface to include user data
export interface AuthRequest extends Request {
  user?: {
    userId: number;
    email: string;
    role: UserRole;
    sessionId: string;
    isGuest: boolean;
    // rank: UserRank;
  };
  guestAccess?: {
    email: string;
  };
}

// Extended User type with login session information (used for profile API)
export interface UserWithLoginInfo extends Omit<
  User,
  'passwordHash' | 'guestToken' | 'rank' | 'totalSpent' | 'totalOrders' | 'discountPercent'
> {
  lastLoginIp?: string | null;
  lastLoginDevice?: string | null;
  lastLoginAt?: Date | null;
  /** Rank name for display (e.g. "GOLD") when returned from profile */
  rank?: string | null;
  totalOrders?: number;
  totalSpent?: number;
  discountPercent?: number;
  /** Rank benefits (from rank.meta.features) for profile dashboard */
  rankBenefits?: string[];
  rankMinSpending?: number;
  rankMaxSpending?: number;
  nextRankName?: string | null;
  nextRankMinSpending?: number;
  /** Next rank discount % for profile (what they'll get at next tier) */
  nextRankDiscount?: number;
  /** Next rank benefits (from next rank meta.features) for profile */
  nextRankBenefits?: string[];
  /** Rank icon URL for profile dashboard */
  rankIcon?: string | null;
  /** Affiliate/referral: code for link, earnings (withdrawable) */
  referral?: { code: string; earnings: number };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
  errors?: any[];
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
