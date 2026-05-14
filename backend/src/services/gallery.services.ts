import type { Gallery, GalleryType } from '@prisma/client';
import path from 'path';
import db from '../configs/db';
import { deleteFromR2, extractR2KeyFromUrl, uploadToR2 } from '../lib/r2';
import type { Pagination } from '../types/req-res';
import { generateRandomString } from '../utils';
import { PAGELIMIT } from '../validations/common/pagination.schema';
import type { GalleryQuery } from '../validations/zod/gallery.schema';

const R2_FOLDER = 'gallery';

export class GalleryService {
  /**
   * Determine file type based on MIME type
   */
  private getFileType(mimetype: string): GalleryType {
    if (mimetype.startsWith('image/')) return 'IMAGE';
    if (mimetype.startsWith('video/')) return 'VIDEO';
    return 'FILE';
  }

  /**
   * Generate unique filename
   */
  private generateFilename(originalname: string): string {
    const ext = path.extname(originalname);
    const uniqueId = generateRandomString(16);
    return `${uniqueId}${ext}`;
  }

  /**
   * Upload multiple files to Cloudflare R2
   */
  async uploadFiles(files: Express.Multer.File[]): Promise<Gallery[]> {
    const uploadPromises = files.map(async (file) => {
      const filename = this.generateFilename(file.originalname);
      const fileType = this.getFileType(file.mimetype);

      const publicUrl = await uploadToR2(file.buffer, filename, R2_FOLDER);

      const galleryItem = await db.gallery.create({
        data: {
          fileId: filename,
          url: publicUrl,
          type: fileType,
        },
      });

      return galleryItem;
    });

    return Promise.all(uploadPromises);
  }

  /**
   * Get gallery items with pagination and filtering
   */
  async getGalleryItems(query: Partial<GalleryQuery> = {}): Promise<{
    items: Gallery[];
    pagination: Pagination;
  }> {
    try {
      const { page = 1, limit = PAGELIMIT, type, search } = query;

      const where: any = {};

      if (type) {
        where.type = type;
      }

      if (search) {
        where.OR = [
          { fileId: { contains: search, mode: 'insensitive' } },
          { url: { contains: search, mode: 'insensitive' } },
        ];
      }

      const skip = (page - 1) * limit;

      const [items, total] = await Promise.all([
        db.gallery.findMany({
          where,
          take: limit,
          skip,
        }),
        db.gallery.count({ where }),
      ]);

      return {
        items,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get single gallery item by ID
   */
  async getGalleryItem(id: number): Promise<Gallery | null> {
    try {
      const item = await db.gallery.findUnique({
        where: { id },
      });

      return item;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete gallery items by IDs (removes from R2 and database)
   */
  async deleteGalleryItems(ids: number[]): Promise<number> {
    const itemsToDelete = await db.gallery.findMany({
      where: { id: { in: ids } },
    });

    const deletePromises = itemsToDelete.map(async (item) => {
      try {
        const key = extractR2KeyFromUrl(item.url) || `${R2_FOLDER}/${item.fileId}`;
        await deleteFromR2(key);
      } catch (error) {
        console.warn(`Failed to delete R2 object: ${item.url}`, error);
      }
    });

    await Promise.all(deletePromises);

    const result = await db.gallery.deleteMany({
      where: { id: { in: ids } },
    });

    return result.count;
  }

  /**
   * Get gallery item by fileId
   */
  async getGalleryItemByFileId(fileId: string): Promise<Gallery | null> {
    try {
      const item = await db.gallery.findUnique({
        where: { fileId },
      });

      return item;
    } catch (error) {
      throw error;
    }
  }
}
