import type { Request, Response, NextFunction } from 'express'
import db from '../configs/db'
import { deliveryTemplateService } from '../services'
import {
  CreateDeliveryTemplateSchema,
  UpdateDeliveryTemplateSchema,
  CreateAuthEmailTemplateSchema,
  UpdateAuthEmailTemplateSchema
} from '../validations/zod/delivery-template.schema'
import { sendErrorResponse } from '../utils/response-handler'

// ==============================
// DELIVERY TEMPLATES
// ==============================

/**
 * Get all delivery templates
 * GET /api/admin/delivery-templates
 */
export const getAllDeliveryTemplates = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const templates = await deliveryTemplateService.getAllTemplates()

    res.json({
      success: true,
      data: templates,
      message: 'Delivery templates retrieved successfully'
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Get default delivery template
 * GET /api/admin/delivery-templates/default
 */
export const getDefaultDeliveryTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const template = await deliveryTemplateService.getDefaultTemplate()

    res.json({
      success: true,
      data: template,
      message: 'Default delivery template retrieved'
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Create delivery template
 * POST /api/admin/delivery-templates
 */
export const createDeliveryTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const validatedData = CreateDeliveryTemplateSchema.parse(req.body)

    const template = await deliveryTemplateService.createTemplate(validatedData)

    res.status(201).json({
      success: true,
      data: template,
      message: 'Delivery template created successfully'
    })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return sendErrorResponse(res, error.errors[0]?.message || 'Validation error', 400)
    }
    next(error)
  }
}

/**
 * Update delivery template
 * PUT /api/admin/delivery-templates/:id
 */
export const updateDeliveryTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { id } = req.params
    const validatedData = UpdateDeliveryTemplateSchema.parse(req.body)

    const template = await deliveryTemplateService.updateTemplate(Number(id), validatedData)

    res.json({
      success: true,
      data: template,
      message: 'Delivery template updated successfully'
    })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return sendErrorResponse(res, error.errors[0]?.message || 'Validation error', 400)
    }
    next(error)
  }
}

/**
 * Delete delivery template
 * DELETE /api/admin/delivery-templates/:id
 */
export const deleteDeliveryTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { id } = req.params

    const template = await deliveryTemplateService.deleteTemplate(Number(id))

    res.json({
      success: true,
      data: template,
      message: 'Delivery template deleted successfully'
    })
  } catch (error) {
    next(error)
  }
}

// ==============================
// AUTH EMAIL TEMPLATES
// ==============================

/**
 * Get all auth email templates
 * GET /api/admin/auth-templates
 */
export const getAllAuthTemplates = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const templates = await deliveryTemplateService.getAllAuthTemplates()

    res.json({
      success: true,
      data: templates,
      message: 'Auth email templates retrieved successfully'
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Get specific auth email template
 * GET /api/admin/auth-templates/:type
 */
export const getAuthTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { type } = req.params

    if (!type) {
      return sendErrorResponse(res, 'Template type is required', 400)
    }

    const template = await deliveryTemplateService.getAuthTemplate(type)

    if (!template) {
      return sendErrorResponse(res, `Auth template not found for type: ${type}`, 404)
    }

    res.json({
      success: true,
      data: template,
      message: 'Auth email template retrieved'
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Create auth email template
 * POST /api/admin/auth-templates
 */
export const createAuthTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const validatedData = CreateAuthEmailTemplateSchema.parse(req.body)

    const template = await deliveryTemplateService.createAuthTemplate(validatedData)

    res.status(201).json({
      success: true,
      data: template,
      message: 'Auth email template created successfully'
    })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return sendErrorResponse(res, error.errors[0]?.message || 'Validation error', 400)
    }
    if (error.message?.includes('already exists')) {
      return sendErrorResponse(res, error.message, 400)
    }
    next(error)
  }
}

/**
 * Update auth email template
 * PUT /api/admin/auth-templates/:type
 */
export const updateAuthTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { type } = req.params

    if (!type) {
      return sendErrorResponse(res, 'Template type is required', 400)
    }

    const validatedData = UpdateAuthEmailTemplateSchema.parse(req.body)

    const template = await deliveryTemplateService.updateAuthTemplate(type, validatedData)

    res.json({
      success: true,
      data: template,
      message: 'Auth email template updated successfully'
    })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return sendErrorResponse(res, error.errors[0]?.message || 'Validation error', 400)
    }
    next(error)
  }
}

/**
 * Delete auth email template
 * DELETE /api/admin/auth-templates/:type
 */
export const deleteAuthTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { type } = req.params

    if (!type) {
      return sendErrorResponse(res, 'Template type is required', 400)
    }

    const template = await deliveryTemplateService.deleteAuthTemplate(type)

    res.json({
      success: true,
      data: template,
      message: 'Auth email template deleted successfully'
    })
  } catch (error) {
    next(error)
  }
}
