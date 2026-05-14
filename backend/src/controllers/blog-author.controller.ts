import type { Request, Response } from 'express'
import prisma from '../configs/db'
import { BlogAuthorService } from '../services/blog-author.services'
import {
  handleControllerError,
  sendCreatedResponse,
  sendNotFoundResponse,
  sendSuccessResponse
} from '../utils'
import {
  blogAuthorParamsSchema,
  blogAuthorQuerySchema,
  createBlogAuthorSchema,
  updateBlogAuthorSchema,
  type BlogAuthorParams,
  type BlogAuthorQuery,
  type CreateBlogAuthorInput,
  type UpdateBlogAuthorInput
} from '../validations/zod/blog-author.schema'

const blogAuthorService = new BlogAuthorService(prisma)

export const getBlogAuthors = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = blogAuthorQuerySchema.parse(req.query) as BlogAuthorQuery
    const active = query.active === 'true'
    const authors = await blogAuthorService.findAll(active ? { active: true } : {})
    sendSuccessResponse(res, authors, 'Authors fetched successfully')
  } catch (error: unknown) {
    handleControllerError(res, error, 'Failed to fetch authors')
  }
}

export const getBlogAuthorById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = blogAuthorParamsSchema.parse(req.params) as BlogAuthorParams
    const author = await blogAuthorService.findById(id)
    if (!author) {
      sendNotFoundResponse(res, 'Author not found')
      return
    }
    sendSuccessResponse(res, author, 'Author fetched successfully')
  } catch (error: unknown) {
    handleControllerError(res, error, 'Failed to fetch author')
  }
}

export const getRandomBlogAuthor = async (req: Request, res: Response): Promise<void> => {
  try {
    const author = await blogAuthorService.findRandomActive()
    if (!author) {
      res.status(404).json({
        success: false,
        message: 'No active authors available'
      })
      return
    }
    sendSuccessResponse(res, author, 'Random author fetched successfully')
  } catch (error: unknown) {
    handleControllerError(res, error, 'Failed to fetch random author')
  }
}

export const createBlogAuthor = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = createBlogAuthorSchema.parse(req.body) as CreateBlogAuthorInput
    const author = await blogAuthorService.create(body)
    sendCreatedResponse(res, author, 'Author created successfully')
  } catch (error: unknown) {
    handleControllerError(res, error, 'Failed to create author')
  }
}

export const updateBlogAuthor = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = blogAuthorParamsSchema.parse(req.params) as BlogAuthorParams
    const body = updateBlogAuthorSchema.parse(req.body) as UpdateBlogAuthorInput
    const author = await blogAuthorService.update(id, body)
    sendSuccessResponse(res, author, 'Author updated successfully')
  } catch (error: unknown) {
    handleControllerError(res, error, 'Failed to update author')
  }
}

export const deleteBlogAuthor = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = blogAuthorParamsSchema.parse(req.params) as BlogAuthorParams
    await blogAuthorService.delete(id)
    sendSuccessResponse(res, null, 'Author deleted successfully')
  } catch (error: unknown) {
    handleControllerError(res, error, 'Failed to delete author')
  }
}
