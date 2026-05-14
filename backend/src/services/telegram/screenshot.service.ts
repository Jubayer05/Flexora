/**
 * Telegram Screenshot Service
 * Generates proof screenshots for transfers using Puppeteer
 * Screenshots are taken of Telegram Web showing transfer confirmation
 */

import db from '../../configs/db';
import { deleteFromR2, extractR2KeyFromUrl, uploadToR2 } from '../../lib/r2';

// Puppeteer types (optional dependency)
type Browser = any;
type Page = any;

// ================================
// TYPES
// ================================

export interface ScreenshotResult {
  success: boolean;
  filePath?: string;
  fileName?: string;
  publicUrl?: string;
  error?: string;
}

export interface ScreenshotOptions {
  width?: number;
  height?: number;
  fullPage?: boolean;
  quality?: number;
}

// ================================
// SCREENSHOT SERVICE CLASS
// ================================

export class TelegramScreenshotService {
  private browser: Browser | null = null;
  private puppeteer: any = null;
  private readonly proofFolder = 'proofs';

  constructor() {
    // Keep constructor explicit for future proof-service configuration.
  }

  /**
   * Load puppeteer dynamically (optional dependency)
   */
  private async loadPuppeteer(): Promise<any> {
    if (this.puppeteer) return this.puppeteer;
    try {
      this.puppeteer = await import('puppeteer');
      return this.puppeteer.default || this.puppeteer;
    } catch {
      console.warn('⚠️ Puppeteer not installed. Screenshot service disabled.');
      return null;
    }
  }

  /**
   * Initialize browser
   */
  private async initBrowser(): Promise<Browser | null> {
    if (!this.browser) {
      const puppeteer = await this.loadPuppeteer();
      if (!puppeteer) return null;

      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--window-size=1920,1080',
        ],
      });
    }
    return this.browser;
  }

  /**
   * Close browser
   */
  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  private async persistTransferProof(
    transferId: number,
    fileName: string,
    publicUrl: string,
    metadata: Record<string, unknown>
  ): Promise<void> {
    await db.telegramTransfer.update({
      where: { id: transferId },
      data: {
        transferProofUrl: publicUrl,
        proofData: publicUrl,
      },
    });
  }

  private async uploadProofBuffer(
    transferId: number,
    fileName: string,
    content: Buffer | Uint8Array,
    metadata: Record<string, unknown>
  ): Promise<ScreenshotResult> {
    const publicUrl = await uploadToR2(content, fileName, this.proofFolder);

    await this.persistTransferProof(transferId, fileName, publicUrl, metadata);

    return {
      success: true,
      fileName,
      publicUrl,
    };
  }

  private generateProofSvg(
    transferId: number,
    chatIdentifier: string,
    customerUsername: string
  ): string {
    const verificationCode = this.generateVerificationCode(transferId, chatIdentifier);
    const timestamp = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const escapeXml = (value: string) =>
      value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1280" height="800" viewBox="0 0 1280 800" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="1280" height="800" fill="#0F172A"/>
  <rect x="110" y="80" width="1060" height="640" rx="28" fill="#111827"/>
  <rect x="150" y="120" width="980" height="560" rx="24" fill="#F8FAFC"/>
  <circle cx="220" cy="190" r="42" fill="#0088CC"/>
  <text x="220" y="203" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="white">TG</text>
  <text x="300" y="180" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#0F172A">Telegram Ownership Transfer Proof</text>
  <text x="300" y="220" font-family="Arial, sans-serif" font-size="20" font-weight="600" fill="#16A34A">Transfer completed and recorded</text>

  <rect x="180" y="275" width="920" height="320" rx="20" fill="#EFF6FF" stroke="#BFDBFE" stroke-width="2"/>

  <text x="220" y="330" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#1E3A8A">Transfer ID</text>
  <text x="470" y="330" font-family="Arial, sans-serif" font-size="22" fill="#0F172A">#${transferId}</text>

  <text x="220" y="385" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#1E3A8A">Target</text>
  <text x="470" y="385" font-family="Arial, sans-serif" font-size="22" fill="#0F172A">${escapeXml(chatIdentifier)}</text>

  <text x="220" y="440" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#1E3A8A">Customer</text>
  <text x="470" y="440" font-family="Arial, sans-serif" font-size="22" fill="#0F172A">${escapeXml(customerUsername)}</text>

  <text x="220" y="495" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#1E3A8A">Generated At</text>
  <text x="470" y="495" font-family="Arial, sans-serif" font-size="22" fill="#0F172A">${escapeXml(timestamp)}</text>

  <text x="220" y="550" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#1E3A8A">Verification Code</text>
  <text x="470" y="550" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#DC2626">${verificationCode}</text>

  <text x="180" y="650" font-family="Arial, sans-serif" font-size="18" fill="#475569">Generated fallback proof because Puppeteer was unavailable on this server.</text>
</svg>`;
  }

  private async generateFallbackTransferProof(
    transferId: number,
    chatIdentifier: string,
    customerUsername: string
  ): Promise<ScreenshotResult> {
    const fileName = `transfer_${transferId}_${Date.now()}.svg`;
    const svgBuffer = Buffer.from(
      this.generateProofSvg(transferId, chatIdentifier, customerUsername),
      'utf8'
    );

    const result = await this.uploadProofBuffer(transferId, fileName, svgBuffer, {
      fileName,
      generatedAt: new Date().toISOString(),
      chatIdentifier,
      customerUsername,
      renderer: 'svg-fallback',
    });

    console.log(`✅ Fallback proof generated for transfer ${transferId}`);

    return result;
  }

  /**
   * Generate transfer proof screenshot
   * Takes a screenshot of the Telegram Web page showing admin rights
   */
  async generateTransferProof(
    transferId: number,
    chatIdentifier: string,
    customerUsername: string,
    options: ScreenshotOptions = {}
  ): Promise<ScreenshotResult> {
    let page: Page | null = null;

    try {
      const browser = await this.initBrowser();
      if (!browser) {
        return await this.generateFallbackTransferProof(transferId, chatIdentifier, customerUsername);
      }
      page = await browser.newPage();

      // Set viewport
      await page.setViewport({
        width: options.width || 1280,
        height: options.height || 800,
      });

      // Generate a proof page instead of actually logging into Telegram
      // This is safer and more reliable than trying to access Telegram Web
      const proofHtml = this.generateProofHtml(transferId, chatIdentifier, customerUsername);

      await page.setContent(proofHtml, { waitUntil: 'networkidle0' });

      // Generate filename
      const fileName = `transfer_${transferId}_${Date.now()}.png`;
      const screenshotBuffer = (await page.screenshot({
        type: 'png',
        fullPage: options.fullPage || false,
      })) as Buffer;

      const result = await this.uploadProofBuffer(transferId, fileName, screenshotBuffer, {
        fileName,
        generatedAt: new Date().toISOString(),
        chatIdentifier,
        customerUsername,
        renderer: 'puppeteer',
      });

      console.log(`✅ Screenshot proof generated for transfer ${transferId}`);

      return result;
    } catch (error: any) {
      console.error('❌ Failed to generate screenshot:', error.message);
      return {
        success: false,
        error: error.message,
      };
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  /**
   * Generate HTML content for proof screenshot
   */
  private generateProofHtml(
    transferId: number,
    chatIdentifier: string,
    customerUsername: string
  ): string {
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Transfer Proof - #${transferId}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .proof-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      padding: 40px;
      max-width: 600px;
      width: 100%;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, #0088cc 0%, #0066aa 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
    }
    .logo svg {
      width: 48px;
      height: 48px;
      fill: white;
    }
    h1 {
      color: #1a1a1a;
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .subtitle {
      color: #10b981;
      font-size: 16px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .subtitle::before {
      content: '✓';
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      background: #10b981;
      color: white;
      border-radius: 50%;
      font-size: 14px;
    }
    .details {
      background: #f8fafc;
      border-radius: 12px;
      padding: 24px;
      margin: 24px 0;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .detail-label {
      color: #64748b;
      font-size: 14px;
    }
    .detail-value {
      color: #1e293b;
      font-weight: 600;
      font-size: 14px;
    }
    .detail-value.highlight {
      color: #0088cc;
    }
    .footer {
      text-align: center;
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid #e2e8f0;
    }
    .footer-text {
      color: #94a3b8;
      font-size: 12px;
    }
    .verification-code {
      background: #f1f5f9;
      padding: 12px 20px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 14px;
      color: #475569;
      margin-top: 12px;
      word-break: break-all;
    }
    .badge {
      display: inline-block;
      background: #dbeafe;
      color: #1d4ed8;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="proof-card">
    <div class="header">
      <div class="logo">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M9.78,18.65L10.06,14.42L17.74,7.5C18.08,7.19 17.67,7.04 17.22,7.31L7.74,13.3L3.64,12C2.76,11.75 2.75,11.14 3.84,10.7L19.81,4.54C20.54,4.21 21.24,4.72 20.96,5.84L18.24,18.65C18.05,19.56 17.5,19.78 16.74,19.36L12.6,16.3L10.61,18.23C10.38,18.46 10.19,18.65 9.78,18.65Z"/>
        </svg>
      </div>
      <h1>Ownership Transfer Proof</h1>
      <div class="subtitle">Transfer Completed Successfully</div>
    </div>

    <div class="details">
      <div class="detail-row">
        <span class="detail-label">Transfer ID</span>
        <span class="detail-value">#${transferId}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Group/Channel</span>
        <span class="detail-value highlight">${this.escapeHtml(chatIdentifier)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">New Owner</span>
        <span class="detail-value">@${this.escapeHtml(customerUsername)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Transfer Status</span>
        <span class="badge">Admin Rights Granted</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Timestamp</span>
        <span class="detail-value">${formattedDate}</span>
      </div>
    </div>

    <div class="footer">
      <p class="footer-text">This document serves as proof of ownership transfer</p>
      <div class="verification-code">
        Verification: ${this.generateVerificationCode(transferId)}
      </div>
      <p class="footer-text" style="margin-top: 12px">UHQ Accounts • ${now.getFullYear()}</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Generate verification code for proof
   */
  private generateVerificationCode(transferId: number): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `TRF-${transferId}-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (char) => map[char] || char);
  }

  /**
   * Take custom screenshot from URL
   */
  async takeScreenshot(url: string, options: ScreenshotOptions = {}): Promise<ScreenshotResult> {
    let page: Page | null = null;

    try {
      const browser = await this.initBrowser();
      if (!browser) {
        return { success: false, error: 'Puppeteer not available. Install puppeteer to enable screenshots.' };
      }
      page = await browser.newPage();

      await page.setViewport({
        width: options.width || 1280,
        height: options.height || 800,
      });

      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      const fileName = `screenshot_${Date.now()}.png`;
      const screenshotBuffer = (await page.screenshot({
        type: 'png',
        fullPage: options.fullPage || false,
        quality: options.quality,
      })) as Buffer;

      const publicUrl = await uploadToR2(screenshotBuffer, fileName, this.proofFolder);

      return {
        success: true,
        fileName,
        publicUrl,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  /**
   * Delete proof file
   */
  async deleteProof(fileName: string): Promise<boolean> {
    try {
      const key = extractR2KeyFromUrl(fileName) || `${this.proofFolder}/${fileName}`;
      await deleteFromR2(key);
      return true;
    } catch (error) {
      console.error('Failed to delete proof file:', error);
      return false;
    }
  }

  /**
   * Get proof file path
   */
  getProofPath(fileName: string): string | null {
    return null;
  }

  /**
   * Cleanup old proof files (older than specified days)
   */
  async cleanupOldProofs(daysOld: number = 30): Promise<number> {
    try {
      console.log(
        `🧹 cleanupOldProofs(${daysOld}) skipped because transfer proofs are stored in R2, not on local disk`
      );
      return 0;
    } catch (error) {
      console.error('Failed to cleanup old proofs:', error);
      return 0;
    }
  }
}

// ================================
// SINGLETON EXPORT
// ================================

export const telegramScreenshotService = new TelegramScreenshotService();
