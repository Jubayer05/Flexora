import { z } from 'zod';
import { PaginationSchema } from '../common/pagination.schema';

// Enums
export const GalleryType = z.enum(['IMAGE', 'VIDEO', 'FILE']);

// Gallery Query Schema
export const GalleryQuerySchema = PaginationSchema.extend({
  type: GalleryType.optional(),
  search: z.string().optional(), // Search by filename or URL
});

// Gallery Upload Schema
export const GalleryUploadSchema = z.object({
  files: z.array(z.any()).min(1, 'At least one file is required'),
});

// Gallery Delete Schema
export const GalleryDeleteSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1, 'At least one gallery ID is required'),
});

// Gallery Update Schema
export const GalleryUpdateSchema = z.object({
  id: z.number().int().positive('Gallery ID must be a positive integer'),
  type: GalleryType.optional(),
});

// Export types
export type GalleryQuery = z.infer<typeof GalleryQuerySchema>;
export type GalleryUpload = z.infer<typeof GalleryUploadSchema>;
export type GalleryDelete = z.infer<typeof GalleryDeleteSchema>;
export type GalleryUpdate = z.infer<typeof GalleryUpdateSchema>;
