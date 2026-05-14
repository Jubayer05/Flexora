import { PaymentStatus } from '@prisma/client'
import axios, { type AxiosInstance } from 'axios'
import type {
  CreatePaymentParams,
  IPaymentGateway,
  PaymentResponse,
  PaymentStatusResponse,
  RefundResponse,
  WebhookVerificationResult
} from '../../types/payment-gateway.types'
import { getPaymentCallbackBaseUrl } from '../../utils/payment-urls'

interface PayGateConfig {
  walletAddress: string
  testMode: boolean
}

export interface PayGateCreateWalletParams {
  referenceId: string
  amount: number
  currency?: string
  method?: string
  useHostedCheckout?: boolean
  callbackParams?: Record<string, string | number | boolean | undefined>
  metadata?: Record<string, any>
  gatewayTxnId?: string
}

export interface PayGateWalletSession {
  gatewayTxnId: string
  ipnToken: string
  addressIn: string
  addressInEncrypted?: string
  callbackAddressIn?: string
  method: string
  amountCoin: number
  expiresAt: Date
  callbackUrl: string
}

type PayGateWalletResponse = {
  ipn_token?: string
  polygon_address_in?: string
  polygon_address_in_encrypted?: string
  address_in?: string
  address_in_encrypted?: string
  address_encrypted?: string
  encrypted_address?: string
  wallet_address_encrypted?: string
  status?: string
  data?: any
  [k: string]: any
}

export class PayGateGatewayService implements IPaymentGateway {
  private client: AxiosInstance
  private walletAddress: string

  constructor(config: PayGateConfig) {
    this.walletAddress = (config.walletAddress || '').trim()
    
    // Validate wallet address format
    if (!this.walletAddress) {
      throw new Error('PayGate walletAddress is required')
    }
    
    if (!this.walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      throw new Error(
        `PayGate walletAddress must be a valid Polygon/Ethereum address. ` +
        `Expected format: 0x followed by 40 hex characters. ` +
        `Received: ${this.walletAddress.substring(0, 20)}...`
      )
    }

    const baseURL = process.env.PAYGATE_CONTROL_BASE_URL || 'https://api.paygate.to'
    this.client = axios.create({ baseURL, timeout: 30000 })

    const maskedWallet =
      this.walletAddress.length > 12
        ? `${this.walletAddress.slice(0, 8)}...${this.walletAddress.slice(-6)}`
        : this.walletAddress

    console.log('[PayGate] Gateway initialized with valid wallet address', {
      baseURL,
      testMode: config.testMode,
      wallet: maskedWallet,
      walletFormat: 'Valid 0x format'
    })
  }

  private resolveHostedCheckoutUrl(provider?: string): URL {
    const providerSlug = this.resolveProviderSlug(provider)
    const finalProvider = providerSlug || 'auto'
    
    // Choose endpoint based on provider type
    const endpoint = finalProvider === 'auto' ? 'pay.php' : 'process-payment.php'

    console.log('[PayGate] resolveHostedCheckoutUrl debug', {
      inputProvider: provider,
      providerSlug,
      finalProvider,
      endpoint
    })

    const explicitHostedUrl = (process.env.PAYGATE_HOSTED_PAYMENT_URL || '').trim()
    if (explicitHostedUrl) {
      try {
        console.log('[PayGate] Using explicit PAYGATE_HOSTED_PAYMENT_URL:', explicitHostedUrl)
        return new URL(explicitHostedUrl)
      } catch (error) {
        console.warn('[PayGate] Invalid PAYGATE_HOSTED_PAYMENT_URL, falling back to default', {
          value: explicitHostedUrl,
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }

    const baseFromEnv = (process.env.PAYGATE_CHECKOUT_BASE_URL || '').trim()
    if (baseFromEnv) {
      try {
        // Use correct endpoint based on provider
        const normalized = baseFromEnv.replace(/\/+$/, '') + '/' + endpoint
        console.log('[PayGate] Building checkout URL from env', {
          baseFromEnv,
          endpoint,
          normalized
        })
        const candidate = new URL(normalized)

        if (!/^api\.paygate\.to$/i.test(candidate.hostname)) {
          console.log('[PayGate] Using env-based URL:', candidate.toString())
          return candidate
        }

        console.warn('[PayGate] PAYGATE_CHECKOUT_BASE_URL points to API host, using checkout host instead', {
          value: baseFromEnv
        })
      } catch (error) {
        console.warn('[PayGate] Invalid PAYGATE_CHECKOUT_BASE_URL, falling back to default', {
          value: baseFromEnv,
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }

    // Default: Use correct endpoint based on provider
    const checkoutBase = 'https://checkout.paygate.to'
    const finalUrl = `${checkoutBase}/${endpoint}`
    console.log('[PayGate] Using default checkout URL:', {
      checkoutBase,
      endpoint,
      finalUrl
    })
    return new URL(finalUrl)
  }

  private shouldUseHostedCheckout(providerType?: unknown): boolean {
    const type = String(providerType || '').trim().toLowerCase()
    if (!type) return true // Multi provider fallback
    return type === 'card' || type === 'bank'
  }

  private formatFiatAmount(amount: number): string {
    const safeAmount = Number(amount)
    if (!Number.isFinite(safeAmount) || safeAmount <= 0) return '0'
    return safeAmount.toFixed(2)
  }

  private looksLikeHexAddress(value?: unknown): boolean {
    const raw = String(value || '').trim()
    return /^0x[a-fA-F0-9]{40}$/.test(raw)
  }

  private looksLikeHostedAddressToken(value?: unknown): boolean {
    const raw = String(value || '').trim()
    if (!raw) return false
    if (this.looksLikeHexAddress(raw)) return false

    // PayGate hosted token is usually URL-encoded/base64-ish and much longer than 42-char wallet.
    return raw.length > 48 || /%[0-9A-Fa-f]{2}|[+/=]/.test(raw)
  }

  private safeDecodeHostedAddress(value: string): string {
    if (!value) return ''

    try {
      return decodeURIComponent(value)
    } catch {
      return value
    }
  }

  private normalizeDomain(input?: string): string {
    const raw = String(input || '').trim()
    if (!raw) return ''

    try {
      const parsed = raw.includes('://') ? new URL(raw) : new URL(`https://${raw}`)
      return parsed.host
    } catch {
      return raw.replace(/^https?:\/\//i, '').split('/')[0] || raw
    }
  }

  private isLocalDomain(domain: string): boolean {
    const host = String(domain || '').trim().toLowerCase().split(':')[0] || ''
    return host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0'
  }

  private resolveCheckoutDomain(defaultDomain?: string): string {
    const explicitDomain = this.normalizeDomain((process.env.PAYGATE_CHECKOUT_DOMAIN || '').trim())
    if (explicitDomain) {
      if (!this.isLocalDomain(explicitDomain)) return explicitDomain
      console.warn('[PayGate] Ignoring local PAYGATE_CHECKOUT_DOMAIN for hosted checkout', {
        value: explicitDomain
      })
    }

    const fallback = this.normalizeDomain(String(defaultDomain || '').trim())
    if (fallback && !this.isLocalDomain(fallback)) return fallback

    return 'checkout.paygate.to'
  }

  private resolveWalletEndpointUrl(method: string, useHostedCheckout: boolean): string {
    if (useHostedCheckout) {
      const hostedEndpoint = (process.env.PAYGATE_HOSTED_WALLET_ENDPOINT || '/control/wallet.php').trim()
      return hostedEndpoint.startsWith('/') ? hostedEndpoint : `/${hostedEndpoint}`
    }

    const walletEndpoint = (process.env.PAYGATE_WALLET_ENDPOINT || 'wallet.php').trim().replace(/^\/+/, '')
    return `/crypto/${method}/${walletEndpoint}`
  }

  private resolveProviderSlug(providerCode?: unknown): string | undefined {
    const rawCode = String(providerCode || '').trim().toLowerCase()
    if (!rawCode) return undefined

    const parts = rawCode.split('-').filter(Boolean)
    return parts.length ? parts[parts.length - 1] : rawCode
  }

  private buildHostedCheckoutUrl(
    params: CreatePaymentParams,
    walletSession: PayGateWalletSession
  ): string | undefined {
    if (!this.shouldUseHostedCheckout(params.metadata?.paygateProviderType)) {
      return undefined
    }

    // Hosted checkout must receive a PayGate tokenized address (not raw 0x wallet).
    const addressIn = (walletSession.addressInEncrypted || walletSession.addressIn || '').trim()
    
    if (!addressIn) {
      console.warn('[PayGate] Hosted checkout skipped: address_in not available', {
        orderId: params.orderId,
        providerCode: params.metadata?.paygateProviderCode,
        providerType: params.metadata?.paygateProviderType
      })
      return undefined
    }

    if (!this.looksLikeHostedAddressToken(addressIn)) {
      throw new Error(
        'PayGate hosted checkout requires tokenized address from /control/wallet.php, but received a plain wallet address.'
      )
    }

    // Decode once so URLSearchParams can safely re-encode.
    const decodedAddress = this.safeDecodeHostedAddress(addressIn)

    // Get the right endpoint (pay.php or process-payment.php) based on provider
    const checkoutUrl = this.resolveHostedCheckoutUrl(params.metadata?.paygateProviderCode)
    
    // Use the DECODED address_in for ALL providers (both auto and specific)
    checkoutUrl.searchParams.set('address', decodedAddress)
    checkoutUrl.searchParams.set('amount', this.formatFiatAmount(params.amount))
    
    if (params.customerEmail) {
      checkoutUrl.searchParams.set('email', params.customerEmail)
    }
    
    checkoutUrl.searchParams.set('currency', (params.currency || 'USD').toUpperCase())

    const checkoutDomain = this.resolveCheckoutDomain(checkoutUrl.hostname)
    checkoutUrl.searchParams.set('domain', checkoutDomain)

    const providerSlug = this.resolveProviderSlug(params.metadata?.paygateProviderCode)
    // Use 'auto' if no provider specified
    const finalProvider = providerSlug || 'auto'
    
    // Only add provider if using specific provider (not 'auto')
    if (finalProvider !== 'auto') {
      checkoutUrl.searchParams.set('provider', finalProvider)
    }

    console.log('[PayGate] Hosted checkout URL built successfully', {
      orderId: params.orderId,
      provider: finalProvider,
      endpoint: finalProvider === 'auto' ? 'pay.php' : 'process-payment.php',
      checkoutDomain,
      addressInLength: addressIn.length,
      decodedAddressLength: decodedAddress.length,
      currency: params.currency,
      amount: params.amount,
      addressParam: decodedAddress.substring(0, 20) + '...'
    })

    return checkoutUrl.toString()
  }

  private normalizeMethod(method?: string): string {
    const fallback = process.env.PAYGATE_METHOD?.trim() || 'polygon/usdc'
    const raw = (method || fallback).trim().toLowerCase()

    if (!raw) return fallback

    if (raw.includes('/')) {
      return raw
        .split('/')
        .map((part) => part.trim())
        .filter(Boolean)
        .join('/')
    }

    if (raw.includes('_')) {
      const [chain, token] = raw.split('_')
      if (chain && token) return `${chain}/${token}`
    }

    return raw
  }

  private async convertAmountToGatewayCurrency(
    amount: number,
    currency: string,
    method: string
  ): Promise<number> {
    const upperCurrency = (currency || 'USD').toUpperCase()
    if (upperCurrency === 'USD') return amount

    const convertEndpoint = process.env.PAYGATE_CONVERT_ENDPOINT || 'convert.php'
    const convertUrl = `/crypto/${method}/${convertEndpoint}`
    const conv = await this.client.get(convertUrl, {
      params: { from: upperCurrency, value: String(amount) }
    })

    if (!conv.data?.value_coin) {
      throw new Error(`PayGate conversion failed for currency ${upperCurrency}`)
    }

    return Number(conv.data.value_coin)
  }

  async createWalletSession(params: PayGateCreateWalletParams): Promise<PayGateWalletSession> {
    const cbSecret = process.env.PAYGATE_CALLBACK_SECRET
    if (!cbSecret) throw new Error('PAYGATE_CALLBACK_SECRET missing in .env')

    const callbackBase = getPaymentCallbackBaseUrl()

    const method = this.normalizeMethod(params.method || params.metadata?.paygateMethod)
    const providerTypeHint =
      params.metadata?.paygateProviderType ||
      params.callbackParams?.paygateProviderType ||
      params.callbackParams?.providerType
    const useHostedCheckout =
      typeof params.useHostedCheckout === 'boolean'
        ? params.useHostedCheckout
        : this.shouldUseHostedCheckout(providerTypeHint)

    const gatewayTxnId =
      params.gatewayTxnId ||
      `pg_${String(params.referenceId || 'ref').replace(/[^a-zA-Z0-9_-]/g, '')}_${Date.now()}`

    // callback URL PayGate will hit (GET)
    const callbackUrl = new URL(`${callbackBase}/paygate`)
    callbackUrl.searchParams.set('gatewayTxnId', gatewayTxnId)
    callbackUrl.searchParams.set('number', String(params.referenceId))
    callbackUrl.searchParams.set('cb_secret', cbSecret)

    if (params.callbackParams) {
      Object.entries(params.callbackParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          callbackUrl.searchParams.set(key, String(value))
        }
      })
    }

    // ---- STEP 1: wallet.php (GET request) ----
    // Hosted checkout uses /control/wallet.php (tokenized address).
    // Direct crypto payment uses /crypto/{method}/wallet.php (plain address).
    const walletEndpointUrl = this.resolveWalletEndpointUrl(method, useHostedCheckout)

    const walletParams = {
      address: this.walletAddress,
      callback: callbackUrl.toString()
    }

    console.log('[PayGate] wallet.php GET', {
      url: `${this.client.defaults.baseURL}${walletEndpointUrl}`,
        mode: useHostedCheckout ? 'hosted' : 'direct-crypto',
      params: {
        ...walletParams,
        callback: callbackUrl.toString().replace(/cb_secret=[^&]+/, 'cb_secret=***')
      }
    })

    let walletResp
    try {
      walletResp = await this.client.get<PayGateWalletResponse>(walletEndpointUrl, {
        params: walletParams,
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/json'
        }
      })
    } catch (e: any) {
      const errorData = e.response?.data
      const errorStatus = e.response?.status
      const errorMessage = e.response?.statusText || e.message
      
      console.error('[PayGate] wallet.php error', {
        status: errorStatus,
        statusText: errorMessage,
        message: errorData?.message || errorData?.error || 'Unknown error',
        data: errorData,
        requestedWallet: this.walletAddress,
        method: method,
        endpoint: walletEndpointUrl
      })
      
      throw new Error(
        `PayGate wallet.php failed: ${errorStatus} ${errorMessage}. ` +
        `Message: ${errorData?.message || errorData?.error || 'Check logs for details'}`
      )
    }

    const root = walletResp.data || {}
    const nested =
      root?.data && typeof root.data === 'object' && !Array.isArray(root.data)
        ? root.data
        : undefined

    // Extract IPN token (required for callback identification)
    const ipnToken = nested?.ipn_token || root?.ipn_token

    const encryptedCandidates = [
      nested?.address_in_encrypted,
      nested?.polygon_address_in_encrypted,
      nested?.address_encrypted,
      nested?.encrypted_address,
      nested?.wallet_address_encrypted,
      root?.address_in_encrypted,
      root?.polygon_address_in_encrypted,
      root?.address_encrypted,
      root?.encrypted_address,
      root?.wallet_address_encrypted,
      nested?.address_in,
      root?.address_in
    ]
      .map((item) => String(item || '').trim())
      .filter(Boolean)

    const plainCandidates = [
      nested?.polygon_address_in,
      root?.polygon_address_in,
      nested?.address_in,
      root?.address_in
    ]
      .map((item) => String(item || '').trim())
      .filter(Boolean)

    const addressInEncrypted = encryptedCandidates.find((value) => this.looksLikeHostedAddressToken(value))
    const callbackAddressIn = plainCandidates.find((value) => this.looksLikeHexAddress(value))
    const fallbackAddress = plainCandidates[0] || encryptedCandidates[0] || ''
    const addressIn = callbackAddressIn || fallbackAddress

    console.log('[PayGate] wallet.php response extracted', {
      hasIpnToken: !!ipnToken,
      hasAddressIn: !!addressIn,
      hasAddressInEncrypted: !!addressInEncrypted,
      mode: useHostedCheckout ? 'hosted' : 'direct-crypto',
      ipnTokenLength: ipnToken?.length || 0,
      addressInLength: addressIn?.length || 0,
      fullResponse: root
    })

    if (!ipnToken || !addressIn) {
      throw new Error(
        `PayGate wallet.php response missing required fields. ` +
          `ipnToken: ${!!ipnToken}, addressIn: ${!!addressIn}. ` +
          `Response: ${JSON.stringify(root)}`
      )
    }

    if (useHostedCheckout && !addressInEncrypted) {
      throw new Error(
        `PayGate hosted wallet response did not contain tokenized address. ` +
          `Endpoint: ${walletEndpointUrl}. Ensure /control/wallet.php is used.`
      )
    }

    const amountCoin = await this.convertAmountToGatewayCurrency(
      params.amount,
      params.currency || 'USD',
      method
    )

    return {
      gatewayTxnId,
      ipnToken,
      addressIn,
      addressInEncrypted,
      callbackAddressIn,
      method,
      amountCoin,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      callbackUrl: callbackUrl.toString()
    }
  }

  async createPayment(params: CreatePaymentParams): Promise<PaymentResponse> {
    const isSubscription =
      params.metadata?.type === 'SUBSCRIPTION_PURCHASE' ||
      params.metadata?.type === 'SUBSCRIPTION_RENEWAL'

    const gatewayTxnId = isSubscription ? `pg_sub_${params.orderId}` : `pg_order_${params.orderId}`

    const walletSession = await this.createWalletSession({
      referenceId: String(params.orderId),
      gatewayTxnId,
      amount: params.amount,
      currency: params.currency,
      method: params.metadata?.paygateMethod,
      useHostedCheckout: this.shouldUseHostedCheckout(params.metadata?.paygateProviderType),
      callbackParams: {
        paygateProviderCode: params.metadata?.paygateProviderCode,
        paygateProviderType: params.metadata?.paygateProviderType
      },
      metadata: params.metadata
    })

    const hostedCheckoutUrl = this.buildHostedCheckoutUrl(params, walletSession)

    // ---- STEP 2: Return Payment Instructions ----
    return {
      success: true,
      gatewayTxnId: walletSession.gatewayTxnId,
      paymentUrl: hostedCheckoutUrl,
      address: walletSession.addressIn,
      expiresAt: walletSession.expiresAt,
      metadata: {
        ipn_token: walletSession.ipnToken,
        address_in: walletSession.callbackAddressIn || walletSession.addressIn,
        polygon_address_in: walletSession.callbackAddressIn || walletSession.addressIn,
        address_in_encrypted: walletSession.addressInEncrypted,
        amount: walletSession.amountCoin,
        coin: walletSession.method,
        gateway: 'paygate',
        hostedCheckoutUrl,
        paygateProviderCode: params.metadata?.paygateProviderCode,
        paygateProviderType: params.metadata?.paygateProviderType
      }
    }
  }

  async verifyWebhook(payload: any, secret?: string): Promise<WebhookVerificationResult> {
    const expected = process.env.PAYGATE_CALLBACK_SECRET || ''
    const received = String(secret || payload?.cb_secret || '')
    if (expected && expected !== received) {
      return { verified: false, error: 'Invalid PayGate callback secret' }
    }

    const gatewayTxnId = String(payload?.gatewayTxnId || '')
    if (!gatewayTxnId) return { verified: false, error: 'Missing gatewayTxnId in callback' }

    const orderId = payload?.number ? parseInt(String(payload.number), 10) : undefined
    const paidAmount = payload?.value_coin ? Number(payload.value_coin) : undefined

    return {
      verified: true,
      event: payload,
      eventType: 'paygate.callback',
      paymentData: {
        gatewayTxnId,
        orderId,
        amount: paidAmount || 0,
        paidAmount,
        currency: String(payload?.coin || 'polygon_usdc').toLowerCase(),
        status: PaymentStatus.COMPLETED,
        metadata: { gatewayStatus: 'paid', ...payload }
      }
    }
  }

  async getPaymentStatus(): Promise<PaymentStatusResponse> {
    return {
      status: PaymentStatus.PENDING,
      gatewayStatus: 'unknown',
      amount: 0,
      paidAmount: 0,
      currency: 'polygon_usdc',
      metadata: { note: 'Use PayGate callback event to update payment.' }
    }
  }

  async refundPayment(): Promise<RefundResponse> {
    return { success: false, refundId: '', amount: 0, status: 'failed', error: 'Not supported' }
  }
}
