import type { Response } from 'express'
import path from 'path'
import { uploadToR2 } from '../lib/r2'
import type { AuthRequest } from '../types/req-res'
import { handleControllerError, sendCreatedResponse } from '../utils'
import { generateRandomString } from '../utils'

const SUPPORT_TICKET_FOLDER = 'supportTicket'

/**
 * Upload images for support tickets (create or reply).
 * Stores in R2 under supportTicket/ folder.
 * Called by both customer and admin routes (multer limits: 2MB per file, images only).
 */
export const uploadTicketImages = async (req: AuthRequest, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[]
    if (!files || files.length === 0) {
      return handleControllerError(res, new Error('No files provided'), 'No files provided')
    }

    const urls: string[] = []
    for (const file of files) {
      const ext = path.extname(file.originalname)
      const filename = `${generateRandomString(16)}${ext}`
      const publicUrl = await uploadToR2(file.buffer, filename, SUPPORT_TICKET_FOLDER)
      urls.push(publicUrl)
    }

    return sendCreatedResponse(res, urls, `${urls.length} file(s) uploaded successfully`)
  } catch (error: any) {
    return handleControllerError(res, error, 'Failed to upload ticket images')
  }
}
