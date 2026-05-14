export type PayGateProviderType = 'card' | 'crypto' | 'bank';

export interface PayGateProviderConfig {
  code: string;
  name: string;
  type: PayGateProviderType;
  method: string;
  regions: string[];
  isActive: boolean;
  sortOrder: number;
  minAmount?: number;
  maxAmount?: number;
  feePercent?: number;
  icon?: string;
  description?: string;
}

export const PAYGATE_DEFAULT_PROVIDERS: PayGateProviderConfig[] = [
  {
    code: 'card-bitnovo',
    name: 'Bitnovo',
    type: 'card',
    method: 'polygon/usdc',
    regions: ['EU', 'ES', 'PT', 'IT', 'FR', 'LATAM'],
    isActive: true,
    sortOrder: 1,
    minAmount: 10,
    maxAmount: 5000,
    icon: 'https://checkout.paygate.to/icons/bitnovo.svg',
    description: 'Credit/Debit Card - Europe, Latin America'
  },
  {
    code: 'card-mercuryo',
    name: 'Mercuryo',
    type: 'card',
    method: 'polygon/usdc',
    regions: ['EU', 'UK', 'GLOBAL'],
    isActive: true,
    sortOrder: 2,
    minAmount: 30,
    maxAmount: 10000,
    icon: 'https://checkout.paygate.to/icons/mercuryo.svg',
    description: 'Credit/Debit Card - 180+ countries, Apple Pay, Google Pay'
  },
  {
    code: 'card-unlimit',
    name: 'Unlimit',
    type: 'card',
    method: 'polygon/usdc',
    regions: ['GLOBAL'],
    isActive: true,
    sortOrder: 3,
    minAmount: 10,
    maxAmount: 10000,
    icon: 'https://checkout.paygate.to/icons/unlimit.svg',
    description: 'Credit/Debit Card - 150+ countries, local payment methods'
  },
  {
    code: 'card-guardarian',
    name: 'Guardarian',
    type: 'card',
    method: 'polygon/usdc',
    regions: ['EU', 'UK', 'GLOBAL'],
    isActive: true,
    sortOrder: 4,
    minAmount: 20,
    maxAmount: 10000,
    icon: 'https://checkout.paygate.to/icons/guardarian.svg',
    description: 'Credit/Debit Card - 170+ countries, 50+ payment methods'
  },
  {
    code: 'card-wert',
    name: 'Wert',
    type: 'card',
    method: 'polygon/usdc',
    regions: ['GLOBAL'],
    isActive: true,
    sortOrder: 5,
    minAmount: 50,
    maxAmount: 5000,
    icon: 'https://checkout.paygate.to/icons/wert.svg',
    description: 'Credit/Debit Card - Global coverage'
  },
  {
    code: 'card-stripe',
    name: 'Stripe Crypto.link.com (USA Only)',
    type: 'card',
    method: 'polygon/usdc',
    regions: ['US'],
    isActive: true,
    sortOrder: 6,
    minAmount: 5,
    maxAmount: 10000,
    icon: 'https://checkout.paygate.to/icons/stripe.svg',
    description: 'Credit/Debit Card via Stripe - US customers only'
  },
  {
    code: 'card-transfi',
    name: 'Transfi',
    type: 'card',
    method: 'polygon/usdc',
    regions: ['GLOBAL'],
    isActive: true,
    sortOrder: 7,
    minAmount: 70,
    maxAmount: 10000,
    icon: 'https://checkout.paygate.to/icons/transfi.svg',
    description: 'Credit/Debit Card via Transfi - Global coverage'
  },
  {
    code: 'card-ramp',
    name: 'Ramp Network',
    type: 'card',
    method: 'polygon/usdc',
    regions: ['EU', 'US', 'UK', 'GLOBAL'],
    isActive: true,
    sortOrder: 8,
    minAmount: 5,
    maxAmount: 7500,
    icon: 'https://checkout.paygate.to/icons/ramp.svg',
    description: 'Credit/Debit Card via Ramp - EU, UK, US'
  },
  {
    code: 'card-transak',
    name: 'Transak',
    type: 'card',
    method: 'polygon/usdc',
    regions: ['EU', 'US', 'UK', 'LATAM', 'GLOBAL'],
    isActive: false,
    sortOrder: 9,
    minAmount: 15,
    maxAmount: 7500,
    icon: 'https://checkout.paygate.to/icons/transak.svg',
    description: 'Credit/Debit Card via Transak'
  },
  {
    code: 'bank-sepa',
    name: 'SEPA Transfer',
    type: 'bank',
    method: 'polygon/usdc',
    regions: ['EU'],
    isActive: true,
    sortOrder: 10,
    minAmount: 50,
    maxAmount: 25000
  },
  {
    code: 'bank-ach',
    name: 'ACH Transfer',
    type: 'bank',
    method: 'polygon/usdc',
    regions: ['US'],
    isActive: true,
    sortOrder: 11,
    minAmount: 50,
    maxAmount: 25000
  },
  {
    code: 'crypto-usdc-polygon',
    name: 'USDC (Polygon)',
    type: 'crypto',
    method: 'polygon/usdc',
    regions: ['GLOBAL'],
    isActive: true,
    sortOrder: 12,
    minAmount: 1,
    maxAmount: 100000,
    feePercent: 0
  },
  {
    code: 'crypto-usdt-tron',
    name: 'USDT (Tron)',
    type: 'crypto',
    method: 'tron/usdt',
    regions: ['GLOBAL'],
    isActive: true,
    sortOrder: 13,
    minAmount: 1,
    maxAmount: 100000,
    feePercent: 0
  },
  {
    code: 'crypto-usdt-erc20',
    name: 'USDT (ERC20)',
    type: 'crypto',
    method: 'erc20/usdt',
    regions: ['GLOBAL'],
    isActive: true,
    sortOrder: 14,
    minAmount: 5,
    maxAmount: 100000,
    feePercent: 0
  },
  {
    code: 'crypto-btc',
    name: 'BTC (Bitcoin)',
    type: 'crypto',
    method: 'btc/btc',
    regions: ['GLOBAL'],
    isActive: true,
    sortOrder: 15,
    minAmount: 10,
    maxAmount: 100000,
    feePercent: 0
  }
];
