import type { NextFunction, Request, Response } from 'express';
import { CategoryService } from '../services/category.services';
import { sendCreatedResponse, sendSuccessResponse, type ApiResponse } from '../utils';
import {
  BulkCategoryDeleteSchema,
  BulkCategoryUpdateSchema,
  CategoryDetailsSchema,
  CategoryIdSchema,
  CategoryMoveSchema,
  CategoryQuerySchema,
  CategoryReorderSchema,
  CategorySlugSchema,
  CategorySortUpdateSchema,
  CategoryTreeSchema,
  CreateCategorySchema,
  ParentCategoryIdSchema,
  UpdateCategorySchema,
} from '../validations/zod/category.schema';

// Initialize service
const categoryService = new CategoryService();

// ================================
// CRUD OPERATIONS
// ================================

export const createCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const validatedData = CreateCategorySchema.parse(req.body);
    const category = await categoryService.create(validatedData);

    return sendCreatedResponse(res, category, 'Category created successfully');
  } catch (error) {
    return next(error);
  }
};

export const getCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = CategoryIdSchema.parse(req.params);
    const { includeRelations } = CategoryDetailsSchema.parse(req.query);

    const category = await categoryService.findById(id.toString(), includeRelations);

    return sendSuccessResponse(res, category, 'Category retrieved successfully');
  } catch (error) {
    return next(error);
  }
};

export const getCategoryBySlug = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { slug } = CategorySlugSchema.parse(req.params);
    const { includeRelations } = CategoryDetailsSchema.parse(req.query);

    const category = await categoryService.findBySlug(slug, includeRelations);

    return sendSuccessResponse(res, category, 'Category retrieved successfully');
  } catch (error) {
    return next(error);
  }
};

export const getCategories = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const query = CategoryQuerySchema.parse(req.query);

    const result = await categoryService.findMany(query);

    return sendSuccessResponse(res, result, 'Categories retrieved successfully');
  } catch (error) {
    return next(error);
  }
};

/**
 * Get categories for public view (defaults to sortOrder)
 */
export const getPublicCategories = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    // Set default sortBy to sortOrder for public routes
    const query = CategoryQuerySchema.parse({
      ...req.query,
      sortBy: req.query.sortBy || 'sortOrder',
      sortOrder: req.query.sortOrder || 'asc',
    });

    const result = await categoryService.findMany(query);

    return sendSuccessResponse(res, result, 'Categories retrieved successfully');
  } catch (error) {
    return next(error);
  }
};

export const updateCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = CategoryIdSchema.parse(req.params);
    const validatedData = UpdateCategorySchema.parse(req.body);

    const category = await categoryService.update(id.toString(), validatedData);

    return sendSuccessResponse(res, category, 'Category updated successfully');
  } catch (error) {
    return next(error);
  }
};

export const deleteCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = CategoryIdSchema.parse(req.params);
    const result = await categoryService.delete(id.toString());

    return sendSuccessResponse(res, result, 'Category deleted successfully');
  } catch (error) {
    return next(error);
  }
};

export const getTrashedCatalogForCategoriesPage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;

    const result = await categoryService.listTrashed({ page, limit });
    return sendSuccessResponse(res, result, 'Trashed items retrieved successfully');
  } catch (error) {
    return next(error);
  }
};

export const restoreCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = CategoryIdSchema.parse(req.params);
    const result = await categoryService.restore(id.toString());
    return sendSuccessResponse(res, result, 'Category restored successfully');
  } catch (error) {
    return next(error);
  }
};

export const permanentDeleteCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = CategoryIdSchema.parse(req.params);
    const result = await categoryService.permanentDelete(id.toString());
    return sendSuccessResponse(res, result, 'Category deleted permanently');
  } catch (error) {
    return next(error);
  }
};

// ================================
// HIERARCHY OPERATIONS
// ================================

export const getCategoryTree = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { includeInactive, includeProductCount } = CategoryTreeSchema.parse(req.query);
    const tree = await categoryService.getCategoryTree(includeInactive, includeProductCount);

    return sendSuccessResponse(res, tree, 'Category tree retrieved successfully');
  } catch (error) {
    return next(error);
  }
};

export const getRootCategories = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { includeProductCount } = CategoryTreeSchema.parse(req.query);
    const categories = await categoryService.getRootCategories(includeProductCount);

    return sendSuccessResponse(res, categories, 'Root categories retrieved successfully');
  } catch (error) {
    return next(error);
  }
};

export const getChildCategories = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { parentId } = ParentCategoryIdSchema.parse(req.params);
    const { includeProductCount } = CategoryTreeSchema.parse(req.query);

    const categories = await categoryService.getChildCategories(
      parentId.toString(),
      includeProductCount
    );

    return sendSuccessResponse(res, categories, 'Child categories retrieved successfully');
  } catch (error) {
    return next(error);
  }
};

export const moveCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = CategoryIdSchema.parse(req.params);
    const { newParentId } = CategoryMoveSchema.parse(req.body);

    const category = await categoryService.moveCategory(id, newParentId);

    return sendSuccessResponse(res, category, 'Category moved successfully');
  } catch (error) {
    return next(error);
  }
};

// ================================
// BULK OPERATIONS
// ================================

export const bulkUpdateCategories = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const validatedData = BulkCategoryUpdateSchema.parse(req.body);
    const result = await categoryService.bulkUpdate(validatedData);

    return sendSuccessResponse(res, result, 'Categories updated successfully');
  } catch (error) {
    return next(error);
  }
};

export const bulkDeleteCategories = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const validatedData = BulkCategoryDeleteSchema.parse(req.body);
    const result = await categoryService.bulkDelete(validatedData);

    return sendSuccessResponse(res, result, 'Categories deleted successfully');
  } catch (error) {
    return next(error);
  }
};

export const updateCategorySortOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const validatedData = CategorySortUpdateSchema.parse(req.body);
    const result = await categoryService.updateSortOrder(validatedData.categories);

    return sendSuccessResponse(res, result, 'Category sort order updated successfully');
  } catch (error) {
    return next(error);
  }
};

// ================================
// REORDER CATEGORY (DRAG & DROP)
// ================================

/**
 * Calculate new sort order between two items using integer gaps
 * Same logic as product reordering
 */
function calculateSortOrder(prevSortOrder: number | null, nextSortOrder: number | null): number {
  const DEFAULT_GAP = 1000;
  const MIN_GAP = 10;

  // Treat 0 as null (no sortOrder set)
  const prev = prevSortOrder === 0 ? null : prevSortOrder;
  const next = nextSortOrder === 0 ? null : nextSortOrder;

  // Insert at beginning (before first item)
  if (prev === null && next !== null) {
    return Math.max(1, next - DEFAULT_GAP);
  }

  // Insert at end (after last item)
  if (prev !== null && next === null) {
    return prev + DEFAULT_GAP;
  }

  // Both are null (first item in empty list OR all items have null/0 sortOrder)
  if (prev === null && next === null) {
    return DEFAULT_GAP;
  }

  // Insert between two items (both have sortOrder values)
  if (prev !== null && next !== null) {
    const gap = next - prev;

    // If items have the same sortOrder, we need to create space
    if (gap === 0) {
      console.warn(
        `[CategoryReorder] Items have same sortOrder (${prev}). Assigning new value: ${prev + 1}`
      );
      return prev + 1;
    }

    // If gap is too small, consider rebalancing
    if (gap < MIN_GAP) {
      console.warn(
        `[CategoryReorder] Small gap detected (${gap}) between ${prev} and ${next}. Consider rebalancing.`
      );
    }

    return Math.floor((prev + next) / 2);
  }

  return DEFAULT_GAP;
}

export const reorderCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = CategoryIdSchema.parse(req.params);
    const { prevSortOrder, nextSortOrder } = CategoryReorderSchema.parse(req.body);

    console.log('[ReorderCategory]', {
      categoryId: id,
      received: { prevSortOrder, nextSortOrder },
    });

    const newSortOrder = calculateSortOrder(prevSortOrder || null, nextSortOrder || null);

    console.log('[ReorderCategory] Calculated sortOrder:', newSortOrder);

    const updatedCategory = await categoryService.updateCategorySortOrder(id, newSortOrder);

    return sendSuccessResponse(
      res,
      { id, sortOrder: updatedCategory.sortOrder },
      'Category reordered successfully'
    );
  } catch (error) {
    return next(error);
  }
};
