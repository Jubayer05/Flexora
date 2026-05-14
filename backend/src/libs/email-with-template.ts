/**
 * Enhanced email sending with template support
 * Falls back to provided text/html if template not found
 */

import { sendEmail } from './email'
import { emailTemplateRenderer } from '../services/email-template-renderer.service'
import type { EmailTemplateVariables } from '../utils/email-template-base'

export interface SendEmailWithTemplateOptions {
  to: string
  templateType?: string
  templateVariables?: EmailTemplateVariables
  // Fallback options (used if template not found or templateType not provided)
  subject?: string
  text?: string
  html?: string
}

/**
 * Send email using template if available, otherwise use fallback
 * This ensures backward compatibility while enabling template usage
 */
export async function sendEmailWithTemplate(options: SendEmailWithTemplateOptions) {
  const { to, templateType, templateVariables = {}, subject, text, html } = options

  try {
    // If template type is provided, try to use template
    if (templateType) {
      try {
        const rendered = await emailTemplateRenderer.renderEmail({
          type: templateType,
          variables: templateVariables,
          fallbackSubject: subject,
          fallbackBody: text,
          fallbackHtml: html
        })

        return await sendEmail(to, rendered.text, rendered.subject, rendered.html)
      } catch (templateError) {
        // If template rendering fails, log and fall through to fallback
        console.warn(`[Email] Template rendering failed for ${templateType}, using fallback:`, templateError)
      }
    }

    // Fallback to direct email sending (existing behavior)
    if (!subject) {
      throw new Error('Email subject is required when template is not used')
    }

    return await sendEmail(to, text, subject, html)
  } catch (error) {
    console.error('[Email] Failed to send email:', error)
    throw error
  }
}

