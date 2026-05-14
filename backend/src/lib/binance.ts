/**
 * Binance Transfer History Verification Service
 * Uses Playwright to fetch Binance transfer history and verify Order IDs
 */

import { chromium } from 'playwright'
import type { Browser, BrowserContext, Page } from 'playwright'
import db from '../configs/db'

interface BinanceTransfer {
  orderId: string
  amount: number
  currency: string
  toLabel: string
  date: Date
}

interface BinanceSessionData {
  cookies: any[]
  email?: string
  isValid: boolean
  expiresAt?: Date
}

/**
 * Get Binance session cookies from database
 */
async function getBinanceSession(): Promise<BinanceSessionData | null> {
  const session = await db.binanceSession.findUnique({
    where: { sessionId: 'default' }
  })

  if (!session || !session.isValid) {
    return null
  }

  return {
    cookies: session.cookies as any[],
    email: session.email || undefined,
    isValid: session.isValid,
    expiresAt: session.expiresAt || undefined
  }
}

/**
 * Save Binance session cookies to database
 */
async function saveBinanceSession(cookies: any[], email?: string): Promise<void> {
  await db.binanceSession.upsert({
    where: { sessionId: 'default' },
    create: {
      sessionId: 'default',
      cookies: cookies as any,
      email: email,
      isValid: true,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    },
    update: {
      cookies: cookies as any,
      email: email,
      isValid: true,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      updatedAt: new Date()
    }
  })
}

/**
 * Create a browser context with saved cookies
 */
async function createBinanceContext(): Promise<{ browser: Browser; context: BrowserContext; page: Page }> {
  const session = await getBinanceSession()

  if (!session) {
    throw new Error('NO_SESSION_COOKIES: Binance session not found. Please run bootstrap login first.')
  }

  // For automated verification, use headless mode by default (faster, no UI)
  // But allow override via environment variable
  // Increase timeout and add more launch options for better compatibility
  const browser = await chromium.launch({
    headless: process.env.BINANCE_HEADLESS !== 'false', // Default to headless unless explicitly disabled
    timeout: 60000, // Increased to 60 seconds for slower systems
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled'
    ]
  })

  const context = await browser.newContext({
    userAgent: process.env.BINANCE_USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
    storageState: {
      cookies: session.cookies as any[],
      origins: [] as any[]
    } as any
  })

  const page = await context.newPage()

  return { browser, context, page }
}

/**
 * Check if session is expired (redirected to login page)
 */
function isSessionExpired(url: string): boolean {
  return url.includes('/login') || url.includes('/signin') || url.includes('/account/login')
}

/**
 * Find a transfer by exact Order ID in Binance transfer history
 * Returns transfer details if found, null otherwise
 */
export async function findTransferByOrderId(orderId: string): Promise<BinanceTransfer | null> {
  const { browser, page } = await createBinanceContext()

  try {
    // Navigate to Binance internal transfer history
    // Note: URL may change if Binance updates their UI
    await page.goto('https://www.binance.com/en/my/wallet/history/transfer', {
      waitUntil: 'networkidle',
      timeout: 30000
    })

    // Check if session expired
    if (isSessionExpired(page.url())) {
      await browser.close()
      throw new Error('SESSION_EXPIRED: Binance session expired. Please run bootstrap login again.')
    }

    // Wait for transfer history table to load
    await page.waitForTimeout(2000)

    // Try multiple selector strategies as Binance UI changes frequently
    // These selectors need to be verified using Playwright Inspector
    const selectors = [
      '[data-testid="history-row"]',
      '.history-row',
      'tr[data-row-key]',
      'tbody tr',
      '.transfer-row'
    ]

    let rows: any[] = []
    for (const selector of selectors) {
      try {
        rows = await page.$$(selector)
        if (rows.length > 0) break
      } catch (e) {
        continue
      }
    }

    if (rows.length === 0) {
      console.warn('[Binance] No transfer rows found. Selectors may need updating.')
      console.log('[Binance] Page URL:', page.url())
      console.log('[Binance] Page title:', await page.title())
      // Take a screenshot for debugging
      try {
        await page.screenshot({ path: 'binance-debug-no-rows.png', fullPage: true })
        console.log('[Binance] Screenshot saved: binance-debug-no-rows.png')
      } catch (e) {
        console.error('[Binance] Failed to take screenshot:', e)
      }
      await browser.close()
      return null
    }

    console.log(`[Binance] Found ${rows.length} transfer rows to search`)

    // Parse each row to find matching Order ID
    console.log(`[Binance] 🔎 Parsing ${rows.length} rows to find Order ID...`)
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      try {
        // Try multiple ways to extract Order ID
        const orderIdSelectors = [
          '[data-col="orderId"]',
          '.order-id',
          '[data-testid="order-id"]',
          'td:nth-child(1)',
          'td:first-child',
          'td[data-col="orderId"]',
          '[data-testid*="order"]',
          '.transfer-order-id'
        ]

        let foundOrderId: string | null = null
        for (const selector of orderIdSelectors) {
          try {
            const element = await row.$(selector)
            if (element) {
              foundOrderId = (await element.textContent())?.trim() || null
              if (foundOrderId) {
                console.log(`[Binance] Found Order ID using selector "${selector}": ${foundOrderId}`)
                break
              }
            }
          } catch (e) {
            continue
          }
        }

        // If no selector worked, try getting all text and finding order ID pattern
        if (!foundOrderId) {
          const rowText = await row.textContent()
          if (rowText) {
            // Try to find order ID pattern (10-20 digits)
            const orderIdMatch = rowText.match(/\b\d{10,20}\b/)
            foundOrderId = orderIdMatch ? orderIdMatch[0] : null
            if (foundOrderId) {
              console.log(`[Binance] Found Order ID via text pattern: ${foundOrderId}`)
            }
          }
        }

        if (!foundOrderId) {
          if (i < 3) {
            // Log first few rows for debugging
            const rowText = await row.textContent()
            console.log(`[Binance] Row ${i + 1} text (first 200 chars):`, rowText?.substring(0, 200))
          }
          continue
        }

        console.log(`[Binance] 🔍 Row ${i + 1}: Found Order ID "${foundOrderId}", looking for "${orderId}"`)

        // Normalize order IDs (remove spaces, compare as strings)
        const normalizedFound = foundOrderId.replace(/\s/g, '').trim()
        const normalizedTarget = orderId.replace(/\s/g, '').trim()

        if (normalizedFound !== normalizedTarget) {
          continue
        }

        console.log(`[Binance] ✅ Order ID match found in row ${i + 1}!`)

        // Found matching Order ID, extract amount, currency, and recipient
        const rowText = await row.textContent() || ''

        // Extract amount (look for numbers with currency symbols or codes)
        const amountMatch = rowText.match(/(\d+\.?\d*)\s*(USDT|USD|EUR|BTC|BNB|ETH)/i)
        const amount = amountMatch ? parseFloat(amountMatch[1]) : 0
        const currency = amountMatch ? amountMatch[2].toUpperCase() : 'USDT'

        // Extract recipient (Pay ID or email)
        const recipientSelectors = [
          '[data-col="to"]',
          '.recipient',
          '[data-testid="recipient"]',
          'td:nth-child(3)',
          'td:nth-child(4)'
        ]

        let toLabel = ''
        for (const selector of recipientSelectors) {
          try {
            const element = await row.$(selector)
            if (element) {
              toLabel = (await element.textContent())?.trim() || ''
              if (toLabel) break
            }
          } catch (e) {
            continue
          }
        }

        // Extract date if available
        const dateSelectors = [
          '[data-col="date"]',
          '.date',
          '[data-testid="date"]',
          'td:last-child'
        ]

        let date = new Date()
        for (const selector of dateSelectors) {
          try {
            const element = await row.$(selector)
            if (element) {
              const dateText = await element.textContent()
              if (dateText) {
                const parsedDate = new Date(dateText.trim())
                if (!isNaN(parsedDate.getTime())) {
                  date = parsedDate
                  break
                }
              }
            }
          } catch (e) {
            continue
          }
        }

        await browser.close()

        return {
          orderId: foundOrderId,
          amount,
          currency,
          toLabel,
          date
        }
      } catch (e) {
        console.error('[Binance] Error parsing row:', e)
        continue
      }
    }

    console.log(`[Binance] Order ID ${orderId} not found in ${rows.length} rows`)
    
    // Take a screenshot for debugging
    try {
      await page.screenshot({ path: 'binance-debug-not-found.png', fullPage: true })
      console.log('[Binance] Screenshot saved: binance-debug-not-found.png')
      
      // Also log the page HTML structure for debugging
      const pageContent = await page.content()
      console.log('[Binance] Page HTML length:', pageContent.length)
      console.log('[Binance] First 1000 chars of HTML:', pageContent.substring(0, 1000))
    } catch (e) {
      console.error('[Binance] Failed to take screenshot:', e)
    }

    await browser.close()
    return null
  } catch (error: any) {
    await browser.close()
    console.error('[Binance] Error in findTransferByOrderId:', error)
    if (error.message.includes('SESSION_EXPIRED') || error.message.includes('NO_SESSION_COOKIES')) {
      throw error
    }
    throw new Error(`Failed to fetch Binance transfer history: ${error.message}`)
  }
}

/**
 * Verify Binance Order ID exists and matches expected details
 */
export async function verifyBinanceTransfer(
  orderId: string,
  expectedAmount: number,
  expectedPayId?: string
): Promise<{
  verified: boolean
  transfer?: BinanceTransfer
  error?: string
}> {
  try {
    const transfer = await findTransferByOrderId(orderId)

    if (!transfer) {
      return {
        verified: false,
        error: 'ORDER_NOT_FOUND'
      }
    }

    // Verify amount matches (within 0.0001 tolerance for floating point)
    const amountMatches = Math.abs(transfer.amount - expectedAmount) < 0.0001
    if (!amountMatches) {
      return {
        verified: false,
        transfer,
        error: 'AMOUNT_MISMATCH'
      }
    }

    // Verify recipient Pay ID if provided
    if (expectedPayId) {
      const recipientMatches = transfer.toLabel.includes(expectedPayId)
      if (!recipientMatches) {
        return {
          verified: false,
          transfer,
          error: 'RECIPIENT_MISMATCH'
        }
      }
    }

    return {
      verified: true,
      transfer
    }
  } catch (error: any) {
    return {
      verified: false,
      error: error.message || 'VERIFICATION_FAILED'
    }
  }
}

/**
 * Save Binance session (used by bootstrap script)
 */
export async function saveSession(cookies: any[], email?: string): Promise<void> {
  await saveBinanceSession(cookies, email)
}

/**
 * Check if Binance session exists and is valid
 */
export async function hasValidSession(): Promise<boolean> {
  const session = await getBinanceSession()
  return session !== null && session.isValid
}

