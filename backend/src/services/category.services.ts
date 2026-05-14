import { Prisma } from '@prisma/client';
import { CACHE_KEYS, CACHE_TTL } from '../configs/cache.config';
import prisma from '../configs/db';
import type {
  BulkCategoryDelete,
  BulkCategoryUpdate,
  CategoryQuery,
  CreateCategory,
  UpdateCategory,
} from '../validations/zod/category.schema';
import { CacheInvalidationService } from './cache-invalidation.service';
import { cacheService } from './cache.service';
import { ProductService } from './product.services';

export class CategoryService {
  private cacheInvalidationService = new CacheInvalidationService();
  private productService = new ProductService();

  /** Cached per process: soft-delete column present after migration. */
  private deletedAtColumnPromise: Promise<boolean> | null = null;

  private async hasDeletedAtColumn(): Promise<boolean> {
    if (this.deletedAtColumnPromise === null) {
      this.deletedAtColumnPromise = (async () => {
        try {
          await prisma.$queryRaw`SELECT "deletedAt" FROM "categories" LIMIT 0`;
          return true;
        } catch {
          return false;
        }
      })();
    }
    return this.deletedAtColumnPromise;
  }

  private generateSlug(name: string): string {
    return name
      .trim()
      .replace(/[^A-Za-z0-9]+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
  }

  private async ensureUniqueSlug(baseSlug: string, excludeId?: number): Promise<string> {
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const sd = await this.hasDeletedAtColumn();
      const existing = await prisma.category.findFirst({
        where: { slug, ...(sd ? { deletedAt: null } : {}) },
        select: { id: true },
      });

      if (!existing || (excludeId && existing.id === excludeId)) {
        return slug;
      }

      slug = `${baseSlug}${counter}`;
      counter++;
    }
  }

  private async getCascadeCategoryIds(rootIds: number[]): Promise<number[]> {
    const visited = new Set(rootIds.filter((id) => Number.isInteger(id) && id > 0));
    let frontier = Array.from(visited);

    while (frontier.length > 0) {
      const children = await prisma.category.findMany({
        where: { parentId: { in: frontier } },
        select: { id: true },
      });

      frontier = children
        .map((category) => category.id)
        .filter((id) => {
          if (visited.has(id)) return false;
          visited.add(id);
          return true;
        });
    }

    return Array.from(visited);
  }

  // ================================
  // CRUD OPERATIONS
  // ================================

  async create(data: CreateCategory) {
    // Validate hierarchy: prevent creating more than 1 level deep
    if (data.parentId) {
      const sd = await this.hasDeletedAtColumn();
      const parentCategory = await prisma.category.findFirst({
        where: { id: data.parentId, ...(sd ? { deletedAt: null } : {}) },
        select: { id: true, parentId: true, name: true },
      });

      if (!parentCategory) {
        throw new Error('Parent category not found');
      }

      if (parentCategory.parentId !== null) {
        throw new Error(
          `Cannot create category more than 1 level deep. ${parentCategory.name} already has a parent.`
        );
      }
    }

    let slug = data.slug?.trim();
    if (!slug) {
      slug = this.generateSlug(data.name);
    }
    slug = await this.ensureUniqueSlug(slug);

    const category = await prisma.category.create({
      data: {
        name: data.name,
        slug,
        description: data.description ?? null,
        icon: data.icon?.trim() ? data.icon : null,
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? 0,
        parentId: data.parentId ?? null,
        meta: data.meta ?? undefined,
      },
    });

    // Invalidate related caches using centralized service
    await this.cacheInvalidationService.invalidateCategory();

    return category;
  }

  async findById(id: string, includeRelations: boolean = false) {
    const cacheKey = `${CACHE_KEYS.CATEGORY_DETAIL}:${id}:${includeRelations ? 'with_relations' : 'basic'}`;

    return await cacheService.getOrFetch(
      cacheKey,
      async () => {
        const selectFields = {
          id: true,
          name: true,
          slug: true,
          description: true,
          icon: true,
          isActive: true,
          sortOrder: true,
          parentId: true,
          createdAt: true,
          updatedAt: true,
          meta: true,
        };

        const include = includeRelations
          ? {
              parent: { select: selectFields },
              children: {
                select: selectFields,
                orderBy: { sortOrder: 'asc' as const },
              },
            }
          : {};

        const sd = await this.hasDeletedAtColumn();
        const category = await prisma.category.findFirst({
          where: { id: parseInt(id), ...(sd ? { deletedAt: null } : {}) },
          select: {
            ...selectFields,
            ...include,
          },
        });

        if (!category) {
          throw new Error('Category not found');
        }

        return category;
      },
      CACHE_TTL.CATEGORIES
    );
  }

  async findBySlug(slug: string, includeRelations: boolean = false) {
    const selectFields = {
      id: true,
      name: true,
      slug: true,
      description: true,
      icon: true,
      isActive: true,
      sortOrder: true,
      parentId: true,
      createdAt: true,
      updatedAt: true,
      meta: true,
    };

    const include = includeRelations
      ? {
          parent: { select: selectFields },
          children: {
            select: selectFields,
            orderBy: { sortOrder: 'asc' as const },
          },
        }
      : {};

    const sd = await this.hasDeletedAtColumn();
    const category = await prisma.category.findFirst({
      where: { slug, ...(sd ? { deletedAt: null } : {}) },
      select: {
        ...selectFields,
        ...include,
      },
    });

    if (!category) {
      throw new Error('Category not found');
    }

    return category;
  }

  async findMany(query: CategoryQuery) {
    const {
      page,
      limit,
      search,
      isActive,
      parentId,
      isRoot,
      hasChildren,
      sortBy,
      sortOrder,
      includeProductCount,
      includeChildren,
      includeParent,
    } = query;

    const sd = await this.hasDeletedAtColumn();

    const selectFields = {
      id: true,
      name: true,
      slug: true,
      description: true,
      icon: true,
      isActive: true,
      sortOrder: true,
      parentId: true,
      createdAt: true,
      updatedAt: true,
      meta: true,
    };

    // Build where clause
    const where: Prisma.CategoryWhereInput = {
      ...(sd ? { deletedAt: null } : {}),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(isActive !== undefined && { isActive }),
      ...(parentId !== undefined && { parentId }),
      ...(isRoot !== undefined && { parentId: isRoot ? null : { not: null } }),
      ...(hasChildren !== undefined && {
        children: hasChildren
          ? { some: sd ? { deletedAt: null } : {} }
          : { none: sd ? { deletedAt: null } : {} },
      }),
    };

    if (isRoot !== undefined) {
      where.parentId = isRoot ? null : { not: null };
    }

    // Build select object
    const select = {
      ...selectFields,
      ...(includeChildren && {
        children: {
          select: selectFields,
          orderBy: { sortOrder: 'asc' as const },
        },
      }),
      ...(includeParent && {
        parent: { select: selectFields },
      }),
      ...(includeProductCount && {
        _count: { select: { products: true } },
      }),
    };

    // Execute queries
    const [categories, total] = await Promise.all([
      prisma.category.findMany({
        where,
        select,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.category.count({ where }),
    ]);

    return {
      categories,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async update(id: string, data: Partial<UpdateCategory>) {
    const categoryId = parseInt(id);
    const existingCategory = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true, name: true, slug: true },
    });

    if (!existingCategory) {
      throw new Error('Category not found');
    }

    // Validate hierarchy if parentId is being updated
    if (data.parentId !== undefined) {
      if (data.parentId === categoryId) {
        throw new Error('Category cannot be its own parent');
      }

      if (data.parentId) {
        const parentCategory = await prisma.category.findUnique({
          where: { id: data.parentId },
          select: { id: true, parentId: true },
        });

        if (!parentCategory) {
          throw new Error('Parent category not found');
        }

        if (parentCategory.parentId !== null) {
          throw new Error(
            'Cannot set parent to a category that already has a parent (max 1 level deep)'
          );
        }

        // Check if the target parent is a child of current category
        const isChildOfCurrent = await prisma.category.findFirst({
          where: { id: data.parentId, parentId: categoryId },
        });

        if (isChildOfCurrent) {
          throw new Error('Cannot set a child category as parent (circular reference)');
        }
      }

      // Check if category has children and we're trying to make it a child
      if (data.parentId) {
        const hasChildren = await prisma.category.findFirst({
          where: { parentId: categoryId },
        });

        if (hasChildren) {
          throw new Error(
            'Cannot move category with children to be a child category (max 1 level deep)'
          );
        }
      }
    }

    const { id: _id, ...updateData } = data;
    let slug = updateData.slug?.trim() || undefined;

    if (slug && slug !== existingCategory.slug) {
      slug = await this.ensureUniqueSlug(slug, categoryId);
    } else if (updateData.name && !slug && updateData.name !== existingCategory.name) {
      slug = await this.ensureUniqueSlug(this.generateSlug(updateData.name), categoryId);
    } else {
      slug = existingCategory.slug;
    }

    const category = await prisma.category.update({
      where: { id: categoryId },
      data: {
        ...updateData,
        slug,
        parentId: data.parentId || null,
      },
    });

    // Invalidate related caches using centralized service
    await this.cacheInvalidationService.invalidateCategory(categoryId);

    return category;
  }

  async delete(id: string): Promise<{ deleted: boolean; message: string }> {
    const categoryId = parseInt(id);

    const sd = await this.hasDeletedAtColumn();
    const category = await prisma.category.findFirst({
      where: sd ? { id: categoryId, deletedAt: null } : { id: categoryId },
      select: { id: true, name: true, slug: true },
    });

    if (!category) {
      throw new Error('Category not found');
    }

    // Soft delete cascade: category -> groups -> products.
    // Data remains in DB; we hide it everywhere by `deletedAt`.
    if (!sd) {
      throw new Error(
        'Soft delete requires database migration (catalog soft delete). Run: npx prisma migrate deploy'
      );
    }

    const now = new Date();
    const categoryIds = await this.getCascadeCategoryIds([categoryId]);
    const affectedProductIds = await prisma.product.findMany({
      where: {
        deletedAt: null,
        OR: [
          { categoryId: { in: categoryIds } },
          { productGroup: { categoryId: { in: categoryIds } } },
        ],
      },
      select: { id: true },
    });

    await prisma.$transaction(async (tx) => {
      await tx.product.updateMany({
        where: {
          deletedAt: null,
          OR: [
            { categoryId: { in: categoryIds } },
            { productGroup: { categoryId: { in: categoryIds } } },
          ],
        },
        data: {
          deletedAt: now,
          isActive: false,
          isFeatured: false,
          isPrivate: false,
          privateUrl: null,
        },
      });

      await tx.productGroup.updateMany({
        where: { categoryId: { in: categoryIds }, deletedAt: null },
        data: { deletedAt: now },
      });

      await tx.category.updateMany({
        where: { id: { in: categoryIds } },
        data: { deletedAt: now, isActive: false },
      });
    });

    await Promise.all(
      affectedProductIds.map((product) => this.cacheInvalidationService.invalidateProduct(product.id))
    );
    await this.cacheInvalidationService.invalidateAllCategories();

    return {
      deleted: true,
      message: `Moved "${category.name}" to trash. ${categoryIds.length - 1} child categor${categoryIds.length - 1 === 1 ? 'y' : 'ies'}, related groups, and ${affectedProductIds.length} product(s) were also moved to trash.`,
    };
  }

  async restore(id: string) {
    if (!(await this.hasDeletedAtColumn())) {
      throw new Error(
        'Restore requires catalog soft-delete migration. Run: npx prisma migrate deploy'
      );
    }

    const categoryId = parseInt(id);

    const category = await prisma.category.findFirst({
      where: { id: categoryId, deletedAt: { not: null } },
      select: { id: true, name: true },
    });

    if (!category) {
      throw new Error('Deleted category not found');
    }

    await prisma.category.update({
      where: { id: categoryId },
      data: { deletedAt: null },
    });

    await this.cacheInvalidationService.invalidateAllCategories();

    return {
      restored: true,
      message: `Restored "${category.name}".`,
    };
  }

  async permanentDelete(id: string) {
    const categoryId = parseInt(id);

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true, name: true, slug: true },
    });

    if (!category) {
      throw new Error('Category not found');
    }

    const categoryIds = await this.getCascadeCategoryIds([categoryId]);
    const groupIds = await prisma.productGroup.findMany({
      where: { categoryId: { in: categoryIds } },
      select: { id: true },
    });
    const productIds = await prisma.product.findMany({
      where: {
        OR: [
          { categoryId: { in: categoryIds } },
          { productGroup: { categoryId: { in: categoryIds } } },
        ],
      },
      select: { id: true },
    });

    let removedFromCatalogCount = 0;
    let permanentlyDeletedCount = 0;

    for (const { id: productId } of productIds) {
      const result = await this.productService.permanentDelete(productId, {
        cascadeOrders: true
      });
      if (result.mode === 'catalog_delete') removedFromCatalogCount++;
      if (result.mode === 'hard_delete') permanentlyDeletedCount++;
    }

    await prisma.$transaction(async (tx) => {
      await tx.productGroup.deleteMany({
        where: { id: { in: groupIds.map((g) => g.id) } },
      });
      await tx.category.deleteMany({
        where: { id: { in: categoryIds } },
      });
    });

    await this.cacheInvalidationService.invalidateAllCategories();

    return {
      deleted: true,
      permanentlyDeletedCount,
      removedFromCatalogCount,
      message: `Deleted "${category.name}" permanently. ${permanentlyDeletedCount} product(s) were hard-deleted (including related orders).${removedFromCatalogCount > 0 ? ` ${removedFromCatalogCount} product(s) were only removed from catalog.` : ''}`,
    };
  }

  async listTrashed(params?: { page?: number; limit?: number }) {
    const page = params?.page && params.page > 0 ? params.page : 1
    const limit = params?.limit && params.limit > 0 ? params.limit : 20
    const skip = (page - 1) * limit

    if (!(await this.hasDeletedAtColumn())) {
      return {
        categories: [],
        groups: [],
        products: [],
        pagination: {
          page,
          limit,
          total: 0,
          pages: 0,
          hasNext: false,
          hasPrev: false,
        },
      };
    }

    const [categories, total] = await Promise.all([
      prisma.category.findMany({
        where: { deletedAt: { not: null }, parentId: null },
        select: {
          id: true,
          name: true,
          slug: true,
          icon: true,
          deletedAt: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: { deletedAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.category.count({ where: { deletedAt: { not: null }, parentId: null } })
    ])

    // Provide related deleted groups/products for the trash view on /admin/categories.
    const categoryIds = categories.map((c) => c.id)
    const [groups, products] = await Promise.all([
      prisma.productGroup.findMany({
        where: {
          deletedAt: { not: null },
          ...(categoryIds.length > 0 ? { categoryId: { in: categoryIds } } : {})
        },
        select: {
          id: true,
          name: true,
          slug: true,
          categoryId: true,
          deletedAt: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: { deletedAt: 'desc' },
        take: 200
      }),
      prisma.product.findMany({
        where: {
          deletedAt: { not: null },
          ...(categoryIds.length > 0 ? { categoryId: { in: categoryIds } } : {})
        },
        select: {
          id: true,
          sku: true,
          name: true,
          categoryId: true,
          productGroupId: true,
          deletedAt: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: { deletedAt: 'desc' },
        take: 200
      })
    ])

    return {
      categories,
      groups,
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    }
  }

  // ================================
  // HIERARCHY OPERATIONS
  // ================================

  async getCategoryTree(includeInactive: boolean = false, includeProductCount: boolean = false) {
    const cacheKey = `${CACHE_KEYS.CATEGORIES_TREE}:${includeInactive ? 'all' : 'active'}:${includeProductCount ? 'with_count' : 'basic'}`;

    return await cacheService.getOrFetch(
      cacheKey,
      async () => {
        const sd = await this.hasDeletedAtColumn();
        const selectFields = {
          id: true,
          name: true,
          slug: true,
          description: true,
          icon: true,
          isActive: true,
          sortOrder: true,
          parentId: true,
          createdAt: true,
          updatedAt: true,
          meta: true,
        };

        const where: Prisma.CategoryWhereInput = {
          parentId: null, // Only root categories
          ...(sd ? { deletedAt: null } : {}),
          ...(includeInactive ? {} : { isActive: true }),
        };

        const childWhere = includeInactive
          ? sd
            ? { deletedAt: null }
            : {}
          : sd
            ? { isActive: true, deletedAt: null }
            : { isActive: true };

        const select: Prisma.CategorySelect = {
          ...selectFields,
          children: {
            select: {
              ...selectFields,
              // ...(includeProductCount && { _count: { select: { products: true } } }),
            },
            where: childWhere,
            orderBy: { sortOrder: 'asc' as const },
          },
          ...(includeProductCount && { _count: { select: { products: true } } }),
        };

        const rootCategories = await prisma.category.findMany({
          where,
          select,
          orderBy: { createdAt: 'desc' },
        });

        return rootCategories;
      },
      CACHE_TTL.CATEGORIES
    );
  }

  async getRootCategories(includeProductCount: boolean = false) {
    const cacheKey = `${CACHE_KEYS.CATEGORIES_ACTIVE}:root:${includeProductCount ? 'with_count' : 'basic'}`;

    return await cacheService.getOrFetch(
      cacheKey,
      async () => {
        const sd = await this.hasDeletedAtColumn();
        const selectFields = {
          id: true,
          name: true,
          slug: true,
          description: true,
          icon: true,
          isActive: true,
          sortOrder: true,
          parentId: true,
          createdAt: true,
          updatedAt: true,
          meta: true,
        };

        const select = {
          ...selectFields,
          ...(includeProductCount && { _count: { select: { products: true } } }),
        };

        const categories = await prisma.category.findMany({
          where: { parentId: null, isActive: true, ...(sd ? { deletedAt: null } : {}) },
          select,
          orderBy: { sortOrder: 'asc' },
        });

        return categories;
      },
      CACHE_TTL.CATEGORIES
    );
  }

  async getChildCategories(parentId: string, includeProductCount: boolean = false) {
    const selectFields = {
      id: true,
      name: true,
      slug: true,
      description: true,
      icon: true,
      isActive: true,
      sortOrder: true,
      parentId: true,
      createdAt: true,
      updatedAt: true,
      meta: true,
    };

    const select = {
      ...selectFields,
      parent: { select: selectFields },
      ...(includeProductCount && { _count: { select: { products: true } } }),
    };

    const sd = await this.hasDeletedAtColumn();
    const categories = await prisma.category.findMany({
      where: {
        parentId: parseInt(parentId),
        isActive: true,
        ...(sd ? { deletedAt: null } : {}),
      },
      select,
      orderBy: { sortOrder: 'asc' },
    });

    return categories;
  }

  async moveCategory(categoryId: number, newParentId: number | null) {
    return this.update(categoryId.toString(), { parentId: newParentId });
  }

  // ================================
  // BULK OPERATIONS
  // ================================

  async bulkUpdate(data: BulkCategoryUpdate) {
    const { ids, updates } = data;

    await prisma.$transaction(
      ids.map((id) =>
        prisma.category.update({
          where: { id },
          data: updates,
        })
      )
    );

    // Invalidate all categories cache after bulk update
    await this.cacheInvalidationService.invalidateAllCategories();

    return {
      updated: ids.length,
      categories: null,
    };
  }

  async bulkDelete(data: BulkCategoryDelete) {
    const { ids } = data;

    const sd = await this.hasDeletedAtColumn();
    if (!sd) {
      throw new Error(
        'Soft delete requires database migration (catalog soft delete). Run: npx prisma migrate deploy'
      );
    }

    const categories = await prisma.category.findMany({
      where: { id: { in: ids }, deletedAt: null },
      select: { id: true, name: true, slug: true },
    });

    const now = new Date();
    const categoryIds = await this.getCascadeCategoryIds(categories.map((category) => category.id));
    const affectedProducts = await prisma.product.findMany({
      where: {
        deletedAt: null,
        OR: [
          { categoryId: { in: categoryIds } },
          { productGroup: { categoryId: { in: categoryIds } } },
        ],
      },
      select: { id: true },
    });

    await prisma.$transaction(async (tx) => {
      await tx.product.updateMany({
        where: {
          deletedAt: null,
          OR: [
            { categoryId: { in: categoryIds } },
            { productGroup: { categoryId: { in: categoryIds } } },
          ],
        },
        data: {
          deletedAt: now,
          isActive: false,
          isFeatured: false,
          isPrivate: false,
          privateUrl: null,
        },
      });

      await tx.productGroup.updateMany({
        where: { categoryId: { in: categoryIds }, deletedAt: null },
        data: { deletedAt: now },
      });

      await tx.category.updateMany({
        where: { id: { in: categoryIds } },
        data: { deletedAt: now, isActive: false },
      });
    });

    await Promise.all(affectedProducts.map((product) => this.cacheInvalidationService.invalidateProduct(product.id)));
    await this.cacheInvalidationService.invalidateAllCategories();

    return {
      deleted: ids.length,
      message: `Moved ${ids.length} categor${ids.length === 1 ? 'y' : 'ies'} to trash. ${affectedProducts.length} product(s) were also moved to trash.`,
    };
  }

  async updateSortOrder(categories: Array<{ id: number; sortOrder: number }>) {
    await prisma.$transaction(
      categories.map(({ id, sortOrder }) =>
        prisma.category.update({
          where: { id },
          data: { sortOrder },
        })
      )
    );

    // Invalidate category tree cache since sort order affects display
    await this.cacheInvalidationService.invalidateCategory();

    return {
      updated: categories.length,
      categories: null,
    };
  }

  async updateCategorySortOrder(id: number, sortOrder: number) {
    const category = await prisma.category.update({
      where: { id },
      data: { sortOrder },
      select: { id: true, sortOrder: true, name: true },
    });

    // Invalidate cache
    await this.cacheInvalidationService.invalidateCategory();

    return category;
  }
}
