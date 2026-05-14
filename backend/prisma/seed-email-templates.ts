/**
 * Seed default email templates
 * Run this after migration to populate default templates
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const defaultTemplates = [
  {
    type: 'WELCOME_EMAIL',
    subject: 'Welcome to UHQ Accounts!',
    body: `Welcome to UHQ Accounts!

Thank you for joining us, {{name}}. We're excited to have you on board!

Get started by exploring our products and services.

If you have any questions, feel free to contact our support team.

Best regards,
UHQ Accounts Team`,
    htmlBody: `<h2>Welcome to UHQ Accounts!</h2>
<p>Thank you for joining us, <strong>{{name}}</strong>. We're excited to have you on board!</p>
<p>Get started by exploring our products and services.</p>
<p>If you have any questions, feel free to contact our support team.</p>
<p>Best regards,<br>UHQ Accounts Team</p>`,
    variables: ['name', 'email'],
    description: 'Sent when a new user registers',
    isActive: true
  },
  {
    type: 'VERIFICATION_EMAIL',
    subject: 'Verify your email address',
    body: `Welcome to UHQ Accounts!

Hello {{name}},

Please verify your email address by clicking the link below:
{{verificationLink}}

If you did not create an account, you can safely ignore this email.

Best regards,
UHQ Accounts Team`,
    htmlBody: `<h2>Verify Your Email Address</h2>
<p>Hello <strong>{{name}}</strong>,</p>
<p>Welcome to <strong>UHQ Accounts</strong>!</p>
<p>Please verify your email address by clicking the button below:</p>
<p><a href="{{verificationLink}}" class="button">Verify Email</a></p>
<p>Or copy and paste this URL into your browser:</p>
<p><a href="{{verificationLink}}">{{verificationLink}}</a></p>
<p>If you did not create an account, you can safely ignore this email.</p>`,
    variables: ['name', 'verificationLink'],
    description: 'Sent when user needs to verify their email address',
    isActive: true
  },
  {
    type: 'PASSWORD_RESET',
    subject: 'Reset your password',
    body: `Hello {{name}},

You requested to reset your password.

You can reset it by visiting the following link:
{{resetLink}}

This link will expire in 1 hour.

If you did not request this, you can safely ignore this email.

Best regards,
UHQ Accounts Team`,
    htmlBody: `<h2>Reset Your Password</h2>
<p>Hello <strong>{{name}}</strong>,</p>
<p>You requested to reset your password.</p>
<p>Click the button below to set a new password:</p>
<p><a href="{{resetLink}}" class="button">Reset Password</a></p>
<p>Or copy and paste this URL into your browser:</p>
<p><a href="{{resetLink}}">{{resetLink}}</a></p>
<p><strong>This link will expire in 1 hour.</strong></p>
<p>If you did not request this, you can safely ignore this email.</p>`,
    variables: ['name', 'resetLink'],
    description: 'Sent when user requests password reset',
    isActive: true
  },
  {
    type: 'ORDER_CONFIRMATION',
    subject: 'Order Confirmation - {{orderNumber}}',
    body: `Hello {{name}},

Thank you for your order!

Order Number: {{orderNumber}}
Order Date: {{orderDate}}
Product: {{productName}}
Total: {{orderTotal}}

Your order is being processed and you will receive another email once it's ready.

Best regards,
UHQ Accounts Team`,
    htmlBody: `<h2>Order Confirmation</h2>
<p>Hello <strong>{{name}}</strong>,</p>
<p>Thank you for your order!</p>
<div class="info-box success-box">
  <h3>Order Details</h3>
  <p><strong>Order Number:</strong> {{orderNumber}}</p>
  <p><strong>Order Date:</strong> {{orderDate}}</p>
  <p><strong>Product:</strong> {{productName}}</p>
  <p><strong>Total:</strong> {{orderTotal}}</p>
</div>
<p>Your order is being processed and you will receive another email once it's ready.</p>
<p>Best regards,<br>UHQ Accounts Team</p>`,
    variables: ['name', 'orderNumber', 'orderDate', 'productName', 'orderTotal'],
    description: 'Sent when an order is confirmed',
    isActive: true
  },
  {
    type: 'PAYMENT_RECEIPT',
    subject: 'Payment Receipt - Order {{orderNumber}}',
    body: `Hello {{name}},

Thank you for your payment!

PAYMENT RECEIPT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Order Number: {{orderNumber}}
Amount: {{amount}}
Payment Method: {{paymentMethod}}
Transaction ID: {{transactionId}}
Date: {{orderDate}}

This is your official receipt for this transaction.

Best regards,
UHQ Accounts Team`,
    htmlBody: `<h2>Payment Receipt</h2>
<p>Hello <strong>{{name}}</strong>,</p>
<p>Thank you for your payment!</p>
<div class="info-box success-box">
  <h3>PAYMENT RECEIPT</h3>
  <p><strong>Order Number:</strong> {{orderNumber}}</p>
  <p><strong>Amount:</strong> {{amount}}</p>
  <p><strong>Payment Method:</strong> {{paymentMethod}}</p>
  <p><strong>Transaction ID:</strong> {{transactionId}}</p>
  <p><strong>Date:</strong> {{orderDate}}</p>
</div>
<p>This is your official receipt for this transaction.</p>
<p>Best regards,<br>UHQ Accounts Team</p>`,
    variables: ['name', 'orderNumber', 'amount', 'paymentMethod', 'transactionId', 'orderDate'],
    description: 'Sent after successful payment',
    isActive: true
  },
  {
    type: 'ORDER_DELIVERED',
    subject: 'Order Delivered - {{orderNumber}}',
    body: `Hello {{name}},

🎉 Your order has been delivered!

Order Number: {{orderNumber}}
Product: {{productName}}
Quantity: {{quantity}}

You can access your order details in your dashboard.

Best regards,
UHQ Accounts Team`,
    htmlBody: `<h2>Order Delivered</h2>
<p>Hello <strong>{{name}}</strong>,</p>
<p>🎉 Your order has been delivered!</p>
<div class="info-box success-box">
  <p><strong>Order Number:</strong> {{orderNumber}}</p>
  <p><strong>Product:</strong> {{productName}}</p>
  <p><strong>Quantity:</strong> {{quantity}}</p>
</div>
<p>You can access your order details in your dashboard.</p>
<p>Best regards,<br>UHQ Accounts Team</p>`,
    variables: ['name', 'orderNumber', 'productName', 'quantity'],
    description: 'Sent when order is delivered',
    isActive: true
  },
  {
    type: 'TELEGRAM_ACCOUNT_DELIVERY',
    subject: 'Your Telegram Account Credentials - Order {{orderNumber}}',
    body: `Hello {{name}},

🎉 Great news! Your Telegram accounts have been delivered successfully!

Order Number: {{orderNumber}}
Product: {{productName}}
Quantity: {{quantity}}

Your account credentials are available in your dashboard.

Best regards,
UHQ Accounts Team`,
    htmlBody: `<h2>Telegram Account Delivery</h2>
<p>Hello <strong>{{name}}</strong>,</p>
<p>🎉 Great news! Your Telegram accounts have been delivered successfully!</p>
<div class="info-box success-box">
  <p><strong>Order Number:</strong> {{orderNumber}}</p>
  <p><strong>Product:</strong> {{productName}}</p>
  <p><strong>Quantity:</strong> {{quantity}}</p>
</div>
<p>Your account credentials are available in your dashboard.</p>
<p>Best regards,<br>UHQ Accounts Team</p>`,
    variables: ['name', 'orderNumber', 'productName', 'quantity'],
    description: 'Sent when Telegram accounts are delivered',
    isActive: true
  },
  {
    type: 'TRANSFER_COMPLETION',
    subject: 'Transfer Completed - Order {{orderNumber}}',
    body: `Hello {{name}},

Your ownership transfer has been completed successfully!

Order Number: {{orderNumber}}
Transfer ID: {{transferId}}
Target: {{targetUrl}}

Thank you for your purchase!

Best regards,
UHQ Accounts Team`,
    htmlBody: `<h2>Transfer Completed</h2>
<p>Hello <strong>{{name}}</strong>,</p>
<p>Your ownership transfer has been completed successfully!</p>
<div class="info-box success-box">
  <p><strong>Order Number:</strong> {{orderNumber}}</p>
  <p><strong>Transfer ID:</strong> {{transferId}}</p>
  <p><strong>Target:</strong> {{targetUrl}}</p>
</div>
<p>Thank you for your purchase!</p>
<p>Best regards,<br>UHQ Accounts Team</p>`,
    variables: ['name', 'orderNumber', 'transferId', 'targetUrl'],
    description: 'Sent when Telegram transfer is completed',
    isActive: true
  },
  {
    type: 'PREMIUM_ACTIVATION',
    subject: 'Premium Subscription Activated',
    body: `Hello {{name}},

Your subscription has been activated successfully!

Package: {{packageName}}
Discount: {{discount}}
Start Date: {{startDate}}
End Date: {{endDate}}

You will now receive {{discount}} discount on all orders.

Thank you for your purchase!

Best regards,
UHQ Accounts Team`,
    htmlBody: `<h2>Premium Subscription Activated</h2>
<p>Hello <strong>{{name}}</strong>,</p>
<p>Your subscription has been activated successfully!</p>
<div class="info-box success-box">
  <p><strong>Package:</strong> {{packageName}}</p>
  <p><strong>Discount:</strong> {{discount}}</p>
  <p><strong>Start Date:</strong> {{startDate}}</p>
  <p><strong>End Date:</strong> {{endDate}}</p>
</div>
<p>You will now receive <strong>{{discount}}</strong> discount on all orders.</p>
<p>Thank you for your purchase!</p>
<p>Best regards,<br>UHQ Accounts Team</p>`,
    variables: ['name', 'packageName', 'discount', 'startDate', 'endDate'],
    description: 'Sent when premium subscription is activated',
    isActive: true
  },
  {
    type: 'SUPPORT_TICKET_UPDATE',
    subject: 'Update on Your Support Ticket: {{ticketNumber}}',
    body: `Hello {{name}},

Your support ticket has been updated:

Ticket Number: {{ticketNumber}}
Subject: {{ticketSubject}}

{{updateMessage}}

You can view and respond to your ticket by logging into your account.

Best regards,
UHQ Accounts Support Team`,
    htmlBody: `<h2>Support Ticket Update</h2>
<p>Hello <strong>{{name}}</strong>,</p>
<p>Your support ticket has been updated:</p>
<div class="info-box">
  <p><strong>Ticket Number:</strong> {{ticketNumber}}</p>
  <p><strong>Subject:</strong> {{ticketSubject}}</p>
</div>
<p>{{updateMessage}}</p>
<p>You can view and respond to your ticket by logging into your account.</p>
<p>Best regards,<br>UHQ Accounts Support Team</p>`,
    variables: ['name', 'ticketNumber', 'ticketSubject', 'updateMessage', 'isStaffReply'],
    description: 'Sent when support ticket is updated',
    isActive: true
  }
]

export async function seedEmailTemplates() {
  console.log('🌱 Seeding email templates...')

  for (const template of defaultTemplates) {
    try {
      await prisma.emailTemplate.upsert({
        where: { type: template.type },
        update: {
          subject: template.subject,
          body: template.body,
          htmlBody: template.htmlBody,
          variables: template.variables,
          description: template.description,
          isActive: template.isActive
        },
        create: template
      })
      console.log(`✅ Seeded template: ${template.type}`)
    } catch (error) {
      console.error(`❌ Failed to seed template ${template.type}:`, error)
    }
  }

  console.log('✅ Email templates seeding completed!')
}

// Run if called directly
if (require.main === module) {
  seedEmailTemplates()
    .catch((error) => {
      console.error('Error seeding email templates:', error)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}

