import db from '../configs/db'
import { generateEmailHTML, replaceTemplateVariables, htmlToPlainText, type EmailTemplateVariables } from '../utils/email-template-base'

export interface RenderEmailOptions {
  type: string
  variables: EmailTemplateVariables
  fallbackSubject?: string
  fallbackBody?: string
  fallbackHtml?: string
}

export interface RenderedEmail {
  subject: string
  html: string
  text: string
}

export class EmailTemplateRendererService {
  /**
   * Render email template with variables
   */
  async renderEmail(options: RenderEmailOptions): Promise<RenderedEmail> {
    const { type, variables, fallbackSubject, fallbackBody, fallbackHtml } = options

    try {
      // Try to get template from database
      const template = await db.emailTemplate.findUnique({
        where: { type, isActive: true }
      })

      if (template) {
        // Use template from database
        const subject = replaceTemplateVariables(template.subject, variables)
        
        // Use HTML body if available, otherwise use plain text body
        let html = template.htmlBody || template.body
        let text = template.body

        // If htmlBody exists, generate plain text from it
        if (template.htmlBody) {
          text = htmlToPlainText(template.htmlBody)
        }

        // Replace variables in both HTML and text
        html = replaceTemplateVariables(html, variables)
        text = replaceTemplateVariables(text, variables)

        // Wrap HTML in professional template if it's not already wrapped
        if (html && !html.includes('<!DOCTYPE html>')) {
          html = generateEmailHTML(html, {
            preheader: text.substring(0, 100)
          })
        }

        return {
          subject,
          html,
          text
        }
      }

      // Fallback to provided defaults or throw error
      if (fallbackSubject && (fallbackBody || fallbackHtml)) {
        const html = fallbackHtml || generateEmailHTML(fallbackBody || '', {
          preheader: fallbackBody?.substring(0, 100) || ''
        })
        const text = fallbackBody || htmlToPlainText(fallbackHtml || '')

        return {
          subject: replaceTemplateVariables(fallbackSubject, variables),
          html: replaceTemplateVariables(html, variables),
          text: replaceTemplateVariables(text, variables)
        }
      }

      throw new Error(`Email template not found for type: ${type}`)
    } catch (error) {
      console.error('[EmailTemplateRenderer] Error rendering template:', error)
      throw error
    }
  }

  /**
   * Get available variables for a template type
   */
  async getTemplateVariables(type: string): Promise<string[]> {
    const template = await db.emailTemplate.findUnique({
      where: { type }
    })

    return template?.variables || []
  }

  /**
   * Preview email template with sample data
   */
  async previewEmail(
    type: string,
    sampleVariables?: EmailTemplateVariables
  ): Promise<RenderedEmail> {
    const template = await db.emailTemplate.findUnique({
      where: { type }
    })

    if (!template) {
      throw new Error(`Email template not found for type: ${type}`)
    }

    // Use provided sample variables or generate defaults
    const variables = sampleVariables || this.generateSampleVariables(type)

    return this.renderEmail({
      type,
      variables,
      fallbackSubject: template.subject,
      fallbackBody: template.body,
      fallbackHtml: template.htmlBody || undefined
    })
  }

  /**
   * Generate sample variables for preview
   */
  private generateSampleVariables(type: string): EmailTemplateVariables {
    const defaults: Record<string, EmailTemplateVariables> = {
      WELCOME_EMAIL: {
        name: 'John Doe',
        email: 'john@example.com'
      },
      VERIFICATION_EMAIL: {
        name: 'John Doe',
        verificationLink: 'https://flexora.com/verify-email?token=abc123'
      },
      PASSWORD_RESET: {
        name: 'John Doe',
        resetLink: 'https://flexora.com/reset-password?token=abc123'
      },
      ORDER_CONFIRMATION: {
        name: 'John Doe',
        orderNumber: 'ORD-12345',
        orderTotal: '$99.99',
        orderDate: new Date().toLocaleDateString(),
        productName: 'Telegram Account'
      },
      PAYMENT_CONFIRMATION: {
        name: 'John Doe',
        orderNumber: 'ORD-12345',
        amount: '$99.99',
        paymentMethod: 'Credit Card',
        transactionId: 'TXN-12345'
      },
      ORDER_DELIVERED: {
        name: 'John Doe',
        orderNumber: 'ORD-12345',
        productName: 'Telegram Account',
        quantity: '1'
      },
      TELEGRAM_ACCOUNT_DELIVERY: {
        name: 'John Doe',
        orderNumber: 'ORD-12345',
        productName: 'Telegram Account',
        quantity: '1'
      },
      TRANSFER_COMPLETION: {
        name: 'John Doe',
        orderNumber: 'ORD-12345',
        transferId: 'TRF-12345',
        targetUrl: 'https://t.me/example'
      },
      PREMIUM_ACTIVATION: {
        name: 'John Doe',
        packageName: 'Premium Plan',
        discount: '20%',
        startDate: new Date().toLocaleDateString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()
      },
      SUPPORT_TICKET_UPDATE: {
        name: 'John Doe',
        ticketNumber: 'TKT-12345',
        ticketSubject: 'Account Issue',
        updateMessage: 'Your ticket has been updated by our support team.'
      }
    }

    return defaults[type] || {
      name: 'Customer',
      email: 'customer@example.com'
    }
  }
}

export const emailTemplateRenderer = new EmailTemplateRendererService()

