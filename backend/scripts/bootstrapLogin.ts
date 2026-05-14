/**
 * Binance Bootstrap Login Script
 * One-time manual login to save cookies for automated verification
 * 
 * Usage: bun run bootstrap:binance
 * 
 * This script:
 * 1. Opens Binance login page
 * 2. Logs in with email + password + TOTP
 * 3. Saves cookies to database
 * 4. Can be re-run if session expires
 */

import { chromium } from 'playwright'
import { authenticator } from 'otplib'
import db from '../src/configs/db'
import { saveSession } from '../src/lib/binance'

// Load environment variables
import dotenv from 'dotenv'
dotenv.config()

async function bootstrapBinanceLogin() {
  const email = process.env.BINANCE_EMAIL
  const password = process.env.BINANCE_PASSWORD
  const totpSecret = process.env.BINANCE_TOTP_SECRET

  if (!email || !password || !totpSecret) {
    console.error('❌ Missing required environment variables:')
    console.error('   BINANCE_EMAIL, BINANCE_PASSWORD, BINANCE_TOTP_SECRET')
    console.error('\nPlease add these to your .env file')
    process.exit(1)
  }

  console.log('🚀 Starting Binance bootstrap login...')
  console.log(`📧 Email: ${email}`)
  console.log('🔐 Password: [HIDDEN]')
  console.log('⏱️  TOTP Secret: [HIDDEN]')
  console.log('\n⚠️  This will open a browser window. Please complete the login process.\n')
  console.log('⏳ Launching browser (this may take a moment)...')
  console.log('💡 Tip: If this times out, try closing other browser windows or temporarily disabling antivirus\n')

  let browser: any = null

  try {
    // Try launching with minimal flags first (more compatible)
    console.log('🔧 Attempting to launch browser...')
    
    // First, try to use system Chrome if available (most stable)
    let launchOptions: any = {
      headless: false,
      timeout: 300000, // 5 minute timeout for very slow systems
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security', // May help with some issues
        '--disable-features=IsolateOrigins,site-per-process'
      ]
    }
    
    // Try to use system Chrome first (chrome, msedge, chromium)
    const channels = ['chrome', 'msedge', 'chromium']
    let launched = false
    
    for (const channel of channels) {
      try {
        console.log(`   Trying ${channel}...`)
        browser = await chromium.launch({
          ...launchOptions,
          channel: channel as any
        })
        console.log(`✅ Successfully launched ${channel}`)
        launched = true
        break
      } catch (err: any) {
        console.log(`   ${channel} not available, trying next...`)
        continue
      }
    }
    
    // If system browsers failed, use bundled Chromium
    if (!launched) {
      console.log('   Using bundled Chromium...')
      browser = await chromium.launch(launchOptions)
    }
    
    console.log('✅ Browser launched successfully')
    
    const context = await browser.newContext({
      viewport: null, // Use full screen
      userAgent:
        process.env.BINANCE_USER_AGENT ||
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    })
    
    const page = await context.newPage()

    // Navigate to Binance login page
    console.log('📱 Opening Binance login page...')
    await page.goto('https://accounts.binance.com/en/login', {
      waitUntil: 'networkidle',
      timeout: 60000 // Increased timeout for slow connections
    })

    // Fill email
    console.log('✍️  Entering email...')
    await page.fill('input[type="email"], input[name="email"], input[placeholder*="email" i]', email)

    // Fill password
    console.log('✍️  Entering password...')
    await page.fill('input[type="password"], input[name="password"]', password)

    // Click submit/login button
    console.log('🔘 Clicking login button...')
    await page.click('button[type="submit"], button:has-text("Log In"), button:has-text("Login")')

    // Wait for TOTP input (may take a moment)
    console.log('⏳ Waiting for TOTP input...')
    await page.waitForSelector(
      'input[name="googleAuthCode"], input[name="totp"], input[placeholder*="code" i], input[type="text"][maxlength="6"]',
      { timeout: 60000 }
    )

    // Generate TOTP code
    const totpCode = authenticator.generate(totpSecret)
    console.log(`🔑 Generated TOTP code: ${totpCode}`)

    // Fill TOTP code
    console.log('✍️  Entering TOTP code...')
    await page.fill(
      'input[name="googleAuthCode"], input[name="totp"], input[placeholder*="code" i], input[type="text"][maxlength="6"]',
      totpCode
    )

    // Submit TOTP
    console.log('🔘 Submitting TOTP code...')
    await page.click('button[type="submit"]:has-text("Submit"), button:has-text("Verify"), button:has-text("Continue")')

    // Wait for successful login (redirect to dashboard)
    console.log('⏳ Waiting for login to complete...')
    await page.waitForURL(/binance\.com/i, { timeout: 120000 })

    // Check if we're logged in (not on login page)
    const currentUrl = page.url()
    if (currentUrl.includes('/login') || currentUrl.includes('/signin')) {
      throw new Error('Login failed - still on login page. Please check credentials.')
    }

    console.log('✅ Login successful!')
    console.log(`📍 Current URL: ${currentUrl}`)

    // Get cookies
    const cookies = await context.cookies()
    console.log(`🍪 Retrieved ${cookies.length} cookies`)

    // Save cookies to database
    console.log('💾 Saving cookies to database...')
    await saveSession(cookies, email)

    console.log('\n✅ Bootstrap login completed successfully!')
    console.log('📝 Cookies saved to database. You can now use automated verification.')
    console.log('\n⚠️  Note: If Binance logs you out, run this script again: bun run bootstrap:binance\n')

    await browser.close()
  } catch (error: any) {
    // Try to close browser if it was opened
    if (browser) {
      try {
        await browser.close()
      } catch {}
    }
    
    console.error('\n❌ Bootstrap login failed:')
    console.error(error.message)
    
    if (error.message.includes('Timeout') || error.message.includes('launch')) {
      console.error('\n💡 Browser Launch Troubleshooting:')
      console.error('   The browser process started but timed out during initialization.')
      console.error('   This is often caused by Windows Defender or antivirus software.\n')
      console.error('   Try these solutions:')
      console.error('   1. ⚠️  TEMPORARILY disable Windows Defender Real-time Protection:')
      console.error('      Settings → Privacy & Security → Windows Security')
      console.error('      → Virus & threat protection → Manage settings')
      console.error('      → Turn off "Real-time protection" temporarily')
      console.error('   2. Add exception for Playwright browsers:')
      console.error('      C:\\Users\\Orcalo\\AppData\\Local\\ms-playwright\\')
      console.error('   3. Close all other browser windows (Chrome, Edge, etc.)')
      console.error('   4. Try Firefox instead (often more stable on Windows):')
      console.error('      npx playwright install firefox')
      console.error('      bun run bootstrap:binance:firefox')
      console.error('   5. Try running PowerShell/terminal as Administrator')
      console.error('   6. Check Task Manager for stuck Chrome/Chromium processes')
      console.error('   7. Restart your computer and try again')
    } else {
      console.error('\n💡 Login Troubleshooting:')
      console.error('   - Make sure your credentials are correct')
      console.error('   - Check that TOTP secret is correct (base32 format)')
      console.error('   - Binance may require additional verification (captcha, email verification)')
      console.error('   - Check browser window for any error messages')
    }
    
    process.exit(1)
  }
}

// Run bootstrap
bootstrapBinanceLogin().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
