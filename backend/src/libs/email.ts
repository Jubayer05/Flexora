import nodemailer, { type Transporter } from 'nodemailer'
import { dateWhen } from '../utils'
import { SettingService } from '../services/setting.services'

export const emailValidity = dateWhen

let transporter: Transporter | null = null
let transporterConfigKey: string | null = null

const EMAIL_SETTINGS_KEY = 'system_email_configurations'
const settingService = new SettingService()

type StoredEmailConfiguration = Partial<{
  smtpHost: string
  smtpPort: string
  mailFromName: string
  mailFromEmail: string
  smtpUsername: string
  smtpPassword: string
}>

type ResolvedEmailConfiguration = {
  host: string
  port: number
  user: string
  pass: string
  fromEmail: string
  fromName: string
}

function getStringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

async function getStoredEmailConfiguration(): Promise<StoredEmailConfiguration> {
  try {
    const setting = await settingService.findByKey(EMAIL_SETTINGS_KEY)
    const value = setting?.value

    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {}
    }

    return {
      smtpHost: getStringValue((value as Record<string, unknown>).smtpHost),
      smtpPort: getStringValue((value as Record<string, unknown>).smtpPort),
      smtpUsername: getStringValue((value as Record<string, unknown>).smtpUsername),
      smtpPassword: getStringValue((value as Record<string, unknown>).smtpPassword),
      mailFromEmail: getStringValue((value as Record<string, unknown>).mailFromEmail),
      mailFromName: getStringValue((value as Record<string, unknown>).mailFromName)
    }
  } catch (error) {
    console.warn('[Email] Failed to read admin email configuration, falling back to .env', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return {}
  }
}

async function resolveEmailConfiguration(): Promise<ResolvedEmailConfiguration> {
  const stored = await getStoredEmailConfiguration()

  const host = stored.smtpHost || getStringValue(process.env.SMTP_HOST) || ''
  const port = Number(stored.smtpPort || getStringValue(process.env.SMTP_PORT) || 587)
  const user = stored.smtpUsername || getStringValue(process.env.SMTP_USER) || ''
  const pass = stored.smtpPassword || getStringValue(process.env.SMTP_PASSWORD) || ''
  const fromEmail = stored.mailFromEmail || getStringValue(process.env.SMTP_FROM_EMAIL) || user
  const fromName = stored.mailFromName || getStringValue(process.env.SMTP_FROM_NAME) || 'UHQ Accounts'

  if (!host || !user || !pass) {
    throw new Error(
      'SMTP configuration is missing. Please configure it in /admin/email-settings/email-configurations or set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD in backend .env.'
    )
  }

  return {
    host,
    port: Number.isFinite(port) ? port : 587,
    user,
    pass,
    fromEmail,
    fromName
  }
}

async function getTransporter(config: ResolvedEmailConfiguration): Promise<Transporter> {
  const configKey = JSON.stringify({
    host: config.host,
    port: config.port,
    user: config.user,
    pass: config.pass
  })

  if (transporter && transporterConfigKey === configKey) return transporter

  const secure = config.port === 465

  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure,
    auth: {
      user: config.user,
      pass: config.pass
    }
  })
  transporterConfigKey = configKey

  return transporter
}

type EmailAttachment = {
  filename: string
  content: string | Buffer
  contentType?: string
}

export async function sendEmail(
  to: string,
  text?: string,
  subject?: string,
  html?: string,
  attachments?: EmailAttachment[]
) {
  try {
    const config = await resolveEmailConfiguration()
    const mailer = await getTransporter(config)

    const result = await mailer.sendMail({
      from: `${config.fromName} <${config.fromEmail}>`,
      to,
      subject,
      text,
      html,
      attachments
    })

    console.log('[Email] Email sent successfully', {
      to,
      subject,
      messageId: result.messageId
    })

    return result
  } catch (error) {
    console.error('[Email] Failed to send email', {
      to,
      subject,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    throw error
  }
}

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'

export async function sendVerificationEmail(to: string, token: string, userName?: string) {
  const verifyUrl = `${FRONTEND_URL.replace(/\/$/, '')}/verify-email?token=${encodeURIComponent(token)}`
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Email] Verification link (dev):', verifyUrl)
  }

  // Try to use template, fallback to default
  try {
    const { sendEmailWithTemplate } = await import('./email-with-template')
    return await sendEmailWithTemplate({
      to,
      templateType: 'VERIFICATION_EMAIL',
      templateVariables: {
        name: userName || 'Customer',
        verificationLink: verifyUrl
      },
      subject: 'Verify your email address',
      text: `Welcome to UHQ Accounts!

Please verify your email address by clicking the link below:
${verifyUrl}

If you did not create an account, you can safely ignore this email.`,
      html: `<p>Welcome to <strong>UHQ Accounts</strong>!</p>
<p>Please verify your email address by clicking the button below:</p>
<p><a href="${verifyUrl}" style="display:inline-block;padding:10px 18px;background-color:#111827;color:#ffffff;text-decoration:none;border-radius:6px;">Verify Email</a></p>
<p>Or copy and paste this URL into your browser:</p>
<p><a href="${verifyUrl}">${verifyUrl}</a></p>
<p>If you did not create an account, you can safely ignore this email.</p>`
    })
  } catch (error) {
    // Fallback to direct sending if template system fails
    const subject = 'Verify your email address'
    const text = `Welcome to UHQ Accounts!

Please verify your email address by clicking the link below:
${verifyUrl}

If you did not create an account, you can safely ignore this email.`

    const html = `<p>Welcome to <strong>UHQ Accounts</strong>!</p>
<p>Please verify your email address by clicking the button below:</p>
<p><a href="${verifyUrl}" style="display:inline-block;padding:10px 18px;background-color:#111827;color:#ffffff;text-decoration:none;border-radius:6px;">Verify Email</a></p>
<p>Or copy and paste this URL into your browser:</p>
<p><a href="${verifyUrl}">${verifyUrl}</a></p>
<p>If you did not create an account, you can safely ignore this email.</p>`

    return sendEmail(to, text, subject, html)
  }
}

export async function sendVerificationCodeEmail(to: string, code: string, userName?: string) {
  try {
    const { sendEmailWithTemplate } = await import('./email-with-template')
    return await sendEmailWithTemplate({
      to,
      templateType: 'VERIFICATION_CODE',
      templateVariables: {
        name: userName || 'Customer',
        verificationCode: code,
        expiryMinutes: '10'
      },
      subject: 'Your verification code',
      text: `Welcome to UHQ Accounts!

Your 6-digit verification code is: ${code}

This code will expire in 10 minutes.

If you did not create an account, you can safely ignore this email.`,
      html: `<p>Welcome to <strong>UHQ Accounts</strong>!</p>
<p>Your 6-digit verification code is:</p>
<p style="font-size:28px;font-weight:700;letter-spacing:8px;margin:16px 0;">${code}</p>
<p>This code will expire in 10 minutes.</p>
<p>If you did not create an account, you can safely ignore this email.</p>`
    })
  } catch (error) {
    const subject = 'Your verification code'
    const text = `Welcome to UHQ Accounts!

Your 6-digit verification code is: ${code}

This code will expire in 10 minutes.

If you did not create an account, you can safely ignore this email.`

    const html = `<p>Welcome to <strong>UHQ Accounts</strong>!</p>
<p>Your 6-digit verification code is:</p>
<p style="font-size:28px;font-weight:700;letter-spacing:8px;margin:16px 0;">${code}</p>
<p>This code will expire in 10 minutes.</p>
<p>If you did not create an account, you can safely ignore this email.</p>`

    return sendEmail(to, text, subject, html)
  }
}

export async function sendPasswordResetEmail(to: string, token: string, userName?: string) {
  const resetUrl = `${FRONTEND_URL.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`

  // Try to use template, fallback to default
  try {
    const { sendEmailWithTemplate } = await import('./email-with-template')
    return await sendEmailWithTemplate({
      to,
      templateType: 'PASSWORD_RESET',
      templateVariables: {
        name: userName || 'Customer',
        resetLink: resetUrl
      },
      subject: 'Reset your password',
      text: `You requested to reset your password.

You can reset it by visiting the following link:
${resetUrl}

If you did not request this, you can safely ignore this email.`,
      html: `<p>You requested to reset your password.</p>
<p>Click the button below to set a new password:</p>
<p><a href="${resetUrl}" style="display:inline-block;padding:10px 18px;background-color:#111827;color:#ffffff;text-decoration:none;border-radius:6px;">Reset Password</a></p>
<p>Or copy and paste this URL into your browser:</p>
<p><a href="${resetUrl}">${resetUrl}</a></p>
<p>If you did not request this, you can safely ignore this email.</p>`
    })
  } catch (error) {
    // Fallback to direct sending if template system fails
    const subject = 'Reset your password'
    const text = `You requested to reset your password.

You can reset it by visiting the following link:
${resetUrl}

If you did not request this, you can safely ignore this email.`

    const html = `<p>You requested to reset your password.</p>
<p>Click the button below to set a new password:</p>
<p><a href="${resetUrl}" style="display:inline-block;padding:10px 18px;background-color:#111827;color:#ffffff;text-decoration:none;border-radius:6px;">Reset Password</a></p>
<p>Or copy and paste this URL into your browser:</p>
<p><a href="${resetUrl}">${resetUrl}</a></p>
<p>If you did not request this, you can safely ignore this email.</p>`

    return sendEmail(to, text, subject, html)
  }
}

/**
 * Send welcome email to new user
 */
export async function sendWelcomeEmail(to: string, userName?: string) {
  try {
    const { sendEmailWithTemplate } = await import('./email-with-template')
    return await sendEmailWithTemplate({
      to,
      templateType: 'WELCOME_EMAIL',
      templateVariables: {
        name: userName || 'Customer',
        email: to
      },
      subject: 'Welcome to UHQ Accounts!',
      text: `Welcome to UHQ Accounts!

Thank you for joining us. We're excited to have you on board!

Get started by exploring our products and services.

If you have any questions, feel free to contact our support team.

Best regards,
UHQ Accounts Team`,
      html: `<h2>Welcome to UHQ Accounts!</h2>
<p>Thank you for joining us. We're excited to have you on board!</p>
<p>Get started by exploring our products and services.</p>
<p>If you have any questions, feel free to contact our support team.</p>
<p>Best regards,<br>UHQ Accounts Team</p>`
    })
  } catch (error) {
    console.error('[Email] Failed to send welcome email:', error)
    // Don't throw - welcome email is not critical
  }
}
