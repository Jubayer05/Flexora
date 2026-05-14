import type { Blog } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import { buildCacheKey, CACHE_KEYS, CACHE_PATTERNS, CACHE_TTL } from '../configs/cache.config';
import type { Pagination } from '../types/req-res';
import { PAGELIMIT } from '../validations/common/pagination.schema';
import type {
  BlogQuery,
  BulkBlogActionInput,
  BulkCreateBlogsInput,
  CreateBlogInput,
  UpdateBlogInput,
} from '../validations/zod/blog.schema';
import { CacheService } from './cache.service';

export class BlogService {
  private prisma: PrismaClient;
  private cache: CacheService;

  constructor(prisma: PrismaClient, cache: CacheService) {
    this.prisma = prisma;
    this.cache = cache;
  }

  /**
   * Generate a URL-friendly slug from title
   */
  private generateSlug(title: string): string {
    return title
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
      const existing = await this.prisma.blog.findFirst({
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

  async createBlog(data: CreateBlogInput): Promise<Blog> {
    try {
      // Generate slug from title
      const baseSlug = this.generateSlug(data.title);
      const slug = await this.ensureUniqueSlug(baseSlug);

      // Check if category exists
      if (data.categoryId) {
        const category = await this.prisma.blogCategory.findUnique({
          where: { id: data.categoryId },
        });

        if (!category) {
          throw new Error('Blog category not found');
        }
      }

      // Handle publishedAt
      const blogData: any = {
        ...data,
        slug,
        publishedAt: data.isPublished
          ? data.publishedAt
            ? new Date(data.publishedAt)
            : new Date()
          : null,
      };

      const blog = await this.prisma.blog.create({
        data: blogData,
      });

      // Invalidate cache
      await this.invalidateBlogCache();

      return blog;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create multiple blogs with scheduling and optional author rotation.
   * First post is scheduled at now + minHours; each next at previous + random(min, max) hours.
   */
  async createBulkBlogs(input: BulkCreateBlogsInput): Promise<{ count: number; data: Blog[] }> {
    const {
      blogs,
      categoryId,
      subCategoryId,
      authorRotation,
      selectedAuthorId,
      timeBetweenPosts,
    } = input;

    const category = await this.prisma.blogCategory.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      throw new Error('Blog category not found');
    }

    if (subCategoryId) {
      const sub = await this.prisma.blogSubCategory.findFirst({
        where: { id: subCategoryId, categoryId },
      });
      if (!sub) {
        throw new Error('Sub-category not found or does not belong to the selected category');
      }
    }

    let authorIds: number[];
    if (authorRotation) {
      const authors = await this.prisma.blogAuthor.findMany({
        where: { isActive: true },
        select: { id: true },
      });
      if (authors.length === 0) {
        throw new Error('No authors available for rotation. Create authors first.');
      }
      authorIds = authors.map((a) => a.id);
    } else {
      const id = selectedAuthorId ?? (subCategoryId
        ? (await this.prisma.blogSubCategory.findUnique({
            where: { id: subCategoryId },
            select: { authorId: true },
          }))?.authorId ?? null
        : null);
      if (id == null) {
        throw new Error('Author is required when rotation is disabled. Select an author or enable rotation.');
      }
      const author = await this.prisma.blogAuthor.findUnique({
        where: { id },
      });
      if (!author) {
        throw new Error('Selected author not found');
      }
      authorIds = [id];
    }

    const minH = Math.max(0, Number(timeBetweenPosts?.min ?? 1));
    const maxH = Math.max(minH, Number(timeBetweenPosts?.max ?? minH));
    const minMs = minH * 60 * 60 * 1000;
    const maxMs = maxH * 60 * 60 * 1000;

    const now = Date.now();
    let currentTime = new Date(now + minMs);
    const publishTimes: Date[] = [];
    for (let i = 0; i < blogs.length; i++) {
      publishTimes.push(new Date(currentTime));
      const randomMs = Math.random() * (maxMs - minMs) + minMs;
      currentTime = new Date(currentTime.getTime() + randomMs);
    }

    const created: Blog[] = [];
    for (let i = 0; i < blogs.length; i++) {
      const item = blogs[i];
      const baseSlug = this.generateSlug(item.title);
      const slug = await this.ensureUniqueSlug(baseSlug);
      const authorId = authorIds[i % authorIds.length];
      const content = (item.content && item.content.trim()) || `<p>${item.title}</p>`;
      const tags = Array.isArray(item.tags) ? item.tags : [];
      const meta = subCategoryId != null ? { subCategoryId } : undefined;

      const blog = await this.prisma.blog.create({
        data: {
          title: item.title,
          slug,
          content,
          thumbnail: item.thumbnail ?? null,
          tags,
          categoryId,
          authorId,
          isPublished: true,
          publishedAt: publishTimes[i],
          meta: meta ?? undefined,
        },
      });
      created.push(blog);
    }

    await this.invalidateBlogCache();
    return { count: created.length, data: created };
  }

  async updateBlog(id: number, data: UpdateBlogInput): Promise<Blog> {
    try {
      // Check if blog exists
      const existing = await this.prisma.blog.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new Error('Blog not found');
      }

      // Check for slug duplicate if updating slug
      if (data.slug) {
        const uniqueSlug = await this.ensureUniqueSlug(data.slug, id);
        data.slug = uniqueSlug;
      }

      // Check if category exists if updating categoryId
      if (data.categoryId) {
        const category = await this.prisma.blogCategory.findUnique({
          where: { id: data.categoryId },
        });

        if (!category) {
          throw new Error('Blog category not found');
        }
      }

      // Handle publishedAt logic
      const updateData: any = { ...data };

      if (data.isPublished !== undefined) {
        if (data.isPublished && !existing.publishedAt) {
          // Publishing for the first time
          updateData.publishedAt = data.publishedAt ? new Date(data.publishedAt) : new Date();
        } else if (!data.isPublished) {
          // Unpublishing
          updateData.publishedAt = null;
        }
      }

      if (data.publishedAt) {
        updateData.publishedAt = new Date(data.publishedAt);
      }

      const blog = await this.prisma.blog.update({
        where: { id },
        data: updateData,
        include: {
          category: true,
        },
      });

      // Invalidate cache
      await this.invalidateBlogCache(id);

      return blog;
    } catch (error) {
      throw error;
    }
  }

  async deleteBlog(id: number): Promise<void> {
    try {
      // Check if blog exists
      const blog = await this.prisma.blog.findUnique({
        where: { id },
      });

      if (!blog) {
        throw new Error('Blog not found');
      }

      await this.prisma.blog.delete({
        where: { id },
      });

      // Invalidate cache
      await this.invalidateBlogCache(id);
    } catch (error) {
      throw error;
    }
  }

  async getBlogById(id: number, includeViews: boolean = false): Promise<Blog | null> {
    try {
      const cacheKey = CACHE_KEYS.BLOGS.BY_ID(id);

      // Always try cache first for blog data
      const blog = await this.cache.getOrFetch(
        cacheKey,
        async () => {
          const blog = await this.prisma.blog.findUnique({
            where: { id },
            include: {
              category: true,
            },
          });
          return blog;
        },
        CACHE_TTL.BLOG_DETAIL
      );

      // If blog exists and we need to track views, increment separately
      if (blog && includeViews) {
        // Increment view count in database (async, don't wait)
        this.incrementViews(id).catch((error) => {
          console.error('Error incrementing blog views:', error);
        });

        // Update the returned object for immediate consistency
        blog.views += 1;
      }

      return blog;
    } catch (error) {
      throw error;
    }
  }

  async getBlogBySlug(slug: string, includeViews: boolean = false): Promise<Blog | null> {
    try {
      const cacheKey = CACHE_KEYS.BLOGS.BY_SLUG(slug);

      // Always try cache first for blog data
      const blog = await this.cache.getOrFetch(
        cacheKey,
        async () => {
          const blog = await this.prisma.blog.findUnique({
            where: { slug },
            include: {
              category: true,
              author: { select: { id: true, name: true, email: true } },
            },
          });
          return blog;
        },
        CACHE_TTL.BLOG_DETAIL
      );

      // If blog exists and we need to track views, increment separately
      if (blog && includeViews) {
        // Increment view count in database (async, don't wait)
        this.incrementViews(blog.id).catch((error) => {
          console.error('Error incrementing blog views:', error);
        });

        // Update the returned object for immediate consistency
        blog.views += 1;
      }

      return blog;
    } catch (error) {
      throw error;
    }
  }

  async getBlogs(
    query: BlogQuery = { page: 1, limit: PAGELIMIT, isPublished: undefined },
    options?: { onlyVisibleNow?: boolean }
  ): Promise<{
    blogs: Blog[];
    pagination: Pagination;
  }> {
    try {
      const {
        search,
        categoryId,
        tags,
        isPublished,
        page,
        limit,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = query;
      const onlyVisibleNow = options?.onlyVisibleNow === true;

      const cacheKey = buildCacheKey.blogsList(categoryId, page, limit, {
        search,
        tags,
        isPublished,
        onlyVisibleNow,
        sortBy,
        sortOrder,
      });

      return await this.cache.getOrFetch(
        cacheKey,
        async () => {
          const where: any = {};

          if (search) {
            where.OR = [
              { title: { contains: search, mode: 'insensitive' } },
              { content: { contains: search, mode: 'insensitive' } },
              { tags: { hasSome: [search] } },
            ];
          }

          if (categoryId) {
            where.categoryId = categoryId;
          }

          if (tags) {
            const tagArray = tags.split(',').map((tag) => tag.trim());
            where.tags = { hasSome: tagArray };
          }

          if (isPublished !== undefined) {
            where.isPublished = isPublished;
            if (isPublished) {
              where.publishedAt = onlyVisibleNow ? { lte: new Date() } : { not: null };
            }
          }

          const skip = (page - 1) * limit;

          // Database query
          const [blogs, total] = await Promise.all([
            this.prisma.blog.findMany({
              where,
              orderBy: { [sortBy]: sortOrder },
              take: limit,
              skip,
              include: { category: true },
            }),
            this.prisma.blog.count({ where }),
          ]);

          return {
            blogs,
            pagination: {
              page,
              limit,
              total,
              pages: Math.ceil(total / limit),
              hasNext: page * limit < total,
              hasPrev: page > 1,
            },
          };
        },
        CACHE_TTL.BLOGS
      );
    } catch (error) {
      throw error;
    }
  }

  async getPopularBlogs(limit: number): Promise<Blog[]> {
    try {
      const cacheKey = CACHE_KEYS.BLOGS.POPULAR;

      return await this.cache.getOrFetch(
        cacheKey,
        async () => {
          const blogs = await this.prisma.blog.findMany({
            where: {
              isPublished: true,
              publishedAt: { lte: new Date() },
            },
            include: {
              category: true,
            },
            orderBy: { views: 'desc' },
            take: limit,
          });

          return blogs;
        },
        CACHE_TTL.BLOG_POPULAR
      );
    } catch (error) {
      throw error;
    }
  }

  async getRecentBlogs(limit: number): Promise<Blog[]> {
    try {
      const cacheKey = CACHE_KEYS.BLOGS.RECENT;

      return await this.cache.getOrFetch(
        cacheKey,
        async () => {
          const blogs = await this.prisma.blog.findMany({
            where: {
              isPublished: true,
              publishedAt: { lte: new Date() },
            },
            include: {
              category: true,
            },
            orderBy: { publishedAt: 'desc' },
            take: limit,
          });

          return blogs;
        },
        CACHE_TTL.BLOG_RECENT
      );
    } catch (error) {
      throw error;
    }
  }

  async getBlogsByCategory(categoryId: number, limit: number): Promise<Blog[]> {
    try {
      const cacheKey = CACHE_KEYS.BLOGS.BY_CATEGORY(categoryId);

      return await this.cache.getOrFetch(
        cacheKey,
        async () => {
          const blogs = await this.prisma.blog.findMany({
            where: {
              categoryId,
              isPublished: true,
              publishedAt: { lte: new Date() },
            },
            include: {
              category: true,
            },
            orderBy: { publishedAt: 'desc' },
            take: limit,
          });

          return blogs;
        },
        CACHE_TTL.BLOG_CATEGORIES
      );
    } catch (error) {
      throw error;
    }
  }

  async getAllTags(): Promise<string[]> {
    try {
      const cacheKey = CACHE_KEYS.BLOGS.TAGS;

      return await this.cache.getOrFetch(
        cacheKey,
        async () => {
          const blogs = await this.prisma.blog.findMany({
            where: {
              isPublished: true,
              publishedAt: { lte: new Date() },
            },
            select: { tags: true },
          });

          const allTags = new Set<string>();
          blogs.forEach((blog) => {
            blog.tags.forEach((tag) => allTags.add(tag));
          });

          const tags = Array.from(allTags).sort();
          return tags;
        },
        CACHE_TTL.BLOG_TAGS
      );
    } catch (error) {
      throw error;
    }
  }

  async incrementViews(id: number): Promise<void> {
    try {
      await this.prisma.blog.update({
        where: { id },
        data: {
          views: { increment: 1 },
        },
      });
    } catch (error) {
      console.error('Error incrementing blog views:', error);
    }
  }

  async bulkAction(data: BulkBlogActionInput): Promise<void> {
    try {
      const { ids, action } = data;

      switch (action) {
        case 'publish':
          await this.prisma.blog.updateMany({
            where: { id: { in: ids } },
            data: {
              isPublished: true,
              publishedAt: new Date(),
            },
          });
          break;

        case 'unpublish':
          await this.prisma.blog.updateMany({
            where: { id: { in: ids } },
            data: {
              isPublished: false,
              publishedAt: null,
            },
          });
          break;

        case 'delete':
          await this.prisma.blog.deleteMany({
            where: { id: { in: ids } },
          });
          break;

        default:
          throw new Error('Invalid bulk action');
      }

      // Invalidate cache for all affected blogs
      await Promise.all([
        this.invalidateBlogCache(),
        ...ids.map((id) => this.invalidateBlogCache(id)),
      ]);
    } catch (error) {
      throw error;
    }
  }

  private async invalidateBlogCache(id?: number): Promise<void> {
    try {
      // Invalidate general cache patterns using proper CACHE_PATTERNS
      const cacheInvalidationPromises = [
        this.cache.clearPattern(CACHE_PATTERNS.ALL_BLOGS),
        this.cache.clearPattern(CACHE_PATTERNS.ALL_BLOG_CATEGORIES),
        this.cache.del(CACHE_KEYS.BLOGS.TAGS),
        this.cache.del(CACHE_KEYS.BLOGS.POPULAR),
        this.cache.del(CACHE_KEYS.BLOGS.RECENT),
        this.cache.del(CACHE_KEYS.BLOGS.STATS),
      ];

      // If specific blog ID provided, invalidate specific caches
      if (id) {
        cacheInvalidationPromises.push(
          this.cache.del(CACHE_KEYS.BLOGS.BY_ID(id)),
          this.cache.clearPattern(CACHE_PATTERNS.BLOG_RELATED(id))
        );
      }

      await Promise.all(cacheInvalidationPromises);
    } catch (error) {
      console.error('Error invalidating blog cache:', error);
    }
  }
}
