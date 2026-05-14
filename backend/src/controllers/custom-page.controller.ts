import type { Request, Response } from 'express'
import prisma from '../configs/db'
import { cacheService } from '../services/cache.service'
import { CustomPageService } from '../services/custom-page.service'
import { handleControllerError, sendCreatedResponse, sendSuccessResponse } from '../utils'
import {
  createCustomPageSchema,
  customPageParamsSchema,
  customPageQuerySchema,
  customPageSlugParamsSchema,
  updateCustomPageSchema,
  type CreateCustomPageInput,
  type CustomPageParams,
  type CustomPageQuery,
  type CustomPageSlugParams,
  type UpdateCustomPageInput
} from '../validations/zod/custom-page.schema'

// Initialize service
const customPageService = new CustomPageService(prisma, cacheService)

// ===============================
// CUSTOM PAGE ADMIN CONTROLLERS
// ===============================

export const createCustomPage = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = createCustomPageSchema.parse(req.body) as CreateCustomPageInput

    const page = await customPageService.createPage(validatedData)

    sendCreatedResponse(res, page, 'Custom page created successfully')
  } catch (error: any) {
    handleControllerError(res, error, 'Failed to create custom page')
  }
}

export const updateCustomPage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = customPageParamsSchema.parse(req.params) as CustomPageParams
    const validatedData = updateCustomPageSchema.parse(req.body) as UpdateCustomPageInput

    const page = await customPageService.updatePage(id, validatedData)

    sendSuccessResponse(res, page, 'Custom page updated successfully')
  } catch (error: any) {
    handleControllerError(res, error, 'Failed to update custom page')
  }
}

export const deleteCustomPage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = customPageParamsSchema.parse(req.params) as CustomPageParams

    await customPageService.deletePage(id)

    sendSuccessResponse(res, null, 'Custom page deleted successfully')
  } catch (error: any) {
    handleControllerError(res, error, 'Failed to delete custom page')
  }
}

export const getCustomPageById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = customPageParamsSchema.parse(req.params) as CustomPageParams

    const page = await customPageService.getPageById(id)

    if (!page) {
      throw new Error('Custom page not found')
    }

    sendSuccessResponse(res, page, 'Custom page retrieved successfully')
  } catch (error: any) {
    handleControllerError(res, error, 'Failed to retrieve custom page')
  }
}

export const getCustomPageBySlug = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = customPageSlugParamsSchema.parse(req.params) as CustomPageSlugParams
    console.log('slug', slug)

    const page = await customPageService.getPageBySlug(slug)

    if (!page) {
      res.status(404).json({
        success: false,
        message: 'Custom page not found',
        data: null
      })
      return
    }

    sendSuccessResponse(res, page, 'Custom page retrieved successfully')
  } catch (error: any) {
    handleControllerError(res, error, 'Failed to retrieve custom page')
  }
}

export const getCustomPages = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = customPageQuerySchema.parse(req.query) as CustomPageQuery

    const result = await customPageService.getPages(query)

    sendSuccessResponse(res, result, 'Custom pages retrieved successfully')
  } catch (error: any) {
    handleControllerError(res, error, 'Failed to retrieve custom pages')
  }
}

export const getCustomPagesInfo = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = req.query.includes
    let includesArray: any[] = []
    if (query && typeof query === 'string') {
      includesArray = query
        .split(',')
        .map((item) => item.trim()) as (keyof typeof prisma.customPage.fields)[]
    }

    const result = await customPageService.getPagesInfo(includesArray, req.query)

    sendSuccessResponse(res, result, 'Custom pages retrieved successfully')
  } catch (error: any) {
    handleControllerError(res, error, 'Failed to retrieve custom pages')
  }
}
