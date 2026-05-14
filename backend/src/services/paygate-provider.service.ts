import { Prisma } from '@prisma/client';
import db from '../configs/db';
import {
  type PayGateProviderConfig,
  PAYGATE_DEFAULT_PROVIDERS,
  type PayGateProviderType
} from './paygate-provider-defaults';

type ProviderListQuery = {
  region?: string;
  type?: PayGateProviderType;
  includeInactive?: boolean;
};

export class PayGateProviderService {
  private readonly defaultProviders = [...PAYGATE_DEFAULT_PROVIDERS];

  private normalizeType(type: unknown): PayGateProviderType {
    const value = String(type || '').toLowerCase();
    if (value === 'card' || value === 'crypto' || value === 'bank') return value;

    if (value.includes('card')) return 'card';
    if (value.includes('bank')) return 'bank';
    return 'crypto';
  }

  private toNumber(value: unknown): number | undefined {
    if (value === null || value === undefined || value === '') return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private normalizeProvider(input: any, fallback?: PayGateProviderConfig): PayGateProviderConfig | null {
    if (!input || typeof input !== 'object') return null;

    const code = String(input.code || fallback?.code || '').trim().toLowerCase();
    if (!code) return null;

    const type = this.normalizeType(input.type || fallback?.type);
    const regionsRaw = Array.isArray(input.regions)
      ? input.regions
      : Array.isArray(fallback?.regions)
        ? fallback?.regions
        : ['GLOBAL'];

    const regions = regionsRaw
      .map((region: any) => String(region || '').trim().toUpperCase())
      .filter(Boolean);

    return {
      code,
      name: String(input.name || fallback?.name || code).trim(),
      type,
      method: String(input.method || fallback?.method || process.env.PAYGATE_METHOD || 'polygon/usdc')
        .trim()
        .toLowerCase(),
      regions: regions.length ? regions : ['GLOBAL'],
      isActive: input.isActive === undefined ? fallback?.isActive !== false : Boolean(input.isActive),
      sortOrder: this.toNumber(input.sortOrder) ?? fallback?.sortOrder ?? 999,
      minAmount: this.toNumber(input.minAmount) ?? fallback?.minAmount,
      maxAmount: this.toNumber(input.maxAmount) ?? fallback?.maxAmount,
      feePercent: this.toNumber(input.feePercent) ?? fallback?.feePercent,
      icon: input.icon || fallback?.icon,
      description: input.description || fallback?.description
    };
  }

  private getDefaultByCode(code: string): PayGateProviderConfig | undefined {
    return this.defaultProviders.find((provider) => provider.code === code);
  }

  private providersFromNetworks(networks: string[] = []): PayGateProviderConfig[] {
    return networks
      .map((rawCode, index) => {
        const code = String(rawCode || '').trim().toLowerCase();
        if (!code) return null;

        const fallback = this.getDefaultByCode(code);
        if (fallback) {
          return {
            ...fallback,
            sortOrder: index + 1
          };
        }

        const type = this.normalizeType(code.split('-')[0]);
        return {
          code,
          name: code,
          type,
          method: process.env.PAYGATE_METHOD || 'polygon/usdc',
          regions: ['GLOBAL'],
          isActive: true,
          sortOrder: index + 1
        } as PayGateProviderConfig;
      })
      .filter(Boolean) as PayGateProviderConfig[];
  }

  private providersFromMeta(meta: any): PayGateProviderConfig[] {
    const rawProviders =
      meta && typeof meta === 'object' && Array.isArray((meta as any).paygateProviders)
        ? ((meta as any).paygateProviders as any[])
        : [];

    return rawProviders
      .map((provider: any) => {
        const fallback = this.getDefaultByCode(String(provider?.code || '').toLowerCase());
        return this.normalizeProvider(provider, fallback);
      })
      .filter(Boolean) as PayGateProviderConfig[];
  }

  private mergeWithDefaults(customProviders: PayGateProviderConfig[]): PayGateProviderConfig[] {
    const merged = new Map<string, PayGateProviderConfig>();

    this.defaultProviders.forEach((provider) => {
      merged.set(provider.code, { ...provider });
    });

    customProviders.forEach((provider) => {
      const fallback = merged.get(provider.code);
      const normalized = this.normalizeProvider(provider, fallback);
      if (normalized) merged.set(normalized.code, normalized);
    });

    return Array.from(merged.values()).sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code));
  }

  private matchesRegion(provider: PayGateProviderConfig, region?: string): boolean {
    if (!region) return true;
    const normalizedRegion = region.trim().toUpperCase();
    if (!normalizedRegion) return true;
    return provider.regions.some((entry) => entry === 'GLOBAL' || entry === normalizedRegion);
  }

  private matchesType(provider: PayGateProviderConfig, type?: PayGateProviderType): boolean {
    if (!type) return true;
    return provider.type === type;
  }

  private async getPayGateMethodRecord() {
    return db.paymentMethod.findFirst({
      where: { gateway: 'paygate' },
      orderBy: { id: 'asc' }
    });
  }

  async listProviders(query: ProviderListQuery = {}) {
    const method = await this.getPayGateMethodRecord();

    const providersFromMeta = method ? this.providersFromMeta(method.meta) : [];
    const providersFromNetworks = method ? this.providersFromNetworks(method.networks || []) : [];

    let source: 'defaults' | 'custom' | 'networks' = 'defaults';
    let providers: PayGateProviderConfig[] = this.defaultProviders;

    if (providersFromMeta.length) {
      source = 'custom';
      providers = this.mergeWithDefaults(providersFromMeta);
    } else if (providersFromNetworks.length) {
      source = 'networks';
      providers = this.mergeWithDefaults(providersFromNetworks);
    }

    const filtered = providers.filter((provider) => {
      if (!query.includeInactive && provider.isActive === false) return false;
      if (!this.matchesType(provider, query.type)) return false;
      if (!this.matchesRegion(provider, query.region)) return false;
      return true;
    });

    return {
      source,
      paymentMethodId: method?.id || null,
      providers: filtered
    };
  }

  async updateProviders(providers: PayGateProviderConfig[]) {
    const method = await this.getPayGateMethodRecord();
    if (!method) {
      throw new Error('No PayGate payment method found. Create an active paygate payment method first.');
    }

    const normalized = providers
      .map((provider, index) => {
        const fallback = this.getDefaultByCode(String(provider?.code || '').toLowerCase());
        const resolved = this.normalizeProvider(
          {
            ...provider,
            sortOrder: provider.sortOrder ?? index + 1
          },
          fallback
        );

        return resolved;
      })
      .filter(Boolean) as PayGateProviderConfig[];

    if (!normalized.length) {
      throw new Error('At least one paygate provider is required');
    }

    const existingMeta =
      method.meta && typeof method.meta === 'object' && !Array.isArray(method.meta)
        ? (method.meta as Prisma.JsonObject)
        : ({} as Prisma.JsonObject);

    const paygateProviders = JSON.parse(JSON.stringify(normalized)) as Prisma.JsonArray;
    const nextMeta: Prisma.InputJsonObject = {
      ...existingMeta,
      paygateProviders
    };

    await db.paymentMethod.update({
      where: { id: method.id },
      data: {
        meta: nextMeta
      }
    });

    return this.listProviders({ includeInactive: true });
  }

  async resetProviders() {
    const method = await this.getPayGateMethodRecord();
    if (!method) {
      throw new Error('No PayGate payment method found. Create an active paygate payment method first.');
    }

    const existingMeta =
      method.meta && typeof method.meta === 'object' && !Array.isArray(method.meta)
        ? (method.meta as Prisma.JsonObject)
        : ({} as Prisma.JsonObject);
    const { paygateProviders: _removed, ...restMeta } = existingMeta;
    const nextMeta: Prisma.InputJsonObject = { ...restMeta };

    await db.paymentMethod.update({
      where: { id: method.id },
      data: {
        meta: nextMeta
      }
    });

    return this.listProviders({ includeInactive: true });
  }
}
