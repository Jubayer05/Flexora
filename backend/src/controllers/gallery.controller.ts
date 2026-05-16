import type { Response } from 'express';
import { GalleryService } from '../services/gallery.services';
import type { AuthRequest } from '../types/req-res';
import { handleControllerError, sendCreatedResponse, sendSuccessResponse } from '../utils';
import { GalleryQuerySchema } from '../validations/zod/gallery.schema';

const galleryService = new GalleryService();

// ================================
// GALLERY FILE OPERATIONS
// ================================

export const uploadFiles = async (req: AuthRequest, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];

    // Debug: log upload request state
    console.log('[Gallery Upload] req.files:', files?.length ?? 0, Array.isArray(files) ? 'array' : typeof files);
    const first = files?.[0];
    if (first) {
      console.log('[Gallery Upload] First file:', {
        fieldname: first.fieldname,
        originalname: first.originalname,
        mimetype: first.mimetype,
        size: first.size,
        hasBuffer: Boolean(first.buffer?.length)
      });
    }

    if (!files || files.length === 0) {
      return handleControllerError(res, new Error('No files provided'), 'No files provided');
    }

    const uploadedFiles = await galleryService.uploadFiles(files);

    return sendCreatedResponse(
      res,
      uploadedFiles,
      `${uploadedFiles.length} file(s) uploaded successfully`
    );
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to upload files');
  }
};

export const getGalleryItems = async (req: AuthRequest, res: Response) => {
  try {
    const validatedQuery = GalleryQuerySchema.parse(req.query);

    const result = await galleryService.getGalleryItems(validatedQuery);

    return sendSuccessResponse(res, result, 'Gallery items retrieved successfully');
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to retrieve gallery items');
  }
};

export const getGalleryItem = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return handleControllerError(
        res,
        new Error('Gallery ID is required'),
        'Gallery ID is required'
      );
    }

    const galleryId = parseInt(id);

    if (isNaN(galleryId)) {
      return handleControllerError(res, new Error('Invalid gallery ID'), 'Invalid gallery ID');
    }

    const item = await galleryService.getGalleryItem(galleryId);

    if (!item) {
      return handleControllerError(
        res,
        new Error('Gallery item not found'),
        'Gallery item not found'
      );
    }

    return sendSuccessResponse(res, item, 'Gallery item retrieved successfully');
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to retrieve gallery item');
  }
};

export const deleteGalleryItems = async (req: AuthRequest, res: Response) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return handleControllerError(
        res,
        new Error('No gallery IDs provided'),
        'No gallery IDs provided'
      );
    }

    const deletedCount = await galleryService.deleteGalleryItems(ids);

    return sendSuccessResponse(
      res,
      { deletedCount },
      `${deletedCount} gallery item(s) deleted successfully`
    );
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to delete gallery items');
  }
};
