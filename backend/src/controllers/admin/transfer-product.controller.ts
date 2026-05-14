import type { Response } from 'express';
import db from '../../configs/db';
import { telegramTransferBotService } from '../../services/telegram-transfer-bot.service';
import type { AuthRequest } from '../../types/req-res';
import {
  CreateTransferProductSchema,
  UpdateTransferProductSchema,
  VerifyBotAdminSchema,
} from '../../validations/zod/transfer-product.schema';
import { TELEGRAM_TRANSFER_PRODUCT_TYPES, isTelegramTransferProduct } from '../../utils/product-type';

type AssignedGroupChannel = {
  id?: number | string
  name?: string
  username?: string
  type: 'group' | 'channel'
  members?: number
  isPublic?: boolean
  description?: string
  url: string
  accountId?: number | string
}

const normalizeAssignedGroupsChannels = (items: unknown): AssignedGroupChannel[] => {
  if (!Array.isArray(items)) return []

  const seen = new Set<string>()

  return items
    .filter((item): item is Record<string, any> => Boolean(item) && typeof item === 'object')
    .map((item) => ({
      id: item.id,
      name: typeof item.name === 'string' ? item.name : undefined,
      username: typeof item.username === 'string' ? item.username : undefined,
      type: (item.type === 'channel' ? 'channel' : 'group') as 'group' | 'channel',
      members: typeof item.members === 'number' ? item.members : undefined,
      isPublic: typeof item.isPublic === 'boolean' ? item.isPublic : undefined,
      description: typeof item.description === 'string' ? item.description : undefined,
      url: typeof item.url === 'string' ? item.url.trim() : '',
      accountId: item.accountId
    }))
    .filter((item) => item.url.length > 0)
    .filter((item) => {
      const key = item.url.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

const ensureNoAssignedUrlConflicts = async (
  currentProductId: number | null,
  assignedGroupsChannels: AssignedGroupChannel[]
) => {
  if (assignedGroupsChannels.length === 0) return

  const incomingUrls = new Set(assignedGroupsChannels.map((item) => item.url.toLowerCase()))
  const existingProducts = await db.product.findMany({
    where: {
      platform: 'TELEGRAM',
      type: { in: Array.from(TELEGRAM_TRANSFER_PRODUCT_TYPES) },
      ...(currentProductId ? { id: { not: currentProductId } } : {})
    },
    select: {
      id: true,
      name: true,
      meta: true
    }
  })

  const conflicts: string[] = []

  for (const product of existingProducts) {
    const productMeta =
      product.meta && typeof product.meta === 'object' && !Array.isArray(product.meta)
        ? (product.meta as Record<string, any>)
        : {}

    const existingAssigned = normalizeAssignedGroupsChannels(productMeta.assignedGroupsChannels)
    for (const item of existingAssigned) {
      if (incomingUrls.has(item.url.toLowerCase())) {
        conflicts.push(`${item.url} (already assigned to ${product.name})`)
      }
    }
  }

  if (conflicts.length > 0) {
    throw new Error(`Some channels/groups are already assigned to another item: ${conflicts.join(', ')}`)
  }
}

/**
 * Create Transfer Product
 * POST /api/v1/admin/transfer-products
 */
export const createTransferProduct = async (req: AuthRequest, res: Response) => {
  try {
    // Validate request body
    const validatedData = CreateTransferProductSchema.parse(req.body);

    const assignedGroupsChannels = normalizeAssignedGroupsChannels(validatedData.meta?.assignedGroupsChannels)
    const soldGroupsChannels = normalizeAssignedGroupsChannels(validatedData.meta?.soldGroupsChannels)

    await ensureNoAssignedUrlConflicts(null, assignedGroupsChannels)

    // Check if telegramUrl already exists
    const existingProduct = await db.product.findFirst({
      where: {
        telegramUrl: validatedData.telegramUrl,
        platform: 'TELEGRAM',
        type: { in: Array.from(TELEGRAM_TRANSFER_PRODUCT_TYPES) },
      },
    });

    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: 'A transfer product with this Telegram URL already exists',
      });
    }

    // Generate unique SKU
    const sku = validatedData.sku || `T${Math.floor(10000 + Math.random() * 90000)}`;

    // Generate unique slug from name - append random suffix to avoid collisions
    const baseSlug =
      validatedData.slug ||
      validatedData.name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') ||
      'transfer';
    const slug = `${baseSlug}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

    // Parse tags if provided as string
    let tagsArray: string[] = [];
    if (validatedData.tags) {
      if (typeof validatedData.tags === 'string') {
        tagsArray = validatedData.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0);
      } else if (Array.isArray(validatedData.tags)) {
        tagsArray = validatedData.tags;
      }
    }

    // Create product
    const product = await db.product.create({
      data: {
        sku,
        slug,
        name: validatedData.name,
        description: validatedData.description,
        type: validatedData.type,
        platform: validatedData.platform,
        telegramUrl: validatedData.telegramUrl,
        tags: tagsArray,
        price: validatedData.price,
        originalPrice: validatedData.originalPrice,
        costPrice: validatedData.costPrice,
        minQuantity: validatedData.minQuantity,
        maxQuantity: validatedData.maxQuantity,
        isActive: validatedData.isActive,
        isPrivate: validatedData.isPrivate,
        ...(validatedData.privateUrl && { privateUrl: validatedData.privateUrl }), // Only include if not empty
        isFeatured: validatedData.isFeatured,
        images: validatedData.images || [],
        thumbnail: validatedData.thumbnail,
        categoryId: validatedData.categoryId,
        stockCount:
          validatedData.type === 'TELEGRAM_CHANNEL_GROUPS'
            ? assignedGroupsChannels.length
            : 1,
        meta: {
          ...validatedData.meta,
          assignedGroupsChannels,
          soldGroupsChannels,
        },
        seo: validatedData.seo,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: product,
      message: 'Transfer product created successfully',
    });
  } catch (error) {
    console.error('Create transfer product error:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error,
      });
    }

    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create transfer product',
    });
  }
};

/**
 * Update Transfer Product
 * PUT /api/v1/admin/transfer-products/:id
 */
export const updateTransferProduct = async (req: AuthRequest, res: Response) => {
  try {
    const productId = parseInt(req.params.id!);

    if (isNaN(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID',
      });
    }

    // Check if product exists and is a transfer product
    const existingProduct = await db.product.findUnique({
      where: { id: productId },
    });

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'Transfer product not found',
      });
    }

    if (!isTelegramTransferProduct(existingProduct)) {
      return res.status(400).json({
        success: false,
        message: 'Product is not a transfer product',
      });
    }

    // Validate request body
    const validatedData = UpdateTransferProductSchema.parse({
      ...req.body,
      id: productId,
    });

    // Check if telegramUrl is being updated and if it's already in use
    if (validatedData.telegramUrl && validatedData.telegramUrl !== existingProduct.telegramUrl) {
      const duplicateProduct = await db.product.findFirst({
        where: {
          telegramUrl: validatedData.telegramUrl,
          platform: 'TELEGRAM',
          type: { in: Array.from(TELEGRAM_TRANSFER_PRODUCT_TYPES) },
          id: { not: productId }, // Exclude current product
        },
      });

      if (duplicateProduct) {
        return res.status(400).json({
          success: false,
          message: 'A transfer product with this Telegram URL already exists',
        });
      }
    }

    // Parse tags if provided as string
    let tagsArray: string[] | undefined;
    if (validatedData.tags !== undefined) {
      if (typeof validatedData.tags === 'string') {
        tagsArray = validatedData.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0);
      } else if (Array.isArray(validatedData.tags)) {
        tagsArray = validatedData.tags;
      }
    }

    const existingMeta =
      existingProduct.meta && typeof existingProduct.meta === 'object' && !Array.isArray(existingProduct.meta)
        ? (existingProduct.meta as Record<string, any>)
        : {}

    const mergedMeta = validatedData.meta
      ? {
          ...existingMeta,
          ...validatedData.meta,
        }
      : existingMeta

    const assignedGroupsChannels = normalizeAssignedGroupsChannels(mergedMeta.assignedGroupsChannels)
    const soldGroupsChannels = normalizeAssignedGroupsChannels(mergedMeta.soldGroupsChannels)

    await ensureNoAssignedUrlConflicts(productId, assignedGroupsChannels)

    const updatedMeta = {
      ...mergedMeta,
      assignedGroupsChannels,
      soldGroupsChannels,
    }

    // Update product
    const product = await db.product.update({
      where: { id: productId },
      data: {
        name: validatedData.name,
        description: validatedData.description,
        telegramUrl: validatedData.telegramUrl,
        tags: tagsArray,
        price: validatedData.price,
        originalPrice: validatedData.originalPrice,
        costPrice: validatedData.costPrice,
        isActive: validatedData.isActive,
        isPrivate: validatedData.isPrivate,
        ...(validatedData.privateUrl !== undefined && {
          privateUrl: validatedData.privateUrl || null,
        }), // Only update if provided
        isFeatured: validatedData.isFeatured,
        images: validatedData.images,
        thumbnail: validatedData.thumbnail,
        categoryId: validatedData.categoryId,
        stockCount:
          (validatedData.type || existingProduct.type) === 'TELEGRAM_CHANNEL_GROUPS'
            ? assignedGroupsChannels.length
            : existingProduct.stockCount,
        meta: updatedMeta,
        seo: validatedData.seo,
        updatedAt: new Date(),
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: product,
      message: 'Transfer product updated successfully',
    });
  } catch (error) {
    console.error('Update transfer product error:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error,
      });
    }

    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update transfer product',
    });
  }
};

/**
 * Verify Bot Admin Status
 * POST /api/v1/admin/transfer-products/verify-bot
 */
export const verifyBotAdmin = async (req: AuthRequest, res: Response) => {
  try {
    // Validate request body
    const validatedData = VerifyBotAdminSchema.parse(req.body);

    // Call bot service to verify admin status
    const result = await telegramTransferBotService.verifyBotIsAdmin(validatedData.telegramUrl);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error || 'Failed to verify bot admin status',
        data: result,
      });
    }

    res.json({
      success: true,
      data: result,
      message: result.isAdmin
        ? 'Bot is admin with promotion permissions'
        : 'Bot is not admin or lacks promotion permissions',
    });
  } catch (error) {
    console.error('Verify bot admin error:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error,
      });
    }

    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to verify bot admin status',
    });
  }
};

/**
 * Get Chat Info
 * POST /api/v1/admin/transfer-products/chat-info
 */
export const getChatInfo = async (req: AuthRequest, res: Response) => {
  try {
    // Validate request body
    const validatedData = VerifyBotAdminSchema.parse(req.body);

    // Call bot service to get chat info
    const result = await telegramTransferBotService.getChatInfo(validatedData.telegramUrl);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error || 'Failed to get chat information',
        data: result,
      });
    }

    res.json({
      success: true,
      data: result,
      message: 'Chat information retrieved successfully',
    });
  } catch (error) {
    console.error('Get chat info error:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error,
      });
    }

    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get chat information',
    });
  }
};

/**
 * Delete Transfer Product
 * DELETE /api/v1/admin/transfer-products/:id
 */
export const deleteTransferProduct = async (req: AuthRequest, res: Response) => {
  try {
    const productId = parseInt(req.params.id!, 10);

    if (isNaN(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID',
      });
    }

    const existingProduct = await db.product.findUnique({
      where: { id: productId },
    });

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'Transfer product not found',
      });
    }

    if (!isTelegramTransferProduct(existingProduct)) {
      return res.status(400).json({
        success: false,
        message: 'Product is not a transfer product',
      });
    }

    const orderCount = await db.order.count({
      where: { productId },
    });

    if (orderCount > 0) {
      return res.status(400).json({
        success: false,
        message:
          'Cannot delete transfer product with existing orders. Consider deactivating instead.',
      });
    }

    await db.product.delete({
      where: { id: productId },
    });

    return res.json({
      success: true,
      data: null,
      message: 'Transfer product deleted successfully',
    });
  } catch (error) {
    console.error('Delete transfer product error:', error);
    return res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : 'Failed to delete transfer product',
    });
  }
};

/**
 * Get All Transfer Products
 * GET /api/v1/admin/transfer-products
 */
export const getTransferProducts = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, search, isActive, isFeatured } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {
      platform: 'TELEGRAM',
      type: { in: Array.from(TELEGRAM_TRANSFER_PRODUCT_TYPES) },
    };

    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        { sku: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    // Active filter
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    // Featured filter
    if (isFeatured !== undefined) {
      where.isFeatured = isFeatured === 'true';
    }

    // Execute queries in parallel
    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      }),
      db.product.count({ where }),
    ]);

    res.json({
      success: true,
      data: products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / Number(limit)),
        hasNext: Number(page) * Number(limit) < total,
        hasPrev: Number(page) > 1,
      },
      message: 'Transfer products retrieved successfully',
    });
  } catch (error) {
    console.error('Get transfer products error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve transfer products',
    });
  }
};
