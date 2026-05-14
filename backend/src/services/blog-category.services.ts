import type { BlogCategory } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import { buildCacheKey, CACHE_KEYS, CACHE_PATTERNS, CACHE_TTL } from '../configs/cache.config';
import type { Pagination } from '../types/req-res';
import type {
  BlogCategoryQuery,
  CreateBlogCategoryInput,
  UpdateBlogCategoryInput,
} from '../validations/zod/blog-category.schema';
import { CacheService } from './cache.service';

export class BlogCategoryService {
  private prisma: PrismaClient;
  private cache: CacheService;

  constructor(prisma: PrismaClient, cache: CacheService) {
    this.prisma = prisma;
    this.cache = cache;
  }

  /**
   * Generate a URL-friendly slug from name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_-]+/g, '-') // Replace spaces, underscores, and multiple hyphens with single hyphen
      .replace(/^-+|-+$/g, ''); // Remove leading and trailing hyphens
  }

  /**
   * Ensure slug is unique by appending a number if necessary
   */
  private async ensureUniqueSlug(baseSlug: string, excludeId?: number): Promise<string> {
    let slug = baseSlug;
    let counter = 1;
    const maxAttempts = 100; // Safety limit to prevent infinite loop

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const existing = await this.prisma.blogCategory.findFirst({
        where: {
          slug,
          ...(excludeId && { id: { not: excludeId } }),
        },
      });

      if (!existing) {
        return slug;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // If we reach max attempts, throw an error
    throw new Error(
      `Unable to generate unique slug for "${baseSlug}" after ${maxAttempts} attempts`
    );
  }

  async createCategory(data: CreateBlogCategoryInput): Promise<BlogCategory> {
    try {
      // Check if name already exists
      const existing = await this.prisma.blogCategory.findFirst({
        where: { name: data.name },
      });

      if (existing) {
        throw new Error('Blog category with this name already exists');
      }

      // Generate slug from name
      const baseSlug = this.generateSlug(data.name);
      const slug = await this.ensureUniqueSlug(baseSlug);

      const category = await this.prisma.blogCategory.create({
        data: {
          ...data,
          slug,
        },
      });

      // Invalidate cache
      await this.invalidateCategoryCache();

      return category;
    } catch (error) {
      throw error;
    }
  }

  async updateCategory(id: number, data: UpdateBlogCategoryInput): Promise<BlogCategory> {
    try {
      // Check if category exists
      const existing = await this.prisma.blogCategory.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new Error('Blog category not found');
      }

      // Handle slug uniqueness if updating slug
      if (data.slug) {
        const uniqueSlug = await this.ensureUniqueSlug(data.slug, id);
        data.slug = uniqueSlug;
      }

      // Check for name duplicate if updating name
      if (data.name) {
        const duplicate = await this.prisma.blogCategory.findFirst({
          where: {
            AND: [{ id: { not: id } }, { name: data.name }],
          },
        });

        if (duplicate) {
          throw new Error('Blog category with this name already exists');
        }
      }

      const category = await this.prisma.blogCategory.update({
        where: { id },
        data,
      });

      // Invalidate cache
      await this.invalidateCategoryCache(id);

      return category;
    } catch (error) {
      throw error;
    }
  }

  async deleteCategory(id: number): Promise<void> {
    try {
      // Check if category exists
      const category = await this.prisma.blogCategory.findUnique({
        where: { id },
        include: {
          _count: {
            select: { blogs: true, subcategories: true },
          },
        },
      });

      if (!category) {
        throw new Error('Blog category not found');
      }

      if (category._count.subcategories > 0) {
        throw new Error(
          `Cannot delete category. It has ${category._count.subcategories} subcategory(ies). Please delete subcategories first.`
        );
      }

      // Check if category has blogs
      if (category._count.blogs > 0) {
        throw new Error('Cannot delete category with existing blogs');
      }

      await this.prisma.blogCategory.delete({
        where: { id },
      });

      // Invalidate cache
      await this.invalidateCategoryCache(id);
    } catch (error) {
      throw error;
    }
  }

  async getCategoryById(id: number): Promise<BlogCategory | null> {
    try {
      const cacheKey = CACHE_KEYS.BLOG_CATEGORIES.BY_ID(id);

      return await this.cache.getOrFetch(
        cacheKey,
        async () => {
          const category = await this.prisma.blogCategory.findUnique({
            where: { id },
            include: {
              _count: {
                select: { blogs: true },
              },
            },
          });

          return category;
        },
        CACHE_TTL.BLOG_CATEGORIES
      );
    } catch (error) {
      throw error;
    }
  }

  async getCategoryBySlug(slug: string): Promise<BlogCategory | null> {
    try {
      const cacheKey = CACHE_KEYS.BLOG_CATEGORIES.BY_SLUG(slug);

      return await this.cache.getOrFetch(
        cacheKey,
        async () => {
          const category = await this.prisma.blogCategory.findUnique({
            where: { slug },
            include: {
              _count: {
                select: { blogs: true },
              },
            },
          });

          return category;
        },
        CACHE_TTL.BLOG_CATEGORIES
      );
    } catch (error) {
      throw error;
    }
  }

  async getCategories(query: BlogCategoryQuery = { page: 1, limit: 10 }): Promise<{
    categories: BlogCategory[];
    pagination: Pagination;
  }> {
    try {
      const { search, page, limit, sortBy = 'name', sortOrder = 'asc' } = query;

      const cacheKey = buildCacheKey.blogCategoriesList(page, limit, {
        search,
        sortBy,
        sortOrder,
      });

      return await this.cache.getOrFetch(
        cacheKey,
        async () => {
          const where: any = {};

          if (search) {
            where.OR = [
              { name: { contains: search, mode: 'insensitive' } },
              { slug: { contains: search, mode: 'insensitive' } },
            ];
          }

          const skip = (page - 1) * limit;

          // Database query
          const [categories, total] = await Promise.all([
            this.prisma.blogCategory.findMany({
              where,
              include: {
                _count: {
                  select: { blogs: true },
                },
              },
              orderBy: { [sortBy]: sortOrder },
              take: limit,
              skip,
            }),
            this.prisma.blogCategory.count({ where }),
          ]);

          const result = {
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

          return result;
        },
        CACHE_TTL.BLOG_CATEGORIES
      );
    } catch (error) {
      throw error;
    }
  }

  private async invalidateCategoryCache(id?: number): Promise<void> {
    try {
      // Invalidate general cache patterns using proper CACHE_PATTERNS
      const cacheInvalidationPromises = [
        this.cache.clearPattern(CACHE_PATTERNS.ALL_BLOG_CATEGORIES),
        this.cache.del(CACHE_KEYS.BLOG_CATEGORIES.STATS),
      ];

      // If specific category ID provided, invalidate specific caches
      if (id) {
        cacheInvalidationPromises.push(
          this.cache.del(CACHE_KEYS.BLOG_CATEGORIES.BY_ID(id)),
          this.cache.clearPattern(CACHE_PATTERNS.BLOG_CATEGORY_RELATED(id))
        );
      }

      await Promise.all(cacheInvalidationPromises);
    } catch (error) {
      console.error('Error invalidating blog category cache:', error);
    }
  }
}
