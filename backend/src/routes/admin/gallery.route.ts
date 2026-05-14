import express from 'express';
import {
  deleteGalleryItems,
  getGalleryItem,
  getGalleryItems,
  uploadFiles,
} from '../../controllers/gallery.controller';
import upload from '../../libs/multer';

const router = express.Router();

// ================================
// GALLERY MANAGEMENT ROUTES
// ================================

/**
 * GET /api/v1/admin/gallery
 * Get gallery items with pagination and filtering
 * Access: Admin
 */
router.get('/', getGalleryItems);

/**
 * GET /api/v1/admin/gallery/:id
 * Get single gallery item by ID
 * Access: Admin
 */
router.get('/:id', getGalleryItem);

/**
 * POST /api/v1/admin/gallery/upload
 * Upload files to the gallery
 * Access: Admin
 * Handles a multipart/form-data request with:
 * - files[]: Multiple files to upload (max 10 files, 10MB each)
 * - file: Single file upload
 * - Any field name with files
 */
router.post('/upload', upload.any(), uploadFiles);

/**
 * DELETE /api/v1/admin/gallery
 * Delete multiple gallery items by IDs
 * Access: Admin
 * Body: { ids: number[] }
 */
router.delete('/', deleteGalleryItems);

export default router;
