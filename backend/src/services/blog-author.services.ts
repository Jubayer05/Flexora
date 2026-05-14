import type { BlogAuthor } from '@prisma/client'
import { PrismaClient } from '@prisma/client'
import type {
  CreateBlogAuthorInput,
  UpdateBlogAuthorInput
} from '../validations/zod/blog-author.schema'

export class BlogAuthorService {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateBlogAuthorInput): Promise<BlogAuthor> {
    const nameTrim = data.name.trim()
    const existingByName = await this.prisma.blogAuthor.findFirst({
      where: { name: { equals: nameTrim, mode: 'insensitive' } }
    })
    if (existingByName) {
      throw new Error('Author with this name already exists')
    }
    const emailTrim = (data.email ?? '').trim()
    if (emailTrim) {
      const existingByEmail = await this.prisma.blogAuthor.findFirst({
        where: { email: { equals: emailTrim, mode: 'insensitive' } }
      })
      if (existingByEmail) {
        throw new Error('Author with this email already exists')
      }
    }
    return this.prisma.blogAuthor.create({
      data: {
        name: nameTrim,
        email: emailTrim,
        bio: data.bio?.trim() ?? null
      }
    })
  }

  async update(id: number, data: UpdateBlogAuthorInput): Promise<BlogAuthor> {
    const existing = await this.prisma.blogAuthor.findUnique({ where: { id } })
    if (!existing) {
      throw new Error('Author not found')
    }
    if (data.name !== undefined) {
      const nameTrim = data.name.trim()
      if (nameTrim !== existing.name) {
        const duplicate = await this.prisma.blogAuthor.findFirst({
          where: {
            id: { not: id },
            name: { equals: nameTrim, mode: 'insensitive' }
          }
        })
        if (duplicate) {
          throw new Error('Author with this name already exists')
        }
      }
    }
    if (data.email !== undefined) {
      const emailTrim = data.email.trim()
      if (emailTrim !== existing.email) {
        const duplicate = await this.prisma.blogAuthor.findFirst({
          where: {
            id: { not: id },
            email: { equals: emailTrim, mode: 'insensitive' }
          }
        })
        if (duplicate) {
          throw new Error('Author with this email already exists')
        }
      }
    }
    return this.prisma.blogAuthor.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.email !== undefined && { email: data.email.trim() }),
        ...(data.bio !== undefined && { bio: data.bio?.trim() ?? null }),
        ...(data.isActive !== undefined && { isActive: data.isActive })
      }
    })
  }

  async findById(id: number): Promise<BlogAuthor | null> {
    return this.prisma.blogAuthor.findUnique({ where: { id } })
  }

  async findAll(options: { active?: boolean } = {}): Promise<BlogAuthor[]> {
    return this.prisma.blogAuthor.findMany({
      where: options.active === true ? { isActive: true } : undefined,
      orderBy: { createdAt: 'desc' }
    })
  }

  async findRandomActive(): Promise<BlogAuthor | null> {
    const authors = await this.prisma.blogAuthor.findMany({
      where: { isActive: true },
      take: 50
    })
    if (authors.length === 0) return null
    const index = Math.floor(Math.random() * authors.length)
    return authors[index] ?? null
  }

  async delete(id: number): Promise<void> {
    const author = await this.prisma.blogAuthor.findUnique({
      where: { id },
      include: { _count: { select: { blogs: true } } }
    })
    if (!author) {
      throw new Error('Author not found')
    }
    if (author._count.blogs > 0) {
      throw new Error(
        `Cannot delete author. They are assigned to ${author._count.blogs} blog(s). Please reassign or remove those blogs first.`
      )
    }
    await this.prisma.blogAuthor.delete({ where: { id } })
  }
}
