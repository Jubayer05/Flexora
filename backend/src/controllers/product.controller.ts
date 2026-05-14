import type { NextFunction, Request, Response } from 'express';
import { ProductService } from '../services/product.services';
import { sendCreatedResponse, sendSuccessResponse, type ApiResponse } from '../utils';
import {
  BulkProductDeleteSchema,
  BulkProductUpdateSchema,
  CreateProductSchema,
  PrivateUrlAccessSchema,
  ProductAnalyticsSchema,
  ProductDetailsSchema,
  ProductFilterSchema,
  ProductIdSchema,
  ProductImportSchema,
  ProductQuerySchema,
  ProductReorderSchema,
  ProductSlugSchema,
  ProductSkuSchema,
  UpdateProductSchema,
} from '../validations/zod/product.schema';

// Initialize service
const productService = new ProductService();

// ================================
// CRUD OPERATIONS
// ================================

/**
 * Generate a unique SKU for new product
 */
export const generateUniqueSku = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const sku = await productService.generateUniqueSku();

    return sendSuccessResponse(
      res,
      { sku: sku.toUpperCase() },
      'Unique SKU generated successfully'
    );
  } catch (error) {
    return next(error);
  }
};

export const createProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const validatedData = CreateProductSchema.parse(req.body);
    const product = await productService.create(validatedData);

    return sendCreatedResponse(res, product, 'Product created successfully');
  } catch (error) {
    return next(error);
  }
};

export const getProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = ProductIdSchema.parse(req.params);
    const { includeAccounts } = ProductDetailsSchema.parse(req.query);

    const product = await productService.findById(id, includeAccounts);

    return sendSuccessResponse(res, product, 'Product retrieved successfully');
  } catch (error) {
    return next(error);
  }
};

export const getProductBySku = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { sku } = ProductSkuSchema.parse(req.params);
    const product = await productService.findBySku(sku);

    return sendSuccessResponse(res, product, 'Product retrieved successfully');
  } catch (error) {
    return next(error);
  }
};

export const getProductBySlug = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { slug } = ProductSlugSchema.parse(req.params);
    const { includeAccounts } = ProductDetailsSchema.parse(req.query);
    const product = await productService.findBySlug(slug, includeAccounts);

    return sendSuccessResponse(res, product, 'Product retrieved successfully');
  } catch (error) {
    return next(error);
  }
};

export const getProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const query = ProductQuerySchema.parse(req.query);

    const result = await productService.findMany(query);

    return sendSuccessResponse(res, result, 'Products retrieved successfully');
  } catch (error) {
    return next(error);
  }
};

/**
 * Get products for public view (defaults to sortOrder)
 * Automatically excludes private products from public listings
 */
export const getPublicProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    // Set default sortBy to sortOrder for public routes
    // Automatically exclude private products from public listings
    const query = ProductQuerySchema.parse({
      ...req.query,
      isActive: req.query.isActive || 'true',
      sortBy: req.query.sortBy || 'sortOrder',
      sortOrder: req.query.sortOrder || 'asc',
      isPrivate: 'false', // Always exclude private products from public listings
    });

    const result = await productService.findMany(query);

    return sendSuccessResponse(res, result, 'Products retrieved successfully');
  } catch (error) {
    return next(error);
  }
};

/**
 * Get products by categories and/or groups (no pagination)
 */
export const getProductsByFilter = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const filter = ProductFilterSchema.parse(req.query);

    const products = await productService.findByFilter(filter);

    return sendSuccessResponse(
      res,
      products,
      `Found ${products.length} product(s) matching the filter`
    );
  } catch (error) {
    return next(error);
  }
};

export const updateProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = ProductIdSchema.parse(req.params);
    const validatedData = UpdateProductSchema.parse({ ...req.body, id });

    const product = await productService.update(id, validatedData);

    return sendSuccessResponse(res, product, 'Product updated successfully');
  } catch (error) {
    return next(error);
  }
};

export const deleteProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = ProductIdSchema.parse(req.params);
    const result = await productService.delete(id);

    return sendSuccessResponse(res, result, 'Product deleted successfully');
  } catch (error) {
    return next(error);
  }
};

export const getTrashedProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;
    const result = await productService.listTrashed({ page, limit });
    return sendSuccessResponse(res, result, 'Trashed products retrieved successfully');
  } catch (error) {
    return next(error);
  }
};

export const restoreProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = ProductIdSchema.parse(req.params);
    const result = await productService.restore(id);
    return sendSuccessResponse(res, result, 'Product restored successfully');
  } catch (error) {
    return next(error);
  }
};

export const permanentDeleteProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = ProductIdSchema.parse(req.params);
    const result = await productService.permanentDelete(id);
    return sendSuccessResponse(res, result, 'Product deleted permanently');
  } catch (error) {
    return next(error);
  }
};

// ================================
// BULK OPERATIONS
// ================================

export const bulkUpdateProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    console.log('🔍 [BULK UPDATE] Request body received:', JSON.stringify(req.body, null, 2))
    
    const validatedData = BulkProductUpdateSchema.parse(req.body);
    console.log('✅ [BULK UPDATE] Validated data:', JSON.stringify(validatedData, null, 2))
    
    const result = await productService.bulkUpdate(validatedData);
    console.log('✅ [BULK UPDATE] Result:', result)

    return sendSuccessResponse(res, result, 'Products updated successfully');
  } catch (error) {
    console.error('❌ [BULK UPDATE] Error:', error)
    return next(error);
  }
};

export const bulkDeleteProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const validatedData = BulkProductDeleteSchema.parse(req.body);
    const result = await productService.bulkDelete(validatedData);

    return sendSuccessResponse(res, result, 'Products deleted successfully');
  } catch (error) {
    return next(error);
  }
};

export const importProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const validatedData = ProductImportSchema.parse(req.body);
    const result = await productService.importProducts(validatedData);

    return sendSuccessResponse(res, result, 'Products imported successfully');
  } catch (error) {
    return next(error);
  }
};

// ================================
// PRIVATE URL ACCESS
// ================================

export const getProductByPrivateUrl = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { privateUrl } = PrivateUrlAccessSchema.parse(req.params);
    const product = await productService.findByPrivateUrl(privateUrl);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Private product not found or access denied'
      });
    }

    return sendSuccessResponse(res, product, 'Private product retrieved successfully');
  } catch (error) {
    return next(error);
  }
};

// ================================
// ANALYTICS
// ================================

export const getProductAnalytics = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = ProductIdSchema.parse(req.params);
    const { startDate, endDate } = ProductAnalyticsSchema.parse({
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
    });

    const analytics = await productService.getAnalytics(id, new Date(startDate), new Date(endDate));

    return sendSuccessResponse(res, analytics, 'Analytics retrieved successfully');
  } catch (error) {
    return next(error);
  }
};

// ================================
// CLONE PRODUCT
// ================================

export const cloneProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = ProductIdSchema.parse(req.params);
    const clonedProduct = await productService.cloneProduct(id);

    return sendCreatedResponse(res, clonedProduct, 'Product cloned successfully');
  } catch (error) {
    return next(error);
  }
};

// ================================
// REORDER PRODUCT (DRAG & DROP)
// ================================

/**
 * Calculate new sort order between two items using integer gaps
 * Maintains large gaps (1000 units) to avoid frequent rebalancing
 */
function calculateSortOrder(prevSortOrder: number | null, nextSortOrder: number | null): number {
  const DEFAULT_GAP = 1000;
  const MIN_GAP = 10; // If gap becomes less than this, needs rebalancing

  // Treat 0 as null (no sortOrder set)
  const prev = prevSortOrder === 0 ? null : prevSortOrder;
  const next = nextSortOrder === 0 ? null : nextSortOrder;

  // Insert at beginning (before first item)
  if (prev === null && next !== null) {
    // If next item has a sortOrder, place this item before it
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
        `[ProductReorder] Items have same sortOrder (${prev}). Assigning new value: ${prev + 1}`
      );
      // Just increment by 1 to create minimal space
      return prev + 1;
    }

    // If gap is too small, we need to rebalance (handled separately)
    // For now, just split the difference
    if (gap < MIN_GAP) {
      console.warn(
        `[ProductReorder] Small gap detected (${gap}) between ${prev} and ${next}. Consider rebalancing.`
      );
    }

    return Math.floor((prev + next) / 2);
  }

  return DEFAULT_GAP;
}

export const reorderProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = ProductIdSchema.parse(req.params);
    const { prevSortOrder, nextSortOrder } = ProductReorderSchema.parse(req.body);

    console.log('[ReorderProduct]', {
      productId: id,
      received: { prevSortOrder, nextSortOrder },
    });

    const newSortOrder = calculateSortOrder(prevSortOrder || null, nextSortOrder || null);

    console.log('[ReorderProduct] Calculated sortOrder:', newSortOrder);

    const updatedProduct = await productService.updateSortOrder(id, newSortOrder);

    return sendSuccessResponse(
      res,
      { id, sortOrder: updatedProduct.sortOrder },
      'Product reordered successfully'
    );
  } catch (error) {
    return next(error);
  }
};
