import type { BlogSubCategory } from '@prisma/client'
import { PrismaClient } from '@prisma/client'
import type {
  CreateBlogSubCategoryInput,
  UpdateBlogSubCategoryInput
} from '../validations/zod/blog-subcategory.schema'

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export class BlogSubCategoryService {
  constructor(private readonly prisma: PrismaClient) {}

  private async ensureUniqueSlug(baseSlug: string, excludeId?: number): Promise<string> {
    let slug = baseSlug
    let counter = 1
    for (let attempt = 0; attempt < 100; attempt++) {
      const existing = await this.prisma.blogSubCategory.findFirst({
        where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) }
      })
      if (!existing) return slug
      slug = `${baseSlug}-${counter}`
      counter++
    }
    throw new Error(`Unable to generate unique slug for "${baseSlug}"`)
  }

  async create(data: CreateBlogSubCategoryInput): Promise<BlogSubCategory> {
    const category = await this.prisma.blogCategory.findUnique({
      where: { id: data.categoryId }
    })
    if (!category) throw new Error('Category not found')

    const nameTrim = data.name.trim()
    const existingSameName = await this.prisma.blogSubCategory.findFirst({
      where: {
        name: { equals: nameTrim, mode: 'insensitive' },
        categoryId: data.categoryId
      }
    })
    if (existingSameName) {
      throw new Error('Subcategory with this name already exists in this category')
    }

    const baseSlug = (data.slug?.trim() || generateSlug(nameTrim)) || 'subcategory'
    const slug = await this.ensureUniqueSlug(baseSlug)

    return this.prisma.blogSubCategory.create({
      data: {
        name: nameTrim,
        slug,
        categoryId: data.categoryId,
        authorId: data.authorId ?? undefined
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        author: { select: { id: true, name: true, email: true } }
      }
    })
  }

  async update(id: number, data: UpdateBlogSubCategoryInput): Promise<BlogSubCategory> {
    const existing = await this.prisma.blogSubCategory.findUnique({ where: { id } })
    if (!existing) throw new Error('Subcategory not found')

    if (data.categoryId !== undefined) {
      const cat = await this.prisma.blogCategory.findUnique({
        where: { id: data.categoryId }
      })
      if (!cat) throw new Error('Category not found')
    }

    if (data.name !== undefined) {
      const nameTrim = data.name.trim()
      const duplicate = await this.prisma.blogSubCategory.findFirst({
        where: {
          id: { not: id },
          name: { equals: nameTrim, mode: 'insensitive' },
          categoryId: data.categoryId ?? existing.categoryId
        }
      })
      if (duplicate) {
        throw new Error('Subcategory with this name already exists in this category')
      }
    }

    let slug: string | undefined
    if (data.slug !== undefined) {
      slug = await this.ensureUniqueSlug(data.slug.trim(), id)
    } else if (data.name !== undefined) {
      slug = await this.ensureUniqueSlug(generateSlug(data.name.trim()), id)
    }

    return this.prisma.blogSubCategory.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(slug !== undefined && { slug }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
        ...(data.authorId !== undefined && { authorId: data.authorId ?? null })
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        author: { select: { id: true, name: true, email: true } }
      }
    })
  }

  async findById(id: number): Promise<BlogSubCategory | null> {
    return this.prisma.blogSubCategory.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        author: { select: { id: true, name: true, email: true } }
      }
    })
  }

  async findAll(query: { categoryId?: number } = {}): Promise<BlogSubCategory[]> {
    return this.prisma.blogSubCategory.findMany({
      where: query.categoryId ? { categoryId: query.categoryId } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        author: { select: { id: true, name: true, email: true } }
      }
    })
  }

  async delete(id: number): Promise<void> {
    const sub = await this.prisma.blogSubCategory.findUnique({ where: { id } })
    if (!sub) throw new Error('Subcategory not found')
    await this.prisma.blogSubCategory.delete({ where: { id } })
  }
}
