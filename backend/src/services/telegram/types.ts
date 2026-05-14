/**
 * Telegram Service Types
 * TypeScript interfaces for Telegram OTP and Session management
 */

// ================================
// PROXY CONFIGURATION
// ================================

export interface ProxyConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
  type: 'socks5' | 'http';
}

// ================================
// OTP TYPES
// ================================

export interface OtpCheckRequest {
  phoneNumber: string;
  customerId: number;
  minutesBack?: number;
  proxy?: ProxyConfig;
}

export interface OtpResult {
  success: boolean;
  otp?: string;
  message: string;
  timestamp?: Date;
  expiresAt?: Date;
}

export interface OtpDetectionResult {
  isOtpMessage: boolean;
  extractedOtp: string | null;
  senderId: number;
  messageText?: string;
}

// ================================
// SESSION TYPES
// ================================

export interface SessionCreateRequest {
  phoneNumber: string;
  adminId: number;
  proxy?: ProxyConfig;
}

export interface SessionOtpSubmitRequest {
  phoneNumber: string;
  otpCode: string;
  adminId: number;
  password2FA?: string;
  proxy?: ProxyConfig;
}

export interface SessionUserInfo {
  id: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface SessionResult {
  success: boolean;
  message: string;
  phoneNumber?: string;
  requires2FA?: boolean;
  sessionExists?: boolean;
  isAuthorized?: boolean;
  userInfo?: SessionUserInfo;
  proxy?: ProxyConfig;
}

export interface SessionListItem {
  phoneNumber: string;
  isAuthorized: boolean;
  username?: string | null;
  firstName?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionListResult {
  success: boolean;
  sessions: SessionListItem[];
  total: number;
}

// ================================
// TELEGRAM CLIENT OPTIONS
// ================================

export interface TelegramClientOptions {
  phoneNumber: string;
  sessionString?: string;
  proxy?: ProxyConfig;
}

// ================================
// CONSTANTS
// ================================

// Telegram official account IDs that send OTP codes
export const TELEGRAM_OFFICIAL_IDS = [
  777000,      // Primary Telegram account
  178220800,   // Telegram notifications
  1945716696,  // Telegram service messages
  429000,      // Telegram
  454000,      // Telegram
];

// Keywords that indicate an OTP message
export const OTP_KEYWORDS = [
  'code',
  'verification',
  'login',
  'confirm',
  'authenticate',
  'telegram',
  'enter',
  'confirm',
];

// Regex patterns for OTP extraction
export const OTP_PATTERNS = {
  // Match 4-8 digit codes
  DIGIT_CODE: /\d{4,8}/g,
  // Years to filter out (2020-2035)
  YEAR_PATTERN: /^20[2-3]\d$/,
  // Repeated digits (1111, 0000, etc.)
  REPEATED_DIGITS: /^(\d)\1+$/,
};
