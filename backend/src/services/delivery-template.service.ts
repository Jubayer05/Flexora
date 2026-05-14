import type {
  CreateDeliveryTemplate,
  UpdateDeliveryTemplate,
  CreateAuthEmailTemplate,
  UpdateAuthEmailTemplate
} from '../validations/zod/delivery-template.schema'

import db from '../configs/db'

export class DeliveryTemplateService {
  // ==============================
  // DELIVERY TEMPLATES
  // ==============================

  async getDefaultTemplate() {
    const template = await db.deliveryTemplate.findFirst({
      where: { isDefault: true, isActive: true }
    })

    if (!template) {
      return {
        thankYouMessage: '',
        couponPromotionText: '',
        supportContactInfo: '',
        feedbackRequestText: '',
        credentialsHeader: '',
        credentialsFormat: '',
        credentialsFooter: '____ end of goods ____'
      }
    }

    return template
  }

  async getAllTemplates() {
    return await db.deliveryTemplate.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    })
  }

  async getTemplateById(id: number) {
    return await db.deliveryTemplate.findUnique({
      where: { id }
    })
  }

  async createTemplate(data: CreateDeliveryTemplate) {
    if (data.isDefault) {
      await db.deliveryTemplate.updateMany({
        where: { isDefault: true },
        data: { isDefault: false }
      })
    }

    return await db.deliveryTemplate.create({
      data: {
        ...data,
        isActive: true
      }
    })
  }

  async updateTemplate(id: number, data: UpdateDeliveryTemplate) {
    if (data.isDefault) {
      await db.deliveryTemplate.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false }
      })
    }

    return await db.deliveryTemplate.update({
      where: { id },
      data
    })
  }

  async deleteTemplate(id: number) {
    return await db.deliveryTemplate.delete({
      where: { id }
    })
  }

  /**
   * Replace template variables with actual values
   */
  replaceVariables(template: string, replacements: Record<string, string>): string {
    let result = template

    for (const [key, value] of Object.entries(replacements)) {
      const regex = new RegExp(`{{${key}}}`, 'g')
      result = result.replace(regex, value)
    }

    return result
  }

  // ==============================
  // AUTH EMAIL TEMPLATES
  // ==============================

  async getAuthTemplate(type: string) {
    const template = await db.authEmailTemplate.findUnique({
      where: { type }
    })

    return template
  }

  async getAllAuthTemplates() {
    return await db.authEmailTemplate.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    })
  }

  async createAuthTemplate(data: CreateAuthEmailTemplate) {
    const existing = await db.authEmailTemplate.findUnique({
      where: { type: data.type }
    })

    if (existing) {
      return await db.authEmailTemplate.update({
        where: { type: data.type },
        data: {
          subject: data.subject,
          body: data.body,
          isActive: data.isActive ?? true
        }
      })
    }

    return await db.authEmailTemplate.create({
      data: {
        ...data,
        isActive: true
      }
    })
  }

  async updateAuthTemplate(type: string, data: UpdateAuthEmailTemplate) {
    return await db.authEmailTemplate.update({
      where: { type },
      data
    })
  }

  async deleteAuthTemplate(type: string) {
    return await db.authEmailTemplate.delete({
      where: { type }
    })
  }
}

// Export singleton instance
export const deliveryTemplateService = new DeliveryTemplateService()
