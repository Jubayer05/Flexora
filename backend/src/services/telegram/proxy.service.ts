/**
 * Telegram Proxy Service
 * Manages proxy configuration, testing, and rotation for Telegram accounts
 * Supports: IP Royal, Proxy-Seller, Bright Data, and custom SOCKS5/HTTP proxies
 */

import axios from 'axios';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import db from '../../configs/db';
import type { ProxyConfig } from './types';

// ================================
// TYPES
// ================================

export type ProxyProvider = 'iproyal' | 'proxy-seller' | 'bright-data' | 'custom';

export interface ProxyProviderConfig {
  provider: ProxyProvider;
  enabled: boolean;
  host: string;
  port: number;
  username?: string;
  password?: string;
  type: 'socks5' | 'http';
  rotationEnabled?: boolean;
  rotationInterval?: number; // minutes
}

export interface ProxyTestResult {
  success: boolean;
  responseTime?: number; // ms
  externalIp?: string;
  country?: string;
  error?: string;
}

export interface ProxyPoolStats {
  totalProxies: number;
  activeProxies: number;
  failedProxies: number;
  averageResponseTime: number;
}

interface ProxyState {
  config: ProxyConfig;
  provider: ProxyProvider;
  lastUsed: number;
  lastTested: number;
  successCount: number;
  failureCount: number;
  averageResponseTime: number;
  isHealthy: boolean;
}

// ================================
// PROXY SERVICE CLASS
// ================================

export class TelegramProxyService {
  private proxyPool: Map<string, ProxyState> = new Map();
  private providerConfigs: Map<ProxyProvider, ProxyProviderConfig> = new Map();
  private currentProxyIndex: number = 0;
  private configLoaded: boolean = false;

  /**
   * Get proxy pool for external access
   */
  getProxyPool(): Map<string, ProxyState> {
    return this.proxyPool;
  }

  /**
   * Get provider configs for external access
   */
  getProviderConfigs(): Map<ProxyProvider, ProxyProviderConfig> {
    return this.providerConfigs;
  }

  /**
   * Load proxy configurations from database
   */
  async loadConfig(): Promise<void> {
    if (this.configLoaded) {
      return;
    }

    try {
      const setting = await db.settings.findUnique({
        where: { key: 'telegram_proxy_config' },
      });

      if (setting?.value) {
        const configs = setting.value as any as ProxyProviderConfig[];

        for (const config of configs) {
          if (config.enabled) {
            this.providerConfigs.set(config.provider, config);
            this.addProxyToPool(config);
          }
        }
      }

      // Also load from environment variables as fallback
      this.loadFromEnv();

      this.configLoaded = true;
      console.log(`✅ Proxy service loaded with ${this.proxyPool.size} proxies`);
    } catch (error) {
      console.error('❌ Failed to load proxy config:', error);
    }
  }

  /**
   * Load proxy from environment variables
   */
  private loadFromEnv(): void {
    // IP Royal
    if (process.env.IPROYAL_HOST) {
      const config: ProxyProviderConfig = {
        provider: 'iproyal',
        enabled: true,
        host: process.env.IPROYAL_HOST,
        port: parseInt(process.env.IPROYAL_PORT || '12321'),
        username: process.env.IPROYAL_USERNAME,
        password: process.env.IPROYAL_PASSWORD,
        type: 'socks5',
      };
      this.providerConfigs.set('iproyal', config);
      this.addProxyToPool(config);
    }

    // Proxy Seller
    if (process.env.PROXYSELLER_HOST) {
      const config: ProxyProviderConfig = {
        provider: 'proxy-seller',
        enabled: true,
        host: process.env.PROXYSELLER_HOST,
        port: parseInt(process.env.PROXYSELLER_PORT || '10000'),
        username: process.env.PROXYSELLER_USERNAME,
        password: process.env.PROXYSELLER_PASSWORD,
        type: 'socks5',
      };
      this.providerConfigs.set('proxy-seller', config);
      this.addProxyToPool(config);
    }

    // Bright Data
    if (process.env.BRIGHTDATA_HOST) {
      const config: ProxyProviderConfig = {
        provider: 'bright-data',
        enabled: true,
        host: process.env.BRIGHTDATA_HOST,
        port: parseInt(process.env.BRIGHTDATA_PORT || '22225'),
        username: process.env.BRIGHTDATA_USERNAME,
        password: process.env.BRIGHTDATA_PASSWORD,
        type: 'http',
      };
      this.providerConfigs.set('bright-data', config);
      this.addProxyToPool(config);
    }
  }

  /**
   * Add proxy to pool
   */
  private addProxyToPool(providerConfig: ProxyProviderConfig): void {
    const key = `${providerConfig.provider}:${providerConfig.host}:${providerConfig.port}`;
    const existingState = this.proxyPool.get(key);

    const proxyConfig: ProxyConfig = {
      host: providerConfig.host,
      port: providerConfig.port,
      username: providerConfig.username,
      password: providerConfig.password,
      type: providerConfig.type,
    };

    this.proxyPool.set(key, {
      config: proxyConfig,
      provider: providerConfig.provider,
      lastUsed: existingState?.lastUsed ?? 0,
      lastTested: existingState?.lastTested ?? 0,
      successCount: existingState?.successCount ?? 0,
      failureCount: existingState?.failureCount ?? 0,
      averageResponseTime: existingState?.averageResponseTime ?? 0,
      isHealthy: existingState?.isHealthy ?? true,
    });
  }

  /**
   * Get next available proxy using round-robin with health check
   */
  async getNextProxy(): Promise<ProxyConfig | null> {
    if (!this.configLoaded) {
      await this.loadConfig();
    }

    if (this.proxyPool.size === 0) {
      return null;
    }

    const proxies = Array.from(this.proxyPool.entries());
    const healthyProxies = proxies.filter(([_, state]) => state.isHealthy);

    if (healthyProxies.length === 0) {
      // If no healthy proxies, try the least recently used one
      proxies.sort((a, b) => a[1].lastUsed - b[1].lastUsed);
      const firstProxy = proxies[0];
      if (!firstProxy) return null;
      const [key, state] = firstProxy;
      state.lastUsed = Date.now();
      this.proxyPool.set(key, state);
      return state.config;
    }

    // Round-robin among healthy proxies
    this.currentProxyIndex = (this.currentProxyIndex + 1) % healthyProxies.length;
    const selectedProxy = healthyProxies[this.currentProxyIndex];
    if (!selectedProxy) return null;
    const [key, state] = selectedProxy;
    state.lastUsed = Date.now();
    this.proxyPool.set(key, state);

    return state.config;
  }

  /**
   * Get next healthy proxy while skipping proxies already tried in the current operation.
   */
  async getNextProxyExcluding(triedProxies: ProxyConfig[] = []): Promise<ProxyConfig | null> {
    if (!this.configLoaded) {
      await this.loadConfig();
    }

    if (this.proxyPool.size === 0) {
      return null;
    }

    const triedKeys = new Set(triedProxies.map((proxy) => this.getProxyKey(proxy)));
    const healthyProxies = Array.from(this.proxyPool.entries()).filter(
      ([key, state]) => state.isHealthy && !triedKeys.has(key)
    );

    if (healthyProxies.length === 0) {
      return null;
    }

    this.currentProxyIndex = (this.currentProxyIndex + 1) % healthyProxies.length;
    const selectedProxy = healthyProxies[this.currentProxyIndex];
    if (!selectedProxy) return null;

    const [key, state] = selectedProxy;
    state.lastUsed = Date.now();
    this.proxyPool.set(key, state);

    return state.config;
  }

  /**
   * Get proxy for specific provider
   */
  async getProxyByProvider(provider: ProxyProvider): Promise<ProxyConfig | null> {
    if (!this.configLoaded) {
      await this.loadConfig();
    }

    for (const [_, state] of this.proxyPool) {
      if (state.provider === provider && state.isHealthy) {
        state.lastUsed = Date.now();
        return state.config;
      }
    }

    return null;
  }

  /**
   * Test a proxy connection
   */
  async testProxy(proxy: ProxyConfig): Promise<ProxyTestResult> {
    const startTime = Date.now();

    try {
      const proxyUrl = this.buildProxyUrl(proxy);
      const agent =
        proxy.type === 'socks5'
          ? new SocksProxyAgent(proxyUrl)
          : new HttpsProxyAgent(proxyUrl);

      const response = await axios.get('https://api.ipify.org?format=json', {
        httpAgent: agent,
        httpsAgent: agent,
        timeout: 10000,
      });

      const responseTime = Date.now() - startTime;

      // Get geo info
      let country = 'Unknown';
      try {
        const geoResponse = await axios.get(`https://ipapi.co/${response.data.ip}/json/`, {
          httpAgent: agent,
          httpsAgent: agent,
          timeout: 5000,
        });
        country = geoResponse.data?.country_name || 'Unknown';
      } catch {
        // Ignore geo lookup errors
      }

      return {
        success: true,
        responseTime,
        externalIp: response.data.ip,
        country,
      };
    } catch (error: any) {
      return {
        success: false,
        responseTime: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  /**
   * Test all proxies in pool
   */
  async testAllProxies(): Promise<Map<string, ProxyTestResult>> {
    const results = new Map<string, ProxyTestResult>();

    for (const [key, state] of this.proxyPool) {
      const result = await this.testProxy(state.config);

      // Update proxy state
      state.lastTested = Date.now();
      if (result.success) {
        state.successCount++;
        state.averageResponseTime =
          (state.averageResponseTime * (state.successCount - 1) + (result.responseTime || 0)) /
          state.successCount;
        state.isHealthy = true;
      } else {
        state.failureCount++;
        // Mark as unhealthy after 3 consecutive failures
        if (state.failureCount >= 3) {
          state.isHealthy = false;
        }
      }

      this.proxyPool.set(key, state);
      results.set(key, result);
    }

    return results;
  }

  /**
   * Report proxy success
   */
  reportSuccess(proxy: ProxyConfig): void {
    const key = this.getProxyKey(proxy);
    const state = this.proxyPool.get(key);

    if (state) {
      state.successCount++;
      state.failureCount = 0; // Reset consecutive failures
      state.isHealthy = true;
      state.lastTested = Date.now();
      this.proxyPool.set(key, state);
    }
  }

  /**
   * Report proxy failure
   */
  reportFailure(proxy: ProxyConfig): void {
    const key = this.getProxyKey(proxy);
    const state = this.proxyPool.get(key);

    if (state) {
      state.failureCount++;
      state.lastTested = Date.now();
      // Mark as unhealthy after 3 consecutive failures
      if (state.failureCount >= 3) {
        state.isHealthy = false;
        console.warn(`⚠️ Proxy ${key} marked as unhealthy after ${state.failureCount} failures`);
      }
      this.proxyPool.set(key, state);
    }
  }

  /**
   * Get pool statistics
   */
  getPoolStats(): ProxyPoolStats {
    let totalResponseTime = 0;
    let responseTimeCount = 0;
    let activeCount = 0;
    let failedCount = 0;

    for (const [_, state] of this.proxyPool) {
      if (state.isHealthy) {
        activeCount++;
        if (state.averageResponseTime > 0) {
          totalResponseTime += state.averageResponseTime;
          responseTimeCount++;
        }
      } else {
        failedCount++;
      }
    }

    return {
      totalProxies: this.proxyPool.size,
      activeProxies: activeCount,
      failedProxies: failedCount,
      averageResponseTime: responseTimeCount > 0 ? totalResponseTime / responseTimeCount : 0,
    };
  }

  /**
   * Get all proxies with their states
   */
  getAllProxies(): Array<{
    key: string;
    provider: ProxyProvider;
    host: string;
    port: number;
    isHealthy: boolean;
    successCount: number;
    failureCount: number;
    averageResponseTime: number;
    lastUsed: Date | null;
    lastTested: Date | null;
  }> {
    return Array.from(this.proxyPool.entries()).map(([key, state]) => ({
      key,
      provider: state.provider,
      host: state.config.host,
      port: state.config.port,
      isHealthy: state.isHealthy,
      successCount: state.successCount,
      failureCount: state.failureCount,
      averageResponseTime: state.averageResponseTime,
      lastUsed: state.lastUsed > 0 ? new Date(state.lastUsed) : null,
      lastTested: state.lastTested > 0 ? new Date(state.lastTested) : null,
    }));
  }

  /**
   * Add custom proxy
   */
  addCustomProxy(proxy: ProxyConfig): string {
    const config: ProxyProviderConfig = {
      provider: 'custom',
      enabled: true,
      ...proxy,
    };

    this.addProxyToPool(config);
    return this.getProxyKey(proxy);
  }

  /**
   * Remove proxy from pool
   */
  removeProxy(key: string): boolean {
    return this.proxyPool.delete(key);
  }

  /**
   * Reset proxy health status
   */
  resetProxyHealth(key: string): boolean {
    const state = this.proxyPool.get(key);
    if (state) {
      state.isHealthy = true;
      state.failureCount = 0;
      this.proxyPool.set(key, state);
      return true;
    }
    return false;
  }

  /**
   * Build proxy URL
   */
  private buildProxyUrl(proxy: ProxyConfig): string {
    const protocol = proxy.type === 'socks5' ? 'socks5' : 'http';
    const auth =
      proxy.username && proxy.password
        ? `${encodeURIComponent(proxy.username)}:${encodeURIComponent(proxy.password)}@`
        : '';
    return `${protocol}://${auth}${proxy.host}:${proxy.port}`;
  }

  /**
   * Get unique key for proxy
   */
  private getProxyKey(proxy: ProxyConfig): string {
    const matchingEntry = Array.from(this.proxyPool.entries()).find(
      ([_, state]) =>
        state.config.host === proxy.host &&
        state.config.port === proxy.port &&
        (state.config.username || '') === (proxy.username || '')
    );

    if (matchingEntry) {
      return matchingEntry[0];
    }

    return `custom:${proxy.host}:${proxy.port}`;
  }

  /**
   * Save current configuration to database
   */
  async saveConfig(): Promise<void> {
    const configs = Array.from(this.providerConfigs.values());

    await db.settings.upsert({
      where: { key: 'telegram_proxy_config' },
      update: { value: configs as any },
      create: {
        key: 'telegram_proxy_config',
        value: configs as any,
      },
    });
  }

  /**
   * Reload configuration
   */
  async reloadConfig(): Promise<void> {
    this.proxyPool.clear();
    this.providerConfigs.clear();
    this.configLoaded = false;
    await this.loadConfig();
  }
}

// ================================
// SINGLETON EXPORT
// ================================

export const telegramProxyService = new TelegramProxyService();
