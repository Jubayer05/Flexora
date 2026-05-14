import { cacheService } from '../cache.service'

export interface TelegramCodeSecurityState {
  accountSendsToday: number
  phoneSendsToday: number
  remainingAccountSends: number
  remainingPhoneSends: number
  cooldownSeconds: number
  blockedUntil: string | null
  isBlocked: boolean
}

export interface TelegramCodeSecurityResult {
  success: boolean
  error?: string
  timeoutSeconds?: number
  state: TelegramCodeSecurityState
}

export interface TelegramCodeSecurityConfig {
  perAccountDailyLimit: number
  perPhoneDailyLimit: number
  resendCooldownSeconds: number
  blockDurationHours: number
}

const DAY_SECONDS = 24 * 60 * 60
const HOUR_SECONDS = 60 * 60

export class TelegramCustomerCodeSecurityService {
  private readonly perAccountDailyLimit = 5
  private readonly perPhoneDailyLimit = 10
  private readonly resendCooldownSeconds = 60
  private readonly blockDurationHours = 24

  getConfig(): TelegramCodeSecurityConfig {
    return {
      perAccountDailyLimit: this.perAccountDailyLimit,
      perPhoneDailyLimit: this.perPhoneDailyLimit,
      resendCooldownSeconds: this.resendCooldownSeconds,
      blockDurationHours: this.blockDurationHours
    }
  }

  async checkBeforeSend(
    phoneNumber: string,
    orderId: number,
    customerId: number
  ): Promise<TelegramCodeSecurityResult> {
    const { accountEvents, phoneEvents, cooldownUntil, blockedUntilMs } =
      await this.getCurrentMetrics(phoneNumber, orderId, customerId)

    const now = Date.now()

    if (blockedUntilMs > now) {
      return {
        success: false,
        error: `Daily send limit reached. Please try again after ${new Date(blockedUntilMs).toLocaleString()}.`,
        timeoutSeconds: Math.ceil((blockedUntilMs - now) / 1000),
        state: this.buildState(accountEvents.length, phoneEvents.length, cooldownUntil, blockedUntilMs)
      }
    }

    if (accountEvents.length >= this.perAccountDailyLimit) {
      const until = now + this.blockDurationHours * HOUR_SECONDS * 1000
      await this.setTimestamp(
        this.buildAccountBlockKey(orderId, customerId),
        until,
        this.blockDurationHours * HOUR_SECONDS
      )

      return {
        success: false,
        error: `You can request code delivery only ${this.perAccountDailyLimit} times per account each day. Further sends are blocked for 24 hours.`,
        timeoutSeconds: this.blockDurationHours * HOUR_SECONDS,
        state: this.buildState(accountEvents.length, phoneEvents.length, cooldownUntil, until)
      }
    }

    if (phoneEvents.length >= this.perPhoneDailyLimit) {
      const until = now + this.blockDurationHours * HOUR_SECONDS * 1000
      await this.setTimestamp(
        this.buildPhoneBlockKey(phoneNumber),
        until,
        this.blockDurationHours * HOUR_SECONDS
      )

      return {
        success: false,
        error: `You can send only ${this.perPhoneDailyLimit} OTP requests to this number per day. Further sends are blocked for 24 hours.`,
        timeoutSeconds: this.blockDurationHours * HOUR_SECONDS,
        state: this.buildState(accountEvents.length, phoneEvents.length, cooldownUntil, until)
      }
    }

    if (cooldownUntil > now) {
      return {
        success: false,
        error: `Please wait ${Math.ceil((cooldownUntil - now) / 1000)} seconds before requesting a new code.`,
        timeoutSeconds: Math.ceil((cooldownUntil - now) / 1000),
        state: this.buildState(accountEvents.length, phoneEvents.length, cooldownUntil, null)
      }
    }

    return {
      success: true,
      state: this.buildState(accountEvents.length, phoneEvents.length, cooldownUntil, null)
    }
  }

  async getCurrentState(
    phoneNumber: string,
    orderId: number,
    customerId: number
  ): Promise<TelegramCodeSecurityState> {
    const { accountEvents, phoneEvents, cooldownUntil, blockedUntilMs } =
      await this.getCurrentMetrics(phoneNumber, orderId, customerId)

    return this.buildState(accountEvents.length, phoneEvents.length, cooldownUntil, blockedUntilMs)
  }

  async recordSuccessfulSend(
    phoneNumber: string,
    orderId: number,
    customerId: number
  ): Promise<TelegramCodeSecurityState> {
    const now = Date.now()
    const accountKey = this.buildAccountEventsKey(orderId, customerId)
    const phoneKey = this.buildPhoneEventsKey(phoneNumber)

    const [accountEvents, phoneEvents] = await Promise.all([
      this.getRecentEvents(accountKey),
      this.getRecentEvents(phoneKey)
    ])

    const updatedAccountEvents = [...accountEvents, now]
    const updatedPhoneEvents = [...phoneEvents, now]
    const cooldownUntil = now + this.resendCooldownSeconds * 1000

    await Promise.all([
      cacheService.set(accountKey, updatedAccountEvents, DAY_SECONDS),
      cacheService.set(phoneKey, updatedPhoneEvents, DAY_SECONDS),
      this.setTimestamp(
        this.buildCooldownKey(orderId, customerId),
        cooldownUntil,
        this.resendCooldownSeconds
      )
    ])

    return this.buildState(
      updatedAccountEvents.length,
      updatedPhoneEvents.length,
      cooldownUntil,
      null
    )
  }

  private async getRecentEvents(key: string): Promise<number[]> {
    const raw = (await cacheService.get<number[]>(key)) || []
    const cutoff = Date.now() - DAY_SECONDS * 1000
    return raw.filter((timestamp) => typeof timestamp === 'number' && timestamp >= cutoff)
  }

  private async getCurrentMetrics(phoneNumber: string, orderId: number, customerId: number) {
    const [accountEvents, phoneEvents, cooldownUntil, accountBlockUntil, phoneBlockUntil] =
      await Promise.all([
        this.getRecentEvents(this.buildAccountEventsKey(orderId, customerId)),
        this.getRecentEvents(this.buildPhoneEventsKey(phoneNumber)),
        this.getTimestamp(this.buildCooldownKey(orderId, customerId)),
        this.getTimestamp(this.buildAccountBlockKey(orderId, customerId)),
        this.getTimestamp(this.buildPhoneBlockKey(phoneNumber))
      ])

    return {
      accountEvents,
      phoneEvents,
      cooldownUntil,
      blockedUntilMs: Math.max(accountBlockUntil || 0, phoneBlockUntil || 0)
    }
  }

  private async getTimestamp(key: string): Promise<number> {
    const value = await cacheService.get<number>(key)
    return typeof value === 'number' ? value : 0
  }

  private async setTimestamp(key: string, timestamp: number, ttlSeconds: number): Promise<void> {
    await cacheService.set(key, timestamp, ttlSeconds)
  }

  private buildState(
    accountSendsToday: number,
    phoneSendsToday: number,
    cooldownUntil: number,
    blockedUntil: number | null
  ): TelegramCodeSecurityState {
    const now = Date.now()

    return {
      accountSendsToday,
      phoneSendsToday,
      remainingAccountSends: Math.max(0, this.perAccountDailyLimit - accountSendsToday),
      remainingPhoneSends: Math.max(0, this.perPhoneDailyLimit - phoneSendsToday),
      cooldownSeconds: cooldownUntil > now ? Math.ceil((cooldownUntil - now) / 1000) : 0,
      blockedUntil: blockedUntil && blockedUntil > now ? new Date(blockedUntil).toISOString() : null,
      isBlocked: Boolean(blockedUntil && blockedUntil > now)
    }
  }

  private buildAccountEventsKey(orderId: number, customerId: number): string {
    return `uhq:telegram:code:account:${customerId}:${orderId}:events`
  }

  private buildPhoneEventsKey(phoneNumber: string): string {
    return `uhq:telegram:code:phone:${phoneNumber}:events`
  }

  private buildCooldownKey(orderId: number, customerId: number): string {
    return `uhq:telegram:code:cooldown:${customerId}:${orderId}`
  }

  private buildAccountBlockKey(orderId: number, customerId: number): string {
    return `uhq:telegram:code:block:account:${customerId}:${orderId}`
  }

  private buildPhoneBlockKey(phoneNumber: string): string {
    return `uhq:telegram:code:block:phone:${phoneNumber}`
  }
}

export const telegramCustomerCodeSecurityService = new TelegramCustomerCodeSecurityService()
