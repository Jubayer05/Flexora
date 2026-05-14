/**
 * Professional HTML email templates for order-related emails.
 * Uses inline styles for maximum compatibility with email clients.
 */

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://uhqaccounts.com'
const SUPPORT_EMAIL = 'support@uhqaccounts.com'

// Brand colors (inline-friendly)
const colors = {
  primary: '#0f766e',
  primaryDark: '#0d5c56',
  success: '#059669',
  successBg: '#ecfdf5',
  warning: '#b45309',
  warningBg: '#fffbeb',
  danger: '#dc2626',
  text: '#1f2937',
  textMuted: '#6b7280',
  border: '#e5e7eb',
  bg: '#f9fafb',
  white: '#ffffff'
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Wrap email content in a professional layout: header, content area, footer.
 */
export function wrapOrderEmailHtml(title: string, contentHtml: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:16px;background-color:${colors.bg};color:${colors.text};line-height:1.6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:${colors.bg};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;">
          <tr>
            <td style="background:linear-gradient(135deg,${colors.primary} 0%,${colors.primaryDark} 100%);padding:24px 32px;border-radius:12px 12px 0 0;">
              <h1 style="margin:0;color:${colors.white};font-size:24px;font-weight:700;letter-spacing:-0.02em;">UHQ Accounts</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.9);font-size:15px;">${escapeHtml(title)}</p>
            </td>
          </tr>
          <tr>
            <td style="background:${colors.white};padding:32px;border:1px solid ${colors.border};border-top:none;border-radius:0 0 12px 12px;">
              ${contentHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;text-align:center;border:1px solid ${colors.border};border-top:none;background:${colors.white};border-radius:0 0 12px 12px;">
              <p style="margin:0 0 8px;font-size:14px;color:${colors.textMuted};">
                Need help? <a href="mailto:${SUPPORT_EMAIL}" style="color:${colors.primary};text-decoration:none;font-weight:600;">Contact Support</a>
                &nbsp;|&nbsp;
                <a href="${FRONTEND_URL}/user/purchased-items" style="color:${colors.primary};text-decoration:none;font-weight:600;">My Orders</a>
              </p>
              <p style="margin:0;font-size:13px;color:${colors.textMuted};">
                © ${new Date().getFullYear()} UHQ Accounts. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.replace(/\n\s+/g, '\n')
}

export function sectionGreeting(name: string): string {
  return `<p style="margin:0 0 20px;font-size:18px;color:${colors.text};">Hello ${escapeHtml(name)},</p>`
}

export function sectionHeading(text: string): string {
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0 12px;">
      <tr>
        <td style="border-bottom:2px solid ${colors.primary};padding-bottom:8px;">
          <h2 style="margin:0;font-size:17px;font-weight:700;color:${colors.primary};text-transform:uppercase;letter-spacing:0.05em;">${escapeHtml(text)}</h2>
        </td>
      </tr>
    </table>`
}

export function keyValueTable(rows: Array<{ label: string; value: string }>): string {
  const cells = rows
    .map(
      (r) => `
    <tr>
      <td style="padding:10px 12px;border:1px solid ${colors.border};font-size:14px;color:${colors.textMuted};width:40%;">${escapeHtml(r.label)}</td>
      <td style="padding:10px 12px;border:1px solid ${colors.border};font-size:14px;font-weight:600;color:${colors.text};">${escapeHtml(r.value)}</td>
    </tr>`
    )
    .join('')
  return `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:12px 0;">
    ${cells}
  </table>`
}

export function statusBadge(text: string, type: 'success' | 'warning' | 'info' = 'success'): string {
  const bg = type === 'success' ? colors.successBg : type === 'warning' ? colors.warningBg : '#eff6ff'
  const fg = type === 'success' ? colors.success : type === 'warning' ? colors.warning : '#1d4ed8'
  return `<span style="display:inline-block;padding:6px 14px;background:${bg};color:${fg};font-size:14px;font-weight:700;border-radius:8px;">${escapeHtml(text)}</span>`
}

export function infoBox(htmlContent: string, variant: 'success' | 'warning' | 'info' = 'info'): string {
  const bg = variant === 'success' ? colors.successBg : variant === 'warning' ? colors.warningBg : '#f0f9ff'
  const borderColor = variant === 'success' ? colors.success : variant === 'warning' ? colors.warning : '#0ea5e9'
  return `
  <div style="margin:20px 0;padding:16px;background:${bg};border-left:4px solid ${borderColor};border-radius:0 8px 8px 0;">
    ${htmlContent}
  </div>`
}

export function bulletList(items: string[]): string {
  const lis = items.map((i) => `<li style="margin:6px 0;font-size:15px;color:${colors.text};">${escapeHtml(i)}</li>`).join('')
  return `<ul style="margin:0;padding-left:20px;">${lis}</ul>`
}

export function ctaButton(text: string, url: string): string {
  return `
  <table role="presentation" cellspacing="0" cellpadding="0" style="margin:20px 0;">
    <tr>
      <td>
        <a href="${url}" style="display:inline-block;padding:14px 28px;background:${colors.primary};color:${colors.white};text-decoration:none;font-weight:600;font-size:15px;border-radius:8px;">${escapeHtml(text)}</a>
      </td>
    </tr>
  </table>`
}

export function paragraph(text: string, extraStyle?: string): string {
  const s = `margin:0 0 12px;font-size:16px;color:${colors.text};${extraStyle || ''}`
  return `<p style="${s}">${escapeHtml(text).replace(/\n/g, '<br>')}</p>`
}

export function signOff(): string {
  return `
  <p style="margin:24px 0 0;font-size:16px;color:${colors.text};">
    Thank you for your purchase!<br><br>
    Best regards,<br>
    <strong>UHQ Accounts Team</strong>
  </p>`
}

export function rawHtml(html: string): string {
  return html
}

export { FRONTEND_URL, SUPPORT_EMAIL, colors, escapeHtml }
