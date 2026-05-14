/**
 * Telegram Flood Wait Handler
 * Handles rate limiting and flood wait errors from Telegram API
 * Implements exponential backoff and human-like behavior simulation
 */

import { FloodWaitError } from 'telegram/errors';

// ================================
// TYPES
// ================================

export interface FloodWaitConfig {
  maxRetries: number;
  baseDelay: number; // Base delay in ms
  maxDelay: number; // Maximum delay in ms
  jitterFactor: number; // Random jitter factor (0-1)
}

export interface FloodWaitResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  retriesUsed: number;
  totalWaitTime: number;
}

export interface RateLimitState {
  lastRequestTime: number;
  requestCount: number;
  isBlocked: boolean;
  blockUntil: number;
}

// ================================
// DEFAULT CONFIGURATION
// ================================

const DEFAULT_CONFIG: FloodWaitConfig = {
  maxRetries: 5,
  baseDelay: 1000, // 1 second
  maxDelay: 300000, // 5 minutes max
  jitterFactor: 0.3, // 30% random jitter
};

// Rate limit tracking per phone number
const rateLimitStates: Map<string, RateLimitState> = new Map();

// ================================
// FLOOD WAIT HANDLER CLASS
// ================================

export class TelegramFloodHandler {
  private config: FloodWaitConfig;

  constructor(config: Partial<FloodWaitConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Execute an operation with flood wait handling
   * Automatically retries on flood errors with exponential backoff
   */
  async executeWithFloodHandling<T>(
    operation: () => Promise<T>,
    identifier: string = 'default'
  ): Promise<FloodWaitResult<T>> {
    let retries = 0;
    let totalWaitTime = 0;

    // Check if we're currently rate limited
    const state = rateLimitStates.get(identifier);
    if (state?.isBlocked && Date.now() < state.blockUntil) {
      const waitTime = state.blockUntil - Date.now();
      console.log(`⏳ [FloodHandler] ${identifier} is blocked. Waiting ${waitTime}ms...`);
      await this.sleep(waitTime);
      totalWaitTime += waitTime;
    }

    while (retries < this.config.maxRetries) {
      try {
        // Add human-like delay before request
        if (retries > 0) {
          const humanDelay = this.getHumanLikeDelay(retries);
          console.log(`⏳ [FloodHandler] Human-like delay: ${humanDelay}ms`);
          await this.sleep(humanDelay);
          totalWaitTime += humanDelay;
        }

        // Execute the operation
        const result = await operation();

        // Update rate limit state on success
        this.updateRateLimitState(identifier, false);

        return {
          success: true,
          data: result,
          retriesUsed: retries,
          totalWaitTime,
        };
      } catch (error: any) {
        // Handle Telegram FloodWait error
        if (error instanceof FloodWaitError || error.errorMessage?.includes('FLOOD_WAIT')) {
          const waitSeconds = error.seconds || this.extractFloodWaitSeconds(error.message) || 30;
          const waitMs = waitSeconds * 1000;

          console.warn(
            `⚠️ [FloodHandler] FLOOD_WAIT received for ${identifier}. ` +
              `Waiting ${waitSeconds} seconds (attempt ${retries + 1}/${this.config.maxRetries})`
          );

          // Update rate limit state
          this.updateRateLimitState(identifier, true, waitMs);

          // Wait for the required time
          const adjustedWait = Math.min(waitMs, this.config.maxDelay);
          await this.sleep(adjustedWait);
          totalWaitTime += adjustedWait;

          retries++;
          continue;
        }

        // Handle other rate limit errors
        if (
          error.errorMessage?.includes('Too many requests') ||
          error.code === 429 ||
          error.message?.includes('PEER_FLOOD')
        ) {
          const backoffMs = this.calculateExponentialBackoff(retries);

          console.warn(
            `⚠️ [FloodHandler] Rate limit error for ${identifier}. ` +
              `Backing off ${backoffMs}ms (attempt ${retries + 1}/${this.config.maxRetries})`
          );

          await this.sleep(backoffMs);
          totalWaitTime += backoffMs;

          retries++;
          continue;
        }

        // Non-flood error, throw immediately
        throw error;
      }
    }

    // Max retries exceeded
    return {
      success: false,
      error: `Max retries (${this.config.maxRetries}) exceeded due to rate limiting`,
      retriesUsed: retries,
      totalWaitTime,
    };
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateExponentialBackoff(attempt: number): number {
    const exponentialDelay = this.config.baseDelay * Math.pow(2, attempt);
    const jitter = exponentialDelay * this.config.jitterFactor * Math.random();
    const delay = Math.min(exponentialDelay + jitter, this.config.maxDelay);
    return Math.floor(delay);
  }

  /**
   * Get human-like delay to avoid detection
   * Simulates natural user behavior with random delays
   */
  private getHumanLikeDelay(attempt: number): number {
    // Base delays that mimic human behavior
    const baseDelays = [1000, 2000, 3000, 5000, 8000, 13000]; // Fibonacci-like
    const baseDelay = baseDelays[Math.min(attempt, baseDelays.length - 1)] ?? 1000;

    // Add random jitter (0.5x to 1.5x base delay)
    const jitterMultiplier = 0.5 + Math.random();
    const delay = baseDelay * jitterMultiplier;

    // Add occasional longer pauses to seem more natural
    if (Math.random() < 0.1) {
      // 10% chance of longer pause
      return Math.floor(delay * 2);
    }

    return Math.floor(delay);
  }

  /**
   * Extract flood wait seconds from error message
   */
  private extractFloodWaitSeconds(message: string): number | null {
    const match = message?.match(/FLOOD_WAIT_(\d+)/);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
    return null;
  }

  /**
   * Update rate limit state for an identifier
   */
  private updateRateLimitState(
    identifier: string,
    isBlocked: boolean,
    blockDuration: number = 0
  ): void {
    const state = rateLimitStates.get(identifier) || {
      lastRequestTime: 0,
      requestCount: 0,
      isBlocked: false,
      blockUntil: 0,
    };

    state.lastRequestTime = Date.now();
    state.requestCount++;
    state.isBlocked = isBlocked;

    if (isBlocked && blockDuration > 0) {
      state.blockUntil = Date.now() + blockDuration;
    } else if (!isBlocked) {
      state.blockUntil = 0;
    }

    rateLimitStates.set(identifier, state);
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Check if identifier is currently rate limited
   */
  isRateLimited(identifier: string): boolean {
    const state = rateLimitStates.get(identifier);
    return Boolean(state?.isBlocked && Date.now() < (state.blockUntil || 0));
  }

  /**
   * Get remaining wait time for rate limited identifier
   */
  getRemainingWaitTime(identifier: string): number {
    const state = rateLimitStates.get(identifier);
    if (!state?.isBlocked || Date.now() >= state.blockUntil) {
      return 0;
    }
    return state.blockUntil - Date.now();
  }

  /**
   * Clear rate limit state for identifier
   */
  clearRateLimitState(identifier: string): void {
    rateLimitStates.delete(identifier);
  }

  /**
   * Get all rate limit states (for monitoring)
   */
  getAllRateLimitStates(): Map<string, RateLimitState> {
    return new Map(rateLimitStates);
  }
}

// ================================
// SINGLETON EXPORT
// ================================

export const telegramFloodHandler = new TelegramFloodHandler();

// ================================
// HELPER FUNCTIONS
// ================================

/**
 * Wrapper function for easy flood-safe execution
 */
export async function withFloodProtection<T>(
  operation: () => Promise<T>,
  identifier?: string
): Promise<T> {
  const result = await telegramFloodHandler.executeWithFloodHandling(operation, identifier);

  if (!result.success) {
    throw new Error(result.error);
  }

  return result.data as T;
}

/**
 * Smart delay between operations to avoid rate limits
 * Use this between consecutive Telegram API calls
 */
export async function smartDelay(minMs: number = 500, maxMs: number = 2000): Promise<void> {
  const delay = Math.floor(minMs + Math.random() * (maxMs - minMs));
  return new Promise((resolve) => setTimeout(resolve, delay));
}
