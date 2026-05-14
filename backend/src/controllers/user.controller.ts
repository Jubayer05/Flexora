import type { NextFunction, Request, Response } from 'express'
import path from 'path'
import { sendEmail } from '../libs/email'
import { uploadToR2 } from '../lib/r2'
import { UserService } from '../services/user.services'
import { sendCreatedResponse, sendSuccessResponse, type ApiResponse } from '../utils'
import { generateRandomString } from '../utils'
import {
  BanUserSchema,
  BulkUserDeleteSchema,
  BulkUserUpdateSchema,
  ChangePasswordSchema,
  ConvertGuestSchema,
  CreateUserSchema,
  SetPasswordSchema,
  UpdateProfileSchema,
  UpdateUserSchema,
  UserIdSchema,
  UserQuerySchema
} from '../validations/zod/user.schema'

// Initialize service
const userService = new UserService()

// ================================
// USER CRUD OPERATIONS
// ================================

export const createUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const validatedData = CreateUserSchema.parse(req.body)
    const user = await userService.create(validatedData)

    // Sensitive data already excluded from UserWithLoginInfo
    // UserWithLoginInfo already excludes sensitive data

    return sendCreatedResponse(res, user, 'User created successfully')
  } catch (error) {
    next(error)
  }
}

export const getUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = UserIdSchema.parse(req.params)
    const user = await userService.findById(id)

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    return sendSuccessResponse(res, user, 'User retrieved successfully')
  } catch (error) {
    next(error)
  }
}

export const getUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const queryParams = UserQuerySchema.parse(req.query)
    const result = await userService.findMany(queryParams)

    return sendSuccessResponse(res, result, 'Users retrieved successfully')
  } catch (error) {
    next(error)
  }
}

export const updateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = UserIdSchema.parse(req.params)
    const validatedData = UpdateUserSchema.parse(req.body)

    const user = await userService.update(id, validatedData)

    return sendSuccessResponse(res, user, 'User updated successfully')
  } catch (error) {
    next(error)
  }
}

export const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = UserIdSchema.parse(req.params)
    await userService.delete(id)

    return sendSuccessResponse(res, null, 'User deleted successfully')
  } catch (error) {
    next(error)
  }
}

// ================================
// USER PROFILE OPERATIONS
// ================================

export const getProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const userId = (req as any).user?.userId
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      })
    }

    const user = await userService.findById(userId)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    // Sensitive data already excluded from UserWithLoginInfo
    // UserWithLoginInfo already excludes sensitive data

    return sendSuccessResponse(res, user, 'Profile retrieved successfully')
  } catch (error) {
    next(error)
  }
}

export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const userId = (req as any).user?.userId
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      })
    }

    const validatedData = UpdateProfileSchema.parse(req.body)

    // Build update payload with only profile-allowed fields; convert empty photoUrl to null for Prisma
    const updateData: Record<string, unknown> = {}
    if (validatedData.firstName !== undefined) updateData.firstName = validatedData.firstName
    if (validatedData.phone !== undefined)
      updateData.phone = validatedData.phone.trim() === '' ? null : validatedData.phone.trim()
    if (validatedData.telegramUsername !== undefined)
      updateData.telegramUsername =
        validatedData.telegramUsername.trim() === '' ? null : validatedData.telegramUsername.trim()
    if (validatedData.photoUrl !== undefined)
      updateData.photoUrl = validatedData.photoUrl === '' ? null : validatedData.photoUrl
    if (validatedData.email !== undefined) updateData.email = validatedData.email

    const user = await userService.update(userId, updateData as any)

    // Sensitive data already excluded from UserWithLoginInfo
    // UserWithLoginInfo already excludes sensitive data

    return sendSuccessResponse(res, user, 'Profile updated successfully')
  } catch (error) {
    next(error)
  }
}

const PROFILE_IMAGE_FOLDER = 'profileImage'

/**
 * Upload profile image to R2 (profileImage folder). Returns the public URL.
 */
export const uploadProfileImage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<string>> | void> => {
  try {
    const file = req.file as Express.Multer.File
    if (!file || !file.buffer) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      })
    }
    const ext = path.extname(file.originalname) || '.jpg'
    const filename = `${generateRandomString(16)}${ext}`
    const publicUrl = await uploadToR2(file.buffer, filename, PROFILE_IMAGE_FOLDER)
    return sendCreatedResponse(res, publicUrl, 'Profile image uploaded successfully')
  } catch (error) {
    next(error)
  }
}

export const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const userId = (req as any).user?.userId
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      })
    }

    const validatedData = ChangePasswordSchema.parse(req.body)
    await userService.changePassword(userId, validatedData)

    return sendSuccessResponse(res, null, 'Password changed successfully')
  } catch (error) {
    next(error)
  }
}

// ================================
// ADMIN OPERATIONS
// ================================

export const banUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = UserIdSchema.parse(req.params)
    const { reason } = BanUserSchema.parse(req.body)

    const user = await userService.banUser(id, reason)

    // Sensitive data already excluded from UserWithLoginInfo
    // UserWithLoginInfo already excludes sensitive data

    return sendSuccessResponse(res, user, 'User banned successfully')
  } catch (error) {
    next(error)
  }
}

export const unbanUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = UserIdSchema.parse(req.params)
    const user = await userService.unbanUser(id)

    // Sensitive data already excluded from UserWithLoginInfo
    // UserWithLoginInfo already excludes sensitive data

    return sendSuccessResponse(res, user, 'User unbanned successfully')
  } catch (error) {
    next(error)
  }
}

export const verifyUserEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = UserIdSchema.parse(req.params)
    const user = await userService.verifyEmail(id)

    // Sensitive data already excluded from UserWithLoginInfo
    // UserWithLoginInfo already excludes sensitive data

    return sendSuccessResponse(res, user, 'User email verified successfully')
  } catch (error) {
    next(error)
  }
}

export const setUserPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = UserIdSchema.parse(req.params)
    const { password } = SetPasswordSchema.parse(req.body)

    await userService.setPassword(id, password)

    return sendSuccessResponse(res, null, 'User password set successfully')
  } catch (error) {
    next(error)
  }
}

export const updateUserRank = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = UserIdSchema.parse(req.params)
    const user = await userService.updateUserRank(id)

    // Sensitive data already excluded from UserWithLoginInfo
    // UserWithLoginInfo already excludes sensitive data

    return sendSuccessResponse(res, user, 'User rank updated successfully')
  } catch (error) {
    next(error)
  }
}

// ================================
// GUEST USER OPERATIONS
// ================================

export const convertGuestToRegistered = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const userId = (req as any).user?.userId
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      })
    }

    // Check if user is guest - need sensitive data access for guestToken
    const currentUser = await userService.findByIdWithSensitiveData(userId)
    if (!currentUser?.isGuest || !currentUser.guestToken) {
      return res.status(400).json({
        success: false,
        message: 'User is not a guest user'
      })
    }

    const validatedData = ConvertGuestSchema.parse(req.body)
    const user = await userService.convertGuestToRegistered(currentUser.guestToken, validatedData)

    return sendSuccessResponse(res, user, 'Guest user converted to registered user successfully')
  } catch (error) {
    next(error)
  }
}

// ================================
// ANALYTICS & STATISTICS
// ================================

export const getUserStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const stats = await userService.getUserStats()
    return sendSuccessResponse(res, stats, 'User statistics retrieved successfully')
  } catch (error) {
    next(error)
  }
}

// ================================
// BULK OPERATIONS
// ================================

export const bulkUpdateUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const validatedData = BulkUserUpdateSchema.parse(req.body)
    const result = await userService.bulkUpdate(validatedData)

    return sendSuccessResponse(res, result, `${result.count} users updated successfully`)
  } catch (error) {
    next(error)
  }
}

export const bulkDeleteUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const validatedData = BulkUserDeleteSchema.parse(req.body)
    const result = await userService.bulkDelete(validatedData)

    return sendSuccessResponse(res, result, `${result.count} users deleted successfully`)
  } catch (error) {
    next(error)
  }
}

// ================================
// EMAIL OPERATIONS
// ================================

export const sendEmailToCustomer = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = UserIdSchema.parse(req.params)
    const { subject, body } = req.body

    if (!body?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Email body is required'
      })
    }

    const user = await userService.findById(id)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    const emailSubject = subject?.trim() || 'Message from UHQ Account'

    await sendEmail(user.email, body.trim(), emailSubject)

    return sendSuccessResponse(res, null, 'Email sent successfully')
  } catch (error) {
    next(error)
  }
}
