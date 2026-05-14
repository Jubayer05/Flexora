import type { CustomPage, Prisma } from '@prisma/client'
import { PrismaClient } from '@prisma/client'
import { buildCacheKey, CACHE_KEYS, CACHE_PATTERNS, CACHE_TTL } from '../configs/cache.config'
import type { Pagination } from '../types/req-res'
import { PAGELIMIT } from '../validations/common/pagination.schema'
import type {
  CreateCustomPageInput,
  CustomPageQuery,
  UpdateCustomPageInput
} from '../validations/zod/custom-page.schema'
import { CacheService } from './cache.service'

export class CustomPageService {
  private prisma: PrismaClient
  private cache: CacheService

  constructor(prisma: PrismaClient, cache: CacheService) {
    this.prisma = prisma
    this.cache = cache
  }

  async createPage(data: CreateCustomPageInput): Promise<CustomPage> {
    try {
      // Check for duplicate slug
      const existing = await this.prisma.customPage.findUnique({
        where: { slug: data.slug }
      })

      if (existing) {
        throw new Error('Page with this slug already exists')
      }

      const page = await this.prisma.customPage.create({
        data
      })

      // Invalidate cache
      await this.invalidatePageCache()

      return page
    } catch (error) {
      throw error
    }
  }

  async updatePage(id: string, data: UpdateCustomPageInput): Promise<CustomPage> {
    try {
      // Check if page exists
      const existing = await this.prisma.customPage.findUnique({
        where: { id }
      })

      if (!existing) {
        throw new Error('Custom page not found')
      }

      // Check for slug duplicate if updating slug
      if (data.slug && data.slug !== existing.slug) {
        const slugExists = await this.prisma.customPage.findUnique({
          where: { slug: data.slug }
        })

        if (slugExists) {
          throw new Error('Page with this slug already exists')
        }
      }

      const page = await this.prisma.customPage.update({
        where: { id },
        data
      })

      // Invalidate cache
      await this.invalidatePageCache(id)

      return page
    } catch (error) {
      throw error
    }
  }

  async deletePage(id: string): Promise<void> {
    try {
      // Check if page exists
      const page = await this.prisma.customPage.findUnique({
        where: { id }
      })

      if (!page) {
        throw new Error('Custom page not found')
      }

      await this.prisma.customPage.delete({
        where: { id }
      })

      // Invalidate cache
      await this.invalidatePageCache(id)
    } catch (error) {
      throw error
    }
  }

  async getPageById(id: string): Promise<CustomPage | null> {
    try {
      const cacheKey = CACHE_KEYS.CUSTOM_PAGES.BY_ID(id)

      const page = await this.cache.getOrFetch(
        cacheKey,
        async () => {
          const page = await this.prisma.customPage.findUnique({
            where: { id }
          })
          return page
        },
        CACHE_TTL.CUSTOM_PAGE_DETAIL
      )

      return page
    } catch (error) {
      throw error
    }
  }

  async getPageBySlug(slug: string): Promise<CustomPage | null> {
    try {
      const cacheKey = CACHE_KEYS.CUSTOM_PAGES.BY_SLUG(slug)

      const page = await this.cache.getOrFetch(
        cacheKey,
        async () => {
          const page = await this.prisma.customPage.findUnique({
            where: { slug }
          })
          return page
        },
        CACHE_TTL.CUSTOM_PAGE_DETAIL
      )

      return page
    } catch (error) {
      throw error
    }
  }

  async getPagesInfo(
    includes?: (keyof CustomPage)[],
    query?: any
  ): Promise<{
    pages: Partial<CustomPage>[]
  }> {
    try {
      if (includes) {
        const validKeys = Object.keys(this.prisma.customPage.fields) as (keyof CustomPage)[]
        const validIncludes = includes.filter((key) => validKeys.includes(key))

        if (validIncludes.length !== includes.length) {
          const invalidKeys = includes.filter((key) => !validKeys.includes(key))
          throw new Error(
            `Invalid field(s) in includes parameter: ${invalidKeys.join(', ')}. Available fields: ${validKeys.join(', ')}`
          )
        }
      }

      const where: Prisma.CustomPageWhereInput = {}

      if (query.type) {
        where.type = query.type
      }
      if (query.location) {
        where.location = query.location
      }

      const pages = await this.prisma.customPage.findMany({
        where,
        select: {
          id: true,
          slug: true,
          title: true,
          createdAt: true,
          updatedAt: true,
          ...(includes?.reduce((acc: any, key) => {
            acc[key] = true
            return acc
          }, {}) || {})
        },
        orderBy: { sortOrder: 'asc' }
      })

      return {
        pages
      }
    } catch (error) {
      throw error
    }
  }

  async getPages(query: CustomPageQuery = { page: 1, limit: PAGELIMIT }): Promise<{
    pages: CustomPage[]
    pagination: Pagination
  }> {
    try {
      const { search, page, limit, type, location } = query

      const cacheKey = buildCacheKey.customPagesList(page, limit, {
        search,
        type,
        location
      })

      return await this.cache.getOrFetch(
        cacheKey,
        async () => {
          const where: any = {}

          if (search) {
            where.OR = [
              { title: { contains: search, mode: 'insensitive' } },
              { slug: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } }
            ]
          }

          if (type) {
            where.type = type
          }

          if (location) {
            where.location = location
          }

          const skip = (page - 1) * limit

          const [pages, total] = await Promise.all([
            this.prisma.customPage.findMany({
              where,
              orderBy: { sortOrder: 'asc' },
              take: limit,
              skip
            }),
            this.prisma.customPage.count({ where })
          ])

          return {
            pages,
            pagination: {
              page,
              limit,
              total,
              pages: Math.ceil(total / limit),
              hasNext: page * limit < total,
              hasPrev: page > 1
            }
          }
        },
        CACHE_TTL.CUSTOM_PAGES
      )
    } catch (error) {
      throw error
    }
  }

  private async invalidatePageCache(id?: string): Promise<void> {
    try {
      const cacheInvalidationPromises: Promise<any>[] = [
        this.cache.clearPattern(CACHE_PATTERNS.ALL_CUSTOM_PAGES)
      ]

      if (id) {
        // Get the page to find its slug for cache invalidation
        const page = await this.prisma.customPage.findUnique({
          where: { id },
          select: { slug: true }
        })

        cacheInvalidationPromises.push(this.cache.del(CACHE_KEYS.CUSTOM_PAGES.BY_ID(id)))

        if (page?.slug) {
          cacheInvalidationPromises.push(this.cache.del(CACHE_KEYS.CUSTOM_PAGES.BY_SLUG(page.slug)))
        }
      }

      await Promise.all(cacheInvalidationPromises)
    } catch (error) {
      console.error('Error invalidating custom page cache:', error)
    }
  }
}
