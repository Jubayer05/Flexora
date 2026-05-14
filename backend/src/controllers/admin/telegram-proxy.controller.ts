import type { Request, Response, NextFunction } from 'express'
import db from '../../configs/db'
import { telegramProxyService } from '../../services/telegram/proxy.service'
import { sendSuccessResponse, sendErrorResponse } from '../../utils/response-handler'
import type { ProxyProviderConfig, ProxyTestResult } from '../../services/telegram/proxy.service'

// Initialize proxy service on module load
telegramProxyService.loadConfig().catch((err) => {
  console.error('Failed to initialize proxy service:', err)
})

const SUPPORTED_PROVIDERS = ['iproyal', 'proxy-seller', 'bright-data', 'custom'] as const
const SUPPORTED_TYPES = ['socks5', 'http'] as const

function parseBulkProxyLine(
  line: string,
  fallbackProvider: ProxyProviderConfig['provider'],
  fallbackType: ProxyProviderConfig['type'],
  fallbackEnabled: boolean
): ProxyProviderConfig | null {
  const trimmed = line.trim()
  if (!trimmed) return null

  const parts = trimmed.split(':').map((part) => part.trim())
  if (parts.length !== 2 && parts.length !== 4) {
    throw new Error(`Invalid proxy format: "${trimmed}". Use host:port or host:port:username:password`)
  }

  const [host, portRaw, username, password] = parts
  const port = Number(portRaw)

  if (!host || Number.isNaN(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid proxy entry: "${trimmed}"`)
  }

  return {
    provider: fallbackProvider,
    enabled: fallbackEnabled,
    host,
    port,
    username: username || undefined,
    password: password || undefined,
    type: fallbackType
  }
}

/**
 * Get all proxy configurations
 * GET /api/v1/admin/telegram-proxies
 */
export const getProxies = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Ensure proxy configs are loaded
    await telegramProxyService.loadConfig()

    const setting = await db.settings.findUnique({
      where: { key: 'telegram_proxy_config' }
    })

    const configs: ProxyProviderConfig[] = (setting?.value as any) || []

    // Get proxy pool stats
    const pool = telegramProxyService.getProxyPool()
    const proxies = Array.from(pool.values()).map((state) => {
      const config = configs.find(
        (c) => c.provider === state.provider && c.host === state.config.host && c.port === state.config.port
      )
      return {
        id: `${state.provider}-${state.config.host}-${state.config.port}`,
        provider: state.provider,
        host: state.config.host,
        port: state.config.port,
        type: state.config.type,
        username: state.config.username,
        password: state.config.password ? '***' : undefined,
        lastUsed: state.lastUsed,
        lastTested: state.lastTested,
        successCount: state.successCount,
        failureCount: state.failureCount,
        averageResponseTime: state.averageResponseTime,
        isHealthy: state.isHealthy,
        enabled: config?.enabled || false
      }
    })

    // Also include configs that might not be in pool yet
    const configProxies = configs
      .filter((config) => !proxies.find((p) => p.provider === config.provider && p.host === config.host && p.port === config.port))
      .map((config) => ({
        id: `${config.provider}-${config.host}-${config.port}`,
        provider: config.provider,
        host: config.host,
        port: config.port,
        type: config.type,
        username: config.username,
        password: config.password ? '***' : undefined,
        lastUsed: 0,
        lastTested: 0,
        successCount: 0,
        failureCount: 0,
        averageResponseTime: 0,
        isHealthy: true,
        enabled: config.enabled
      }))

    const allProxies = [...proxies, ...configProxies]

    return sendSuccessResponse(res, { proxies: allProxies, configs }, 'Proxies retrieved successfully')
  } catch (error) {
    return next(error)
  }
}

/**
 * Test a proxy
 * POST /api/v1/admin/telegram-proxies/test
 */
export const testProxy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { host, port, type, username, password, provider } = req.body

    if (!host || !port) {
      return sendErrorResponse(res, 'Host and port are required', 400)
    }

    const proxyConfig = {
      host,
      port: Number(port),
      type: (type || 'socks5') as 'socks5' | 'http',
      username,
      password
    }

    const result: ProxyTestResult = await telegramProxyService.testProxy(proxyConfig)

    // Update proxy state if it exists in pool
    const pool = telegramProxyService.getProxyPool()
    const existingStateEntry = Array.from(pool.entries()).find(
      ([_, state]) => state.config.host === proxyConfig.host && state.config.port === proxyConfig.port
    )
    const existingState = existingStateEntry?.[1]

    if (existingState) {
      existingState.lastTested = Date.now()
      if (result.success) {
        existingState.successCount++
        existingState.averageResponseTime =
          (existingState.averageResponseTime * (existingState.successCount - 1) + (result.responseTime || 0)) /
          existingState.successCount
        existingState.isHealthy = true
        existingState.failureCount = 0
      } else {
        existingState.failureCount++
        if (existingState.failureCount >= 3) {
          existingState.isHealthy = false
        }
      }
      if (existingStateEntry) {
        pool.set(existingStateEntry[0], existingState)
      }
    }

    return sendSuccessResponse(
      res,
      {
        success: result.success,
        responseTime: result.responseTime,
        externalIp: result.externalIp,
        country: result.country,
        error: result.error
      },
      result.success ? 'Proxy test successful' : 'Proxy test failed'
    )
  } catch (error) {
    return next(error)
  }
}

/**
 * Add or update proxy configuration
 * POST /api/v1/admin/telegram-proxies
 */
export const addOrUpdateProxy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { provider, enabled, host, port, username, password, type, rotationEnabled, rotationInterval } = req.body

    if (!provider || !host || !port) {
      return sendErrorResponse(res, 'Provider, host, and port are required', 400)
    }

    if (!SUPPORTED_PROVIDERS.includes(provider)) {
      return sendErrorResponse(res, 'Invalid provider. Must be: iproyal, proxy-seller, bright-data, or custom', 400)
    }

    if (type && !SUPPORTED_TYPES.includes(type)) {
      return sendErrorResponse(res, 'Type must be socks5 or http', 400)
    }

    // Get existing configs
    let setting = await db.settings.findUnique({
      where: { key: 'telegram_proxy_config' }
    })

    const configs: ProxyProviderConfig[] = setting?.value ? ((setting.value as any) || []) : []

    // Find existing config with same provider and host
    const existingIndex = configs.findIndex((c) => c.provider === provider && c.host === host && c.port === Number(port))

    const newConfig: ProxyProviderConfig = {
      provider: provider as ProxyProviderConfig['provider'],
      enabled: enabled !== undefined ? enabled : true,
      host,
      port: Number(port),
      username,
      password,
      type: (type || 'socks5') as 'socks5' | 'http',
      rotationEnabled,
      rotationInterval
    }

    if (existingIndex >= 0) {
      configs[existingIndex] = newConfig
    } else {
      configs.push(newConfig)
    }

    // Save to database
    if (setting) {
      await db.settings.update({
        where: { key: 'telegram_proxy_config' },
        data: { value: configs as any }
      })
    } else {
      await db.settings.create({
        data: {
          key: 'telegram_proxy_config',
          value: configs as any
        }
      })
    }

    // Reload proxy service
    await telegramProxyService.reloadConfig()

    return sendSuccessResponse(res, { config: newConfig }, 'Proxy configuration saved successfully')
  } catch (error) {
    return next(error)
  }
}

/**
 * Bulk import proxy configurations
 * POST /api/v1/admin/telegram-proxies/bulk
 */
export const bulkImportProxies = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      provider = 'custom',
      type = 'socks5',
      enabled = true,
      proxiesText
    } = req.body as {
      provider?: ProxyProviderConfig['provider']
      type?: ProxyProviderConfig['type']
      enabled?: boolean
      proxiesText?: string
    }

    if (!proxiesText || !String(proxiesText).trim()) {
      return sendErrorResponse(res, 'Proxy list is required', 400)
    }

    if (!SUPPORTED_PROVIDERS.includes(provider)) {
      return sendErrorResponse(res, 'Invalid provider. Must be: iproyal, proxy-seller, bright-data, or custom', 400)
    }

    if (!SUPPORTED_TYPES.includes(type)) {
      return sendErrorResponse(res, 'Type must be socks5 or http', 400)
    }

    const lines = String(proxiesText)
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)

    if (!lines.length) {
      return sendErrorResponse(res, 'No valid proxy lines found', 400)
    }

    const setting = await db.settings.findUnique({
      where: { key: 'telegram_proxy_config' }
    })

    const configs: ProxyProviderConfig[] = setting?.value ? ((setting.value as any) || []) : []
    const existingKeys = new Set(configs.map((config) => `${config.provider}:${config.host}:${config.port}`))

    const importedConfigs: ProxyProviderConfig[] = []
    const skipped: string[] = []
    const invalid: string[] = []

    for (const line of lines) {
      try {
        const parsed = parseBulkProxyLine(line, provider, type, enabled)
        if (!parsed) continue

        const key = `${parsed.provider}:${parsed.host}:${parsed.port}`
        if (existingKeys.has(key)) {
          skipped.push(line)
          continue
        }

        configs.push(parsed)
        importedConfigs.push(parsed)
        existingKeys.add(key)
      } catch (error: any) {
        invalid.push(error?.message || `Invalid proxy line: ${line}`)
      }
    }

    if (!importedConfigs.length && invalid.length) {
      return sendErrorResponse(res, invalid[0] || 'No valid proxies could be imported', 400)
    }

    if (setting) {
      await db.settings.update({
        where: { key: 'telegram_proxy_config' },
        data: { value: configs as any }
      })
    } else {
      await db.settings.create({
        data: {
          key: 'telegram_proxy_config',
          value: configs as any
        }
      })
    }

    await telegramProxyService.reloadConfig()

    return sendSuccessResponse(
      res,
      {
        imported: importedConfigs.length,
        skipped: skipped.length,
        invalid: invalid.length,
        invalidLines: invalid.slice(0, 20)
      },
      `Imported ${importedConfigs.length} proxies successfully`
    )
  } catch (error) {
    return next(error)
  }
}

/**
 * Delete proxy configuration
 * DELETE /api/v1/admin/telegram-proxies/:provider/:host/:port
 */
export const deleteProxy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { provider, host, port } = req.params

    if (!provider || !host || !port) {
      return sendErrorResponse(res, 'Provider, host, and port are required', 400)
    }

    // Get existing configs
    const setting = await db.settings.findUnique({
      where: { key: 'telegram_proxy_config' }
    })

    if (!setting) {
      return sendErrorResponse(res, 'No proxy configurations found', 404)
    }

    const configs: ProxyProviderConfig[] = (setting.value as any) || []
    const filteredConfigs = configs.filter(
      (c) => !(c.provider === provider && c.host === host && c.port === Number(port))
    )

    if (filteredConfigs.length === configs.length) {
      return sendErrorResponse(res, 'Proxy configuration not found', 404)
    }

    // Save to database
    await db.settings.update({
      where: { key: 'telegram_proxy_config' },
      data: { value: filteredConfigs as any }
    })

    // Reload proxy service
    await telegramProxyService.reloadConfig()

    return sendSuccessResponse(res, null, 'Proxy configuration deleted successfully')
  } catch (error) {
    return next(error)
  }
}

/**
 * Get proxy statistics
 * GET /api/v1/admin/telegram-proxies/stats
 */
export const getProxyStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await telegramProxyService.loadConfig()

    const pool = telegramProxyService.getProxyPool()
    const proxies = Array.from(pool.values())

    const stats = {
      totalProxies: proxies.length,
      activeProxies: proxies.filter((p) => p.isHealthy).length,
      failedProxies: proxies.filter((p) => !p.isHealthy).length,
      averageResponseTime:
        proxies.reduce((sum, p) => sum + p.averageResponseTime, 0) / (proxies.length || 1),
      totalSuccessCount: proxies.reduce((sum, p) => sum + p.successCount, 0),
      totalFailureCount: proxies.reduce((sum, p) => sum + p.failureCount, 0)
    }

    return sendSuccessResponse(res, stats, 'Proxy statistics retrieved successfully')
  } catch (error) {
    return next(error)
  }
}

