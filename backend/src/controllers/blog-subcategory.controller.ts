import type { Request, Response } from 'express'
import prisma from '../configs/db'
import { BlogSubCategoryService } from '../services/blog-subcategory.services'
import {
  handleControllerError,
  sendCreatedResponse,
  sendNotFoundResponse,
  sendSuccessResponse
} from '../utils'
import {
  blogSubCategoryParamsSchema,
  blogSubCategoryQuerySchema,
  createBlogSubCategorySchema,
  updateBlogSubCategorySchema,
  type BlogSubCategoryParams,
  type BlogSubCategoryQuery,
  type CreateBlogSubCategoryInput,
  type UpdateBlogSubCategoryInput
} from '../validations/zod/blog-subcategory.schema'

const blogSubCategoryService = new BlogSubCategoryService(prisma)

export const getBlogSubCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = blogSubCategoryQuerySchema.parse(req.query) as BlogSubCategoryQuery
    const list = await blogSubCategoryService.findAll(
      query.category ? { categoryId: query.category } : {}
    )
    sendSuccessResponse(res, list, 'Subcategories fetched successfully')
  } catch (error: unknown) {
    handleControllerError(res, error, 'Failed to fetch subcategories')
  }
}

export const getBlogSubCategoryById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = blogSubCategoryParamsSchema.parse(req.params) as BlogSubCategoryParams
    const sub = await blogSubCategoryService.findById(id)
    if (!sub) {
      sendNotFoundResponse(res, 'Subcategory not found')
      return
    }
    sendSuccessResponse(res, sub, 'Subcategory fetched successfully')
  } catch (error: unknown) {
    handleControllerError(res, error, 'Failed to fetch subcategory')
  }
}

export const createBlogSubCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = createBlogSubCategorySchema.parse(req.body) as CreateBlogSubCategoryInput
    const sub = await blogSubCategoryService.create(body)
    sendCreatedResponse(res, sub, 'Subcategory created successfully')
  } catch (error: unknown) {
    handleControllerError(res, error, 'Failed to create subcategory')
  }
}

export const updateBlogSubCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = blogSubCategoryParamsSchema.parse(req.params) as BlogSubCategoryParams
    const body = updateBlogSubCategorySchema.parse(req.body) as UpdateBlogSubCategoryInput
    const sub = await blogSubCategoryService.update(id, body)
    sendSuccessResponse(res, sub, 'Subcategory updated successfully')
  } catch (error: unknown) {
    handleControllerError(res, error, 'Failed to update subcategory')
  }
}

export const deleteBlogSubCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = blogSubCategoryParamsSchema.parse(req.params) as BlogSubCategoryParams
    await blogSubCategoryService.delete(id)
    sendSuccessResponse(res, null, 'Subcategory deleted successfully')
  } catch (error: unknown) {
    handleControllerError(res, error, 'Failed to delete subcategory')
  }
}
