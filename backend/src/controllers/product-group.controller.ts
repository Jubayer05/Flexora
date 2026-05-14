import { Prisma } from '@prisma/client'
import type { NextFunction, Request, Response } from 'express'
import { ProductGroupService } from '../services/product-group.service'
import {
  sendBadRequestResponse,
  sendCreatedResponse,
  sendSuccessResponse,
  type ApiResponse
} from '../utils'
import {
  CreateProductGroupSchema,
  ProductGroupIdSchema,
  ProductGroupQuerySchema,
  ProductGroupReorderSchema,
  ProductGroupSlugSchema,
  UpdateProductGroupSchema
} from '../validations/zod/product-group.schema'

function calculateSortOrder(prevSortOrder: number | null, nextSortOrder: number | null): number {
  const DEFAULT_GAP = 1000
  const MIN_GAP = 10
  const prev = prevSortOrder === 0 ? null : prevSortOrder
  const next = nextSortOrder === 0 ? null : nextSortOrder
  if (prev === null && next !== null) return Math.max(1, next - DEFAULT_GAP)
  if (prev !== null && next === null) return prev + DEFAULT_GAP
  if (prev === null && next === null) return DEFAULT_GAP
  if (prev !== null && next !== null) {
    const gap = next - prev
    if (gap === 0) return prev + 1
    return Math.floor((prev + next) / 2)
  }
  return DEFAULT_GAP
}

// Initialize service
const productGroupService = new ProductGroupService()

// ================================
// CRUD OPERATIONS
// ================================

/**
 * Create a new product group
 */
export const createProductGroup = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const validatedData = CreateProductGroupSchema.parse(req.body)
    const productGroup = await productGroupService.create(validatedData)

    return sendCreatedResponse(res, productGroup, 'Product group created successfully')
  } catch (error) {
    return next(error)
  }
}

/**
 * Get product group by ID
 */
export const getProductGroup = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = ProductGroupIdSchema.parse(req.params)
    const includeProducts = req.query.includeProducts === 'true'

    const productGroup = await productGroupService.findById(id, includeProducts)

    return sendSuccessResponse(res, productGroup, 'Product group retrieved successfully')
  } catch (error) {
    return next(error)
  }
}

/**
 * Get product group by slug
 */
export const getProductGroupBySlug = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { slug } = ProductGroupSlugSchema.parse(req.params)
    const includeProducts = req.query.includeProducts === 'true'

    const productGroup = await productGroupService.findBySlug(slug, includeProducts)

    return sendSuccessResponse(res, productGroup, 'Product group retrieved successfully')
  } catch (error) {
    return next(error)
  }
}

/**
 * Get all product groups with pagination
 */
export const getProductGroups = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const query = ProductGroupQuerySchema.parse(req.query)
    const result = await productGroupService.findMany(query)

    return sendSuccessResponse(res, result, 'Product groups retrieved successfully')
  } catch (error) {
    return next(error)
  }
}

/**
 * Get all product groups (simple list for dropdowns)
 * Now supports search and pagination
 */
export const getAllProductGroups = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const query = ProductGroupQuerySchema.parse(req.query)
    const result = await productGroupService.findAll(query)

    // If result has pagination, return it as-is, otherwise wrap in array for backward compatibility
    if (result && typeof result === 'object' && 'productGroups' in result) {
      return sendSuccessResponse(res, result, 'Product groups list retrieved successfully')
    }

    // Backward compatibility: if it's an array, wrap it
    return sendSuccessResponse(
      res,
      { productGroups: result, pagination: null },
      'Product groups list retrieved successfully'
    )
  } catch (error) {
    return next(error)
  }
}

/**
 * Update product group
 */
export const updateProductGroup = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = ProductGroupIdSchema.parse(req.params)
    const validatedData = UpdateProductGroupSchema.parse(req.body)

    const productGroup = await productGroupService.update(id, validatedData)

    return sendSuccessResponse(res, productGroup, 'Product group updated successfully')
  } catch (error) {
    return next(error)
  }
}

/**
 * Reorder product group (drag & drop)
 */
export const reorderProductGroup = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = ProductGroupIdSchema.parse(req.params)
    const { prevSortOrder, nextSortOrder } = ProductGroupReorderSchema.parse(req.body)
    const newSortOrder = calculateSortOrder(prevSortOrder ?? null, nextSortOrder ?? null)
    const updated = await productGroupService.updateSortOrder(id, newSortOrder)
    return sendSuccessResponse(
      res,
      { id: updated.id, sortOrder: updated.sortOrder },
      'Product group reordered successfully'
    )
  } catch (error) {
    if (error instanceof Prisma.PrismaClientValidationError) {
      return sendBadRequestResponse(
        res,
        'Reordering is not available. Run in backend: npx prisma generate && npx prisma migrate deploy'
      )
    }
    return next(error)
  }
}

/**
 * Delete product group
 */
export const deleteProductGroup = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = ProductGroupIdSchema.parse(req.params)

    const result = await productGroupService.delete(id)

    return sendSuccessResponse(res, result, result.message)
  } catch (error) {
    return next(error)
  }
}

export const getTrashedProductGroups = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const page = req.query.page ? parseInt(String(req.query.page), 10) : 1
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20
    const result = await productGroupService.listTrashed({ page, limit })
    return sendSuccessResponse(res, result, 'Trashed product groups retrieved successfully')
  } catch (error) {
    return next(error)
  }
}

export const restoreProductGroup = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = ProductGroupIdSchema.parse(req.params)
    const result = await productGroupService.restore(id)
    return sendSuccessResponse(res, result, 'Product group restored successfully')
  } catch (error) {
    return next(error)
  }
}

export const permanentDeleteProductGroup = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = ProductGroupIdSchema.parse(req.params)
    const result = await productGroupService.permanentDelete(id)
    return sendSuccessResponse(res, result, 'Product group deleted permanently')
  } catch (error) {
    return next(error)
  }
}
