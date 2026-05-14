import type { Request, Response } from 'express';
import path from 'path';
import prisma from '../configs/db';
import { uploadToR2 } from '../lib/r2';
import { BlogCategoryService } from '../services/blog-category.services';
import { BlogService } from '../services/blog.services';
import { cacheService } from '../services/cache.service';
import { generateRandomString, handleControllerError, sendCreatedResponse, sendSuccessResponse } from '../utils';
import { PAGELIMIT } from '../validations/common/pagination.schema';
import {
  blogCategoryParamsSchema,
  blogCategoryQuerySchema,
  createBlogCategorySchema,
  updateBlogCategorySchema,
  type BlogCategoryParams,
  type BlogCategoryQuery,
  type CreateBlogCategoryInput,
  type UpdateBlogCategoryInput,
} from '../validations/zod/blog-category.schema';
import {
  blogParamsSchema,
  blogQuerySchema,
  blogSlugParamsSchema,
  bulkBlogActionSchema,
  bulkCreateBlogsSchema,
  createBlogSchema,
  updateBlogSchema,
  type BlogParams,
  type BlogQuery,
  type BlogSlugParams,
  type BulkBlogActionInput,
  type BulkCreateBlogsInput,
  type CreateBlogInput,
  type UpdateBlogInput,
} from '../validations/zod/blog.schema';

// Initialize services
const blogCategoryService = new BlogCategoryService(prisma, cacheService);
const blogService = new BlogService(prisma, cacheService);

// ===============================
// BLOG CATEGORY ADMIN CONTROLLERS
// ===============================

export const createBlogCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = createBlogCategorySchema.parse(req.body) as CreateBlogCategoryInput;

    const category = await blogCategoryService.createCategory(validatedData);

    sendCreatedResponse(res, category, 'Blog category created successfully');
  } catch (error: any) {
    handleControllerError(res, error, 'Failed to create blog category');
  }
};

export const updateBlogCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = blogCategoryParamsSchema.parse(req.params) as BlogCategoryParams;
    const validatedData = updateBlogCategorySchema.parse(req.body) as UpdateBlogCategoryInput;

    const category = await blogCategoryService.updateCategory(id, validatedData);

    sendSuccessResponse(res, category, 'Blog category updated successfully');
  } catch (error: any) {
    handleControllerError(res, error, 'Failed to update blog category');
  }
};

export const deleteBlogCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = blogCategoryParamsSchema.parse(req.params) as BlogCategoryParams;

    await blogCategoryService.deleteCategory(id);

    sendSuccessResponse(res, null, 'Blog category deleted successfully');
  } catch (error: any) {
    handleControllerError(res, error, 'Failed to delete blog category');
  }
};

export const getBlogCategoryById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = blogCategoryParamsSchema.parse(req.params) as BlogCategoryParams;

    const category = await blogCategoryService.getCategoryById(id);

    if (!category) {
      throw new Error('Blog category not found');
    }

    sendSuccessResponse(res, category, 'Blog category retrieved successfully');
  } catch (error: any) {
    handleControllerError(res, error, 'Failed to retrieve blog category');
  }
};

export const getBlogCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = blogCategoryQuerySchema.parse(req.query) as BlogCategoryQuery;

    const result = await blogCategoryService.getCategories(query);

    sendSuccessResponse(res, result, 'Blog categories retrieved successfully');
  } catch (error: any) {
    handleControllerError(res, error, 'Failed to retrieve blog categories');
  }
};

// ===============================
// BLOG ADMIN CONTROLLERS
// ===============================

export const createBlog = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = createBlogSchema.parse(req.body) as CreateBlogInput;

    const blog = await blogService.createBlog(validatedData);

    sendCreatedResponse(res, blog, 'Blog created successfully');
  } catch (error: any) {
    handleControllerError(res, error, 'Failed to create blog');
  }
};

export const updateBlog = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = blogParamsSchema.parse(req.params) as BlogParams;
    const validatedData = updateBlogSchema.parse(req.body) as UpdateBlogInput;

    const blog = await blogService.updateBlog(id, validatedData);

    sendSuccessResponse(res, blog, 'Blog updated successfully');
  } catch (error: any) {
    handleControllerError(res, error, 'Failed to update blog');
  }
};

export const deleteBlog = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = blogParamsSchema.parse(req.params) as BlogParams;

    await blogService.deleteBlog(id);

    sendSuccessResponse(res, null, 'Blog deleted successfully');
  } catch (error: any) {
    handleControllerError(res, error, 'Failed to delete blog');
  }
};

export const getBlogByIdAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = blogParamsSchema.parse(req.params) as BlogParams;

    const blog = await blogService.getBlogById(id, false); // Don't increment views for admin

    if (!blog) {
      throw new Error('Blog not found');
    }

    sendSuccessResponse(res, blog, 'Blog retrieved successfully');
  } catch (error: any) {
    handleControllerError(res, error, 'Failed to retrieve blog');
  }
};

export const getBlogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = blogQuerySchema.parse(req.query) as BlogQuery;

    const result = await blogService.getBlogs(query);

    sendSuccessResponse(res, result, 'Blogs retrieved successfully');
  } catch (error: any) {
    handleControllerError(res, error, 'Failed to retrieve blogs');
  }
};

export const bulkActionBlogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedData = bulkBlogActionSchema.parse(req.body) as BulkBlogActionInput;

    await blogService.bulkAction(validatedData);

    sendSuccessResponse(res, null, `Bulk ${validatedData.action} completed successfully`);
  } catch (error: any) {
    handleControllerError(res, error, 'Failed to perform bulk action');
  }
};

const R2_BLOG_FOLDER = 'blog';

/** Upload a single image for blog (e.g. auto-upload). Stored in R2 under blog/ folder. */
export const uploadBlogImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file as Express.Multer.File | undefined;
    if (!file || !file.buffer) {
      return handleControllerError(res, new Error('No file provided'), 'No file provided');
    }
    const ext = path.extname(file.originalname);
    const filename = `${generateRandomString(16)}${ext}`;
    const publicUrl = await uploadToR2(file.buffer, filename, R2_BLOG_FOLDER);
    sendCreatedResponse(res, { url: publicUrl }, 'Image uploaded successfully');
  } catch (error: any) {
    handleControllerError(res, error, 'Failed to upload blog image');
  }
};

/** Create multiple blogs with category, author rotation, and scheduling. */
export const createBulkBlogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const validated = bulkCreateBlogsSchema.parse(req.body) as BulkCreateBlogsInput;
    const { count, data } = await blogService.createBulkBlogs(validated);
    sendCreatedResponse(
      res,
      { count, data },
      `Successfully created ${count} blog${count !== 1 ? 's' : ''}`
    );
  } catch (error: any) {
    handleControllerError(res, error, 'Failed to create bulk blogs');
  }
};

// ===============================
// PUBLIC BLOG CONTROLLERS
// ===============================

export const getBlogBySlugPublic = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = blogSlugParamsSchema.parse(req.params) as BlogSlugParams;

    const blog = await blogService.getBlogBySlug(slug, false);

    const isLive = !!blog?.isPublished && (!blog?.publishedAt || new Date(blog.publishedAt) <= new Date());
    if (!blog || !isLive) {
      throw new Error('Blog not found');
    }

    await blogService.incrementViews(blog.id);
    blog.views += 1;

    sendSuccessResponse(res, blog, 'Blog retrieved successfully');
  } catch (error: any) {
    handleControllerError(res, error, 'Failed to retrieve blog');
  }
};

export const getBlogByIdPublic = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = blogParamsSchema.parse(req.params) as BlogParams;

    const blog = await blogService.getBlogById(id, false);

    const isLive = !!blog?.isPublished && (!blog?.publishedAt || new Date(blog.publishedAt) <= new Date());
    if (!blog || !isLive) {
      throw new Error('Blog not found');
    }

    await blogService.incrementViews(blog.id);
    blog.views += 1;

    sendSuccessResponse(res, blog, 'Blog retrieved successfully');
  } catch (error: any) {
    handleControllerError(res, error, 'Failed to retrieve blog');
  }
};

export const getBlogsPublic = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = blogQuerySchema.parse(req.query) as BlogQuery;

    // Force published blogs only for public access
    const publicQuery = { ...query, isPublished: true };

    const result = await blogService.getBlogs(publicQuery, { onlyVisibleNow: true });

    sendSuccessResponse(res, result, 'Blogs retrieved successfully');
  } catch (error: any) {
    handleControllerError(res, error, 'Failed to retrieve blogs');
  }
};

export const getPopularBlogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : PAGELIMIT;

    const blogs = await blogService.getPopularBlogs(limit);

    sendSuccessResponse(res, blogs, 'Popular blogs retrieved successfully');
  } catch (error: any) {
    handleControllerError(res, error, 'Failed to retrieve popular blogs');
  }
};

export const getRecentBlogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : PAGELIMIT;

    const blogs = await blogService.getRecentBlogs(limit);

    sendSuccessResponse(res, blogs, 'Recent blogs retrieved successfully');
  } catch (error: any) {
    handleControllerError(res, error, 'Failed to retrieve recent blogs');
  }
};

export const getBlogsByCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = blogCategoryParamsSchema.parse(req.params) as BlogCategoryParams;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : PAGELIMIT;

    const blogs = await blogService.getBlogsByCategory(id, limit);

    sendSuccessResponse(res, blogs, 'Category blogs retrieved successfully');
  } catch (error: any) {
    handleControllerError(res, error, 'Failed to retrieve category blogs');
  }
};

export const getBlogCategoriesPublic = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = blogCategoryQuerySchema.parse(req.query) as BlogCategoryQuery;

    const result = await blogCategoryService.getCategories(query);

    sendSuccessResponse(res, result, 'Blog categories retrieved successfully');
  } catch (error: any) {
    handleControllerError(res, error, 'Failed to retrieve blog categories');
  }
};

export const getBlogTags = async (req: Request, res: Response): Promise<void> => {
  try {
    const tags = await blogService.getAllTags();

    sendSuccessResponse(res, tags, 'Blog tags retrieved successfully');
  } catch (error: any) {
    handleControllerError(res, error, 'Failed to retrieve blog tags');
  }
};
