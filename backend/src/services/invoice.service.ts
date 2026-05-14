/**
 * Invoice Service
 * Generates PDF invoices for orders on-the-fly
 */

import PDFDocument from 'pdfkit'
import db from '../configs/db'
import { sendEmail } from '../libs/email'
import {
  COLORS,
  COMPANY_INFO,
  CONTENT_WIDTH,
  FONTS,
  formatCurrency,
  formatDate,
  formatDateTime,
  getOrderStatusDisplay,
  getPaymentMethodName,
  getPaymentStatusDisplay,
  PAGE_WIDTH,
  SIZES,
  SPACING
} from '../utils/invoice-template'

export class InvoiceService {
  /**
   * Generate invoice PDF for an order
   * Returns a PDF stream
   */
  async generateInvoicePDF(orderId: number): Promise<PDFKit.PDFDocument> {
    // Fetch order with all related data
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true
          }
        },
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            price: true,
            platform: true
          }
        },
        payment: {
          select: {
            id: true,
            status: true,
            gateway: true,
            gatewayTxnId: true,
            binanceOrderId: true,
            paidAt: true,
            amount: true,
            paidAmount: true,
            method: {
              select: {
                name: true,
                gateway: true
              }
            }
          }
        }
      }
    })

    if (!order) {
      throw new Error('Order not found')
    }

    // Create PDF document
    const doc = new PDFDocument({
      size: 'A4',
      margin: SPACING.pageMargin,
      info: {
        Title: `Invoice ${order.orderNumber}`,
        Author: COMPANY_INFO.name,
        Subject: `Invoice for order ${order.orderNumber}`,
        Keywords: 'invoice, order, receipt'
      }
    })

    // Build PDF content
    this.addHeader(doc)
    this.addCompanyInfo(doc)
    this.addInvoiceInfo(doc, order)
    this.addCustomerInfo(doc, order)
    this.addOrderItems(doc, order)
    this.addPaymentInfo(doc, order)
    this.addFooter(doc)

    // Don't end the document here - let the controller handle it
    // doc.end();

    return doc
  }

  /**
   * Add header section with logo and title
   */
  private addHeader(doc: PDFKit.PDFDocument) {
    // Title
    doc
      .font(FONTS.bold)
      .fontSize(SIZES.title)
      .fillColor(COLORS.primary)
      .text('INVOICE', SPACING.pageMargin, SPACING.pageMargin, {
        align: 'left'
      })

    // Company name (right side)
    doc
      .font(FONTS.bold)
      .fontSize(SIZES.heading)
      .fillColor(COLORS.text)
      .text(COMPANY_INFO.name, SPACING.pageMargin, SPACING.pageMargin, {
        align: 'right'
      })

    // Tagline
    doc
      .font(FONTS.regular)
      .fontSize(SIZES.small)
      .fillColor(COLORS.textLight)
      .text(COMPANY_INFO.tagline, SPACING.pageMargin, SPACING.pageMargin + SIZES.heading + 5, {
        align: 'right'
      })

    doc.moveDown(2)
  }

  /**
   * Add company information
   */
  private addCompanyInfo(doc: PDFKit.PDFDocument) {
    const startY = doc.y

    doc
      .font(FONTS.bold)
      .fontSize(SIZES.small)
      .fillColor(COLORS.text)
      .text('FROM:', SPACING.pageMargin, startY)

    doc
      .font(FONTS.regular)
      .fontSize(SIZES.small)
      .fillColor(COLORS.textLight)
      .text(COMPANY_INFO.name, SPACING.pageMargin, doc.y + 5)
      .text(COMPANY_INFO.address.line1)
      .text(COMPANY_INFO.address.line2)
      .text(
        `${COMPANY_INFO.address.city}, ${COMPANY_INFO.address.state} ${COMPANY_INFO.address.zip}`
      )
      .text(COMPANY_INFO.address.country)
      .text(COMPANY_INFO.email)
      .text(COMPANY_INFO.website)

    doc.moveDown(2)
  }

  /**
   * Add invoice information (invoice number, date, etc.)
   */
  private addInvoiceInfo(doc: PDFKit.PDFDocument, order: any) {
    const startY = doc.y
    const rightColumnX = PAGE_WIDTH - SPACING.pageMargin - 200

    // Invoice details box
    doc
      .rect(rightColumnX - 10, startY - 10, 210, 80)
      .fillAndStroke(COLORS.background, COLORS.border)

    // Invoice number
    doc
      .font(FONTS.bold)
      .fontSize(SIZES.small)
      .fillColor(COLORS.text)
      .text('Invoice Number:', rightColumnX, startY)

    doc
      .font(FONTS.regular)
      .fontSize(SIZES.small)
      .fillColor(COLORS.textLight)
      .text(order.orderNumber, rightColumnX + 90, startY)

    // Invoice date
    doc
      .font(FONTS.bold)
      .fontSize(SIZES.small)
      .fillColor(COLORS.text)
      .text('Invoice Date:', rightColumnX, doc.y + 5)

    doc
      .font(FONTS.regular)
      .fontSize(SIZES.small)
      .fillColor(COLORS.textLight)
      .text(formatDate(order.createdAt), rightColumnX + 90, doc.y - SIZES.small - 5)

    // Order status
    const orderStatus = getOrderStatusDisplay(order.status)
    doc
      .font(FONTS.bold)
      .fontSize(SIZES.small)
      .fillColor(COLORS.text)
      .text('Status:', rightColumnX, doc.y + 5)

    doc
      .font(FONTS.bold)
      .fontSize(SIZES.small)
      .fillColor(orderStatus.color)
      .text(orderStatus.text, rightColumnX + 90, doc.y - SIZES.small - 5)

    doc.moveDown(3)
  }

  /**
   * Add customer information
   */
  private addCustomerInfo(doc: PDFKit.PDFDocument, order: any) {
    const startY = doc.y

    doc
      .font(FONTS.bold)
      .fontSize(SIZES.small)
      .fillColor(COLORS.text)
      .text('BILL TO:', SPACING.pageMargin, startY)

    if (order.user) {
      // Registered user
      doc
        .font(FONTS.regular)
        .fontSize(SIZES.small)
        .fillColor(COLORS.textLight)
        .text(order.user.firstName || 'Customer', SPACING.pageMargin, doc.y + 5)
        .text(order.user.email)
    } else {
      // Guest order
      doc
        .font(FONTS.regular)
        .fontSize(SIZES.small)
        .fillColor(COLORS.textLight)
        .text(order.customerName || 'Guest Customer', SPACING.pageMargin, doc.y + 5)
        .text(order.guestEmail || 'N/A')
    }

    doc.moveDown(2)
  }

  /**
   * Add order items table
   */
  private addOrderItems(doc: PDFKit.PDFDocument, order: any) {
    const tableTop = doc.y
    const itemHeight = 30
    const multiItemOrder = order.meta && typeof order.meta === 'object' ? (order.meta as any).multiItemOrder : null
    const orderItems = Array.isArray(multiItemOrder?.items) && multiItemOrder.items.length > 0
      ? multiItemOrder.items.map((item: any) => ({
          name: item.productName || order.product?.name || 'Product',
          sku: item.productSku || '',
          quantity: Number(item.quantity || 0),
          unitPrice: Number(item.unitPrice || 0)
        }))
      : [
          {
            name: order.product.name,
            sku: order.product.sku,
            quantity: order.quantity,
            unitPrice: Number(order.unitPrice)
          }
        ]

    // Table header
    doc
      .rect(SPACING.pageMargin, tableTop, CONTENT_WIDTH, 25)
      .fillAndStroke(COLORS.primary, COLORS.primary)

    doc
      .font(FONTS.bold)
      .fontSize(SIZES.small)
      .fillColor(COLORS.white)
      .text('Product', SPACING.pageMargin + 10, tableTop + 8, { width: 200 })
      .text('SKU', SPACING.pageMargin + 220, tableTop + 8, { width: 100 })
      .text('Qty', SPACING.pageMargin + 330, tableTop + 8, { width: 50 })
      .text('Unit Price', SPACING.pageMargin + 390, tableTop + 8, { width: 70, align: 'right' })

    let currentRowY = tableTop + 25
    orderItems.forEach((item: { name: string; sku: string; quantity: number; unitPrice: number }) => {
      doc.rect(SPACING.pageMargin, currentRowY, CONTENT_WIDTH, itemHeight).stroke(COLORS.border)

      doc
        .font(FONTS.regular)
        .fontSize(SIZES.small)
        .fillColor(COLORS.text)
        .text(item.name, SPACING.pageMargin + 10, currentRowY + 10, { width: 200 })
        .text(item.sku || '-', SPACING.pageMargin + 220, currentRowY + 10, { width: 100 })
        .text(item.quantity.toString(), SPACING.pageMargin + 330, currentRowY + 10, { width: 50 })
        .text(formatCurrency(item.unitPrice), SPACING.pageMargin + 390, currentRowY + 10, {
          width: 70,
          align: 'right'
        })

      currentRowY += itemHeight
    })

    doc.y = currentRowY + 20

    // Totals section
    const totalsX = PAGE_WIDTH - SPACING.pageMargin - 200
    const lineSpacing = 18

    // Subtotal
    doc
      .font(FONTS.regular)
      .fontSize(SIZES.small)
      .fillColor(COLORS.text)
      .text('Subtotal:', totalsX, doc.y)

    doc
      .font(FONTS.regular)
      .fontSize(SIZES.small)
      .fillColor(COLORS.text)
      .text(formatCurrency(order.subtotal), totalsX + 100, doc.y - SIZES.small, {
        width: 100,
        align: 'right'
      })

    // Extract discount breakdowns from order meta
    const orderMeta = order.meta as any
    const subscriptionInfo = orderMeta?.subscription
    const rankInfo = orderMeta?.rank
    const couponInfo = orderMeta?.coupon
    let currentY = doc.y

    // Subscription discount (if any)
    if (subscriptionInfo?.discountAmount && Number(subscriptionInfo.discountAmount) > 0) {
      doc
        .font(FONTS.regular)
        .fontSize(SIZES.small)
        .fillColor(COLORS.text)
        .text(
          `Subscription Discount (${subscriptionInfo.discountPercent}%):`,
          totalsX,
          currentY + lineSpacing
        )

      doc
        .font(FONTS.regular)
        .fontSize(SIZES.small)
        .fillColor(COLORS.success)
        .text(
          `-${formatCurrency(subscriptionInfo.discountAmount)}`,
          totalsX + 100,
          currentY + lineSpacing,
          {
            width: 100,
            align: 'right'
          }
        )

      currentY += lineSpacing
    }

    // Rank discount (if any)
    if (rankInfo?.discountAmount && Number(rankInfo.discountAmount) > 0) {
      doc
        .font(FONTS.regular)
        .fontSize(SIZES.small)
        .fillColor(COLORS.text)
        .text(
          `Rank Discount - ${rankInfo.rankName} (${rankInfo.discountPercent}%):`,
          totalsX,
          currentY + lineSpacing
        )

      doc
        .font(FONTS.regular)
        .fontSize(SIZES.small)
        .fillColor(COLORS.success)
        .text(
          `-${formatCurrency(rankInfo.discountAmount)}`,
          totalsX + 100,
          currentY + lineSpacing,
          {
            width: 100,
            align: 'right'
          }
        )

      currentY += lineSpacing
    }

    // Coupon discount (if any)
    if (couponInfo?.discountAmount && Number(couponInfo.discountAmount) > 0) {
      const couponLabel = couponInfo.discountPercent
        ? `Coupon (${couponInfo.code}) - ${couponInfo.discountPercent}%:`
        : `Coupon (${couponInfo.code}):`

      doc
        .font(FONTS.regular)
        .fontSize(SIZES.small)
        .fillColor(COLORS.text)
        .text(couponLabel, totalsX, currentY + lineSpacing)

      doc
        .font(FONTS.regular)
        .fontSize(SIZES.small)
        .fillColor(COLORS.success)
        .text(
          `-${formatCurrency(couponInfo.discountAmount)}`,
          totalsX + 100,
          currentY + lineSpacing,
          {
            width: 100,
            align: 'right'
          }
        )

      currentY += lineSpacing
    }

    // Total discount (if any) - for backwards compatibility or other discounts
    const remainingDiscount =
      Number(order.discount) -
      (Number(subscriptionInfo?.discountAmount || 0) +
        Number(rankInfo?.discountAmount || 0) +
        Number(couponInfo?.discountAmount || 0))

    if (remainingDiscount > 0) {
      doc
        .font(FONTS.regular)
        .fontSize(SIZES.small)
        .fillColor(COLORS.text)
        .text('Other Discount:', totalsX, currentY + lineSpacing)

      doc
        .font(FONTS.regular)
        .fontSize(SIZES.small)
        .fillColor(COLORS.success)
        .text(`-${formatCurrency(remainingDiscount)}`, totalsX + 100, currentY + lineSpacing, {
          width: 100,
          align: 'right'
        })

      currentY += lineSpacing
    }

    // Update doc.y to current position
    doc.y = currentY

    // Calculate tax (if applicable)
    // Tax can be stored in order meta or calculated based on settings
    const orderMetaForTax = order.meta as any
    const taxRate = orderMetaForTax?.taxRate || 0 // Tax rate as percentage (e.g., 10 for 10%)
    const taxAmount = taxRate > 0 ? (Number(order.subtotal) - Number(order.discount || 0)) * (taxRate / 100) : 0

    // Display tax if applicable
    if (taxAmount > 0) {
      doc
        .font(FONTS.regular)
        .fontSize(SIZES.small)
        .fillColor(COLORS.text)
        .text(`Tax (${taxRate}%):`, totalsX, doc.y + lineSpacing)

      doc
        .font(FONTS.regular)
        .fontSize(SIZES.small)
        .fillColor(COLORS.text)
        .text(formatCurrency(taxAmount), totalsX + 100, doc.y + lineSpacing - SIZES.small, {
          width: 100,
          align: 'right'
        })

      currentY += lineSpacing
      doc.y = currentY
    }

    // Total line
    doc
      .moveTo(totalsX, doc.y + lineSpacing)
      .lineTo(PAGE_WIDTH - SPACING.pageMargin, doc.y + lineSpacing)
      .stroke(COLORS.border)

    // Total amount (subtotal - discounts + tax)
    const calculatedTotal = Number(order.subtotal) - Number(order.discount || 0) + taxAmount

    doc
      .font(FONTS.bold)
      .fontSize(SIZES.subheading)
      .fillColor(COLORS.text)
      .text('Total:', totalsX, doc.y + lineSpacing + 5)

    doc
      .font(FONTS.bold)
      .fontSize(SIZES.subheading)
      .fillColor(COLORS.primary)
      .text(formatCurrency(calculatedTotal), totalsX + 100, doc.y - SIZES.subheading - 5, {
        width: 100,
        align: 'right'
      })

    doc.moveDown(3)
  }

  /**
   * Add payment information
   */
  private addPaymentInfo(doc: PDFKit.PDFDocument, order: any) {
    doc
      .font(FONTS.bold)
      .fontSize(SIZES.subheading)
      .fillColor(COLORS.text)
      .text('Payment Information', SPACING.pageMargin, doc.y)

    doc.moveDown(0.5)

    if (order.payment) {
      const payment = order.payment
      const paymentStatus = getPaymentStatusDisplay(payment.status)

      // Payment method
      doc
        .font(FONTS.bold)
        .fontSize(SIZES.small)
        .fillColor(COLORS.text)
        .text('Payment Method:', SPACING.pageMargin, doc.y)

      doc
        .font(FONTS.regular)
        .fontSize(SIZES.small)
        .fillColor(COLORS.textLight)
        .text(getPaymentMethodName(payment.gateway), SPACING.pageMargin + 120, doc.y - SIZES.small)

      // Payment status
      doc
        .font(FONTS.bold)
        .fontSize(SIZES.small)
        .fillColor(COLORS.text)
        .text('Payment Status:', SPACING.pageMargin, doc.y + 5)

      doc
        .font(FONTS.bold)
        .fontSize(SIZES.small)
        .fillColor(paymentStatus.color)
        .text(paymentStatus.text, SPACING.pageMargin + 120, doc.y - SIZES.small - 5)

      // Transaction ID / Binance Order ID
      // For Binance payments, show binanceOrderId; otherwise show gatewayTxnId
      const transactionId = payment.gateway === 'binance' && payment.binanceOrderId
        ? payment.binanceOrderId
        : payment.gatewayTxnId

      if (transactionId) {
        const label = payment.gateway === 'binance' ? 'Binance Order ID:' : 'Transaction ID:'
        doc
          .font(FONTS.bold)
          .fontSize(SIZES.small)
          .fillColor(COLORS.text)
          .text(label, SPACING.pageMargin, doc.y + 5)

        doc
          .font(FONTS.regular)
          .fontSize(SIZES.small)
          .fillColor(COLORS.textLight)
          .text(transactionId, SPACING.pageMargin + 120, doc.y - SIZES.small - 5)
      }

      // Payment date
      if (payment.paidAt) {
        doc
          .font(FONTS.bold)
          .fontSize(SIZES.small)
          .fillColor(COLORS.text)
          .text('Payment Date:', SPACING.pageMargin, doc.y + 5)

        doc
          .font(FONTS.regular)
          .fontSize(SIZES.small)
          .fillColor(COLORS.textLight)
          .text(formatDateTime(payment.paidAt), SPACING.pageMargin + 120, doc.y - SIZES.small - 5)
      }
    } else {
      doc
        .font(FONTS.italic)
        .fontSize(SIZES.small)
        .fillColor(COLORS.textLight)
        .text('No payment information available', SPACING.pageMargin, doc.y)
    }

    doc.moveDown(3)
  }

  /**
   * Add footer with thank you message and notes
   */
  private addFooter(doc: PDFKit.PDFDocument) {
    const footerY = 750 // Fixed position near bottom

    // Thank you message
    doc
      .font(FONTS.bold)
      .fontSize(SIZES.body)
      .fillColor(COLORS.primary)
      .text('Thank you for your business!', SPACING.pageMargin, footerY, {
        align: 'center',
        width: CONTENT_WIDTH
      })

    // Support info
    doc
      .font(FONTS.regular)
      .fontSize(SIZES.small)
      .fillColor(COLORS.textLight)
      .text(
        `For any questions or support, please contact us at ${COMPANY_INFO.email}`,
        SPACING.pageMargin,
        footerY + 20,
        {
          align: 'center',
          width: CONTENT_WIDTH
        }
      )
  }
}
