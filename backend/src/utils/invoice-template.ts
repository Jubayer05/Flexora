/**
 * Invoice Template Utility
 * Constants and helpers for PDF invoice generation
 */

// ================================
// COMPANY INFORMATION
// ================================

export const COMPANY_INFO = {
  name: 'UHQ Accounts',
  tagline: 'Premium Social Media Accounts',
  email: 'support@uhq.com',
  website: 'https://uhqaccounts.com',
  address: {
    line1: '123 Business Street',
    line2: 'Suite 100',
    city: 'New York',
    state: 'NY',
    zip: '10001',
    country: 'United States',
  },
};

// ================================
// PDF STYLING
// ================================

export const COLORS = {
  primary: '#2563eb', // Blue
  secondary: '#64748b', // Slate gray
  success: '#10b981', // Green
  text: '#1e293b', // Dark slate
  textLight: '#64748b', // Light slate
  border: '#e2e8f0', // Light gray
  background: '#f8fafc', // Very light gray
  white: '#ffffff',
};

export const FONTS = {
  regular: 'Helvetica',
  bold: 'Helvetica-Bold',
  italic: 'Helvetica-Oblique',
};

export const SPACING = {
  pageMargin: 50,
  sectionGap: 20,
  lineHeight: 20,
  smallGap: 10,
};

export const SIZES = {
  title: 24,
  heading: 16,
  subheading: 14,
  body: 12,
  small: 10,
};

// ================================
// LAYOUT HELPERS
// ================================

export const PAGE_WIDTH = 595.28; // A4 width in points
export const PAGE_HEIGHT = 841.89; // A4 height in points
export const CONTENT_WIDTH = PAGE_WIDTH - SPACING.pageMargin * 2;

/**
 * Format currency amount
 */
export function formatCurrency(amount: number | string, currency: string = 'USD'): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    BTC: '₿',
    ETH: 'Ξ',
  };

  const symbol = symbols[currency] || currency;
  return `${symbol}${numAmount.toFixed(2)}`;
}

/**
 * Format date for invoice
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format date and time
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Truncate text to fit width
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Get payment method display name
 */
export function getPaymentMethodName(gateway: string): string {
  const names: Record<string, string> = {
    balance: 'Account Balance',
    stripe: 'Credit/Debit Card (Stripe)',
    nowpayments: 'Cryptocurrency (NOWPayments)',
    plisio: 'Cryptocurrency (Plisio)',
    cryptomus: 'Cryptocurrency (Cryptomus)',
    binance: 'Binance Internal Transfer',
  };
  return names[gateway] || gateway.toUpperCase();
}

/**
 * Get payment status display
 */
export function getPaymentStatusDisplay(status: string): { text: string; color: string } {
  const displays: Record<string, { text: string; color: string }> = {
    COMPLETED: { text: 'Paid', color: COLORS.success },
    PENDING: { text: 'Pending', color: COLORS.secondary },
    FAILED: { text: 'Failed', color: '#ef4444' },
    PARTIAL: { text: 'Partial Payment', color: '#f59e0b' },
    REFUNDED: { text: 'Refunded', color: '#6366f1' },
  };
  return displays[status] || { text: status, color: COLORS.text };
}

/**
 * Get order status display
 */
export function getOrderStatusDisplay(status: string): { text: string; color: string } {
  const displays: Record<string, { text: string; color: string }> = {
    PENDING: { text: 'Pending', color: COLORS.secondary },
    PROCESSING: { text: 'Processing', color: '#f59e0b' },
    COMPLETED: { text: 'Completed', color: COLORS.success },
    DELIVERED: { text: 'Delivered', color: COLORS.success },
    CANCELLED: { text: 'Cancelled', color: '#ef4444' },
    REFUNDED: { text: 'Refunded', color: '#6366f1' },
    FAILED: { text: 'Failed', color: '#ef4444' },
  };
  return displays[status] || { text: status, color: COLORS.text };
}
