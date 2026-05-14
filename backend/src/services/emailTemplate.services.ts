import { Prisma } from '@prisma/client';
import prisma from '../configs/db';
import type {
  CreateEmailTemplateData,
  EmailTemplateQuery,
  UpdateEmailTemplateData,
} from '../validations';

const db = prisma;

export class EmailTemplateService {
  // ================================
  // CRUD OPERATIONS
  // ================================

  async create(data: CreateEmailTemplateData) {
    const emailTemplate = await db.emailTemplate.create({
      data,
    });

    return emailTemplate;
  }

  async findById(id: number) {
    const emailTemplate = await db.emailTemplate.findUnique({
      where: { id },
    });

    if (!emailTemplate) {
      throw new Error('Email template not found');
    }

    return emailTemplate;
  }

  async findMany(query: EmailTemplateQuery) {
    const { page, limit, type, search } = query;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.EmailTemplateWhereInput = {};

    if (type) {
      where.type = { contains: type, mode: 'insensitive' };
    }

    if (search) {
      where.OR = [
        { type: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [emailTemplates, total] = await Promise.all([
      db.emailTemplate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'desc' },
      }),
      db.emailTemplate.count({ where }),
    ]);

    return {
      data: emailTemplates,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  async update(id: number, data: UpdateEmailTemplateData) {
    // Check if email template exists
    await this.findById(id);

    const emailTemplate = await db.emailTemplate.update({
      where: { id },
      data,
    });

    return emailTemplate;
  }

  async delete(id: number) {
    // Check if email template exists
    await this.findById(id);

    await db.emailTemplate.delete({
      where: { id },
    });

    return { success: true, message: 'Email template deleted successfully' };
  }

  // ================================
  // UTILITY METHODS
  // ================================

  async findByType(type: string) {
    const emailTemplate = await db.emailTemplate.findFirst({
      where: { type },
    });

    return emailTemplate;
  }

  async getAllTypes() {
    const types = await db.emailTemplate.findMany({
      select: { type: true },
      distinct: ['type'],
      orderBy: { type: 'asc' },
    });

    return types.map((t) => t.type);
  }
}
