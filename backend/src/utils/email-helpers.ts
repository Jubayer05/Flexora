/**
 * Email helper functions for common email types
 */

import { sendEmailWithTemplate } from '../libs/email-with-template'
import type { EmailTemplateVariables } from './email-template-base'

/**
 * Send support ticket update email
 */
export async function sendTicketUpdateEmail(
  to: string,
  options: {
    ticketNumber: string
    ticketSubject: string
    updateMessage: string
    userName?: string
    isStaffReply?: boolean
  }
) {
  const { ticketNumber, ticketSubject, updateMessage, userName, isStaffReply } = options

  try {
    await sendEmailWithTemplate({
      to,
      templateType: 'SUPPORT_TICKET_UPDATE',
      templateVariables: {
        name: userName || 'Customer',
        ticketNumber,
        ticketSubject,
        updateMessage,
        isStaffReply: isStaffReply ? 'Yes' : 'No'
      },
      subject: `Update on Your Support Ticket: ${ticketNumber}`,
      text: `Hello ${userName || 'Customer'},

Your support ticket has been updated:

Ticket Number: ${ticketNumber}
Subject: ${ticketSubject}

${isStaffReply ? 'Our support team has replied:' : 'You have added a reply:'}
${updateMessage}

You can view and respond to your ticket by logging into your account.

Best regards,
UHQ Accounts Support Team`,
      html: `<h2>Support Ticket Update</h2>
<p>Hello ${userName || 'Customer'},</p>
<p>Your support ticket has been updated:</p>
<div class="info-box">
  <p><strong>Ticket Number:</strong> ${ticketNumber}</p>
  <p><strong>Subject:</strong> ${ticketSubject}</p>
</div>
<p>${isStaffReply ? '<strong>Our support team has replied:</strong>' : '<strong>You have added a reply:</strong>'}</p>
<p>${updateMessage}</p>
<p>You can view and respond to your ticket by logging into your account.</p>
<p>Best regards,<br>UHQ Accounts Support Team</p>`
    })
  } catch (error) {
    console.error('[Email] Failed to send ticket update email:', error)
    // Don't throw - email failure shouldn't break ticket functionality
  }
}

/**
 * Send payment receipt email
 */
export async function sendPaymentReceiptEmail(
  to: string,
  options: {
    orderNumber: string
    amount: string | number
    paymentMethod: string
    transactionId?: string
    userName?: string
    orderDate?: string
  }
) {
  const { orderNumber, amount, paymentMethod, transactionId, userName, orderDate } = options

  try {
    await sendEmailWithTemplate({
      to,
      templateType: 'PAYMENT_RECEIPT',
      templateVariables: {
        name: userName || 'Customer',
        orderNumber,
        amount: typeof amount === 'number' ? `$${amount.toFixed(2)}` : amount,
        paymentMethod,
        transactionId: transactionId || 'N/A',
        orderDate: orderDate || new Date().toLocaleDateString()
      },
      subject: `Payment Receipt - Order ${orderNumber}`,
      text: `Hello ${userName || 'Customer'},

Thank you for your payment!

PAYMENT RECEIPT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Order Number: ${orderNumber}
Amount: ${typeof amount === 'number' ? `$${amount.toFixed(2)}` : amount}
Payment Method: ${paymentMethod}
${transactionId ? `Transaction ID: ${transactionId}` : ''}
Date: ${orderDate || new Date().toLocaleDateString()}

This is your official receipt for this transaction.

Best regards,
UHQ Accounts Team`,
      html: `<h2>Payment Receipt</h2>
<p>Hello ${userName || 'Customer'},</p>
<p>Thank you for your payment!</p>
<div class="info-box success-box">
  <h3>PAYMENT RECEIPT</h3>
  <p><strong>Order Number:</strong> ${orderNumber}</p>
  <p><strong>Amount:</strong> ${typeof amount === 'number' ? `$${amount.toFixed(2)}` : amount}</p>
  <p><strong>Payment Method:</strong> ${paymentMethod}</p>
  ${transactionId ? `<p><strong>Transaction ID:</strong> ${transactionId}</p>` : ''}
  <p><strong>Date:</strong> ${orderDate || new Date().toLocaleDateString()}</p>
</div>
<p>This is your official receipt for this transaction.</p>
<p>Best regards,<br>UHQ Accounts Team</p>`
    })
  } catch (error) {
    console.error('[Email] Failed to send payment receipt email:', error)
    throw error // Payment receipt is important, so throw error
  }
}

