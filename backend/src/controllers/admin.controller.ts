import type { Request, Response } from 'express'
import type { AdminAuthRequest } from '../middlewares/auth'
import {
  AdminService,
  type AdminLoginCredentials,
  type CreateAdminData
} from '../services/admin.services'
import { cleanIpAddress } from '../utils'
import {
  handleControllerError,
  sendCreatedResponse,
  sendNotFoundResponse,
  sendSuccessResponse,
  sendUnauthorizedResponse
} from '../utils/response-handler'
import {
  AdminIdSchema,
  AdminLoginSchema,
  AdminPasswordChangeSchema,
  AdminQuerySchema,
  AdminRefreshTokenSchema,
  CreateAdminSchema,
  RevokeAdminSessionSchema,
  UpdateAdminSchema
} from '../validations/zod/admin.schema'

// Initialize service instance (OOP approach)
const adminService = new AdminService()

// ================================
// ADMIN AUTHENTICATION
// ================================

/**
 * Admin login with email and password
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = AdminLoginSchema.parse(req.body)

    const result = await adminService.adminLogin(
      { email, password } as AdminLoginCredentials,
      req.get('User-Agent'),
      cleanIpAddress(req.ip) || undefined
    )

    sendSuccessResponse(
      res,
      {
        admin: result.admin,
        token: result.token,
        refreshToken: result.refreshToken,
        session: result.session
      },
      'Admin login successful'
    )
  } catch (error) {
    handleControllerError(res, error, 'Admin login failed')
  }
}

/**
 * Admin logout and revoke session
 */
export const logout = async (req: AdminAuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.admin?.sessionId) {
      sendUnauthorizedResponse(res, 'Invalid session')
      return
    }

    await adminService.adminLogout(req.admin.sessionId)

    sendSuccessResponse(res, null, 'Admin logout successful')
  } catch (error) {
    handleControllerError(res, error, 'Admin logout failed')
  }
}

/**
 * Refresh admin access token
 */
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = AdminRefreshTokenSchema.parse(req.body)

    const result = await adminService.refreshAdminToken(refreshToken)

    sendSuccessResponse(
      res,
      {
        token: result.token,
        refreshToken: result.refreshToken
      },
      'Token refreshed successfully'
    )
  } catch (error) {
    handleControllerError(res, error, 'Token refresh failed')
  }
}

/**
 * Verify admin token and get current admin info
 */
export const verifyToken = async (req: AdminAuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.admin?.id) {
      sendUnauthorizedResponse(res, 'Invalid admin session')
      return
    }

    // Get fresh admin data
    const admin = await adminService.findAdminByIdForAuth(req.admin.id)

    if (!admin) {
      sendNotFoundResponse(res, 'Admin not found')
      return
    }

    sendSuccessResponse(res, { admin }, 'Admin verified successfully')
  } catch (error) {
    handleControllerError(res, error, 'Token verification failed')
  }
}

/**
 * Get current admin's permissions for sidebar/UI filtering
 * Returns permissions in frontend-expected format: { __superAdmin: true } or { resource: [actions], ... }
 */
export const getAdminPermissions = async (req: AdminAuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.admin?.id) {
      sendUnauthorizedResponse(res, 'Invalid admin session')
      return
    }

    const permissions = await adminService.getAdminPermissions(req.admin.id)
    sendSuccessResponse(res, { permissions }, 'Permissions retrieved successfully')
  } catch (error) {
    handleControllerError(res, error, 'Failed to retrieve permissions')
  }
}

// ================================
// SESSION MANAGEMENT
// ================================

/**
 * Get all active admin sessions for current admin
 */
export const getAdminSessions = async (req: AdminAuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.admin?.id) {
      sendUnauthorizedResponse(res, 'Invalid admin session')
      return
    }

    const sessions = await adminService.getActiveAdminSessions(req.admin.id)

    sendSuccessResponse(res, { sessions }, 'Admin sessions retrieved successfully')
  } catch (error) {
    handleControllerError(res, error, 'Failed to retrieve admin sessions')
  }
}

/**
 * Revoke a specific admin session
 */
export const revokeSession = async (req: AdminAuthRequest, res: Response): Promise<void> => {
  try {
    const { sessionId } = RevokeAdminSessionSchema.parse(req.body)

    if (!req.admin?.id) {
      sendUnauthorizedResponse(res, 'Invalid admin session')
      return
    }

    await adminService.revokeAdminSession(sessionId, req.admin.id)

    sendSuccessResponse(res, null, 'Session revoked successfully')
  } catch (error) {
    handleControllerError(res, error, 'Failed to revoke session')
  }
}

/**
 * Revoke all admin sessions except current one
 */
export const revokeAllSessions = async (req: AdminAuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.admin?.id || !req.admin?.sessionId) {
      sendUnauthorizedResponse(res, 'Invalid admin session')
      return
    }

    await adminService.revokeAllOtherAdminSessions(req.admin.id, req.admin.sessionId)

    sendSuccessResponse(res, null, 'All other sessions revoked successfully')
  } catch (error) {
    handleControllerError(res, error, 'Failed to revoke sessions')
  }
}

// ================================
// ADMIN MANAGEMENT
// ================================

/**
 * Create a new admin (admin privilege required)
 */
export const createAdmin = async (req: AdminAuthRequest, res: Response): Promise<void> => {
  try {
    const adminData = CreateAdminSchema.parse(req.body)

    if (!req.admin?.id) {
      sendUnauthorizedResponse(res, 'Invalid admin session')
      return
    }

    const result = await adminService.createAdmin(adminData as CreateAdminData, req.admin.id)

    sendCreatedResponse(res, { admin: result }, 'Admin created successfully')
  } catch (error) {
    handleControllerError(res, error, 'Failed to create admin')
  }
}

/**
 * Get list of all admins (excluding super admin)
 */
export const getAdmins = async (req: Request, res: Response): Promise<void> => {
  try {
    const queryParams = AdminQuerySchema.parse(req.query)

    const result = await adminService.getAdminListWithQuery(queryParams)

    sendSuccessResponse(res, result, 'Admins retrieved successfully')
  } catch (error) {
    handleControllerError(res, error, 'Failed to retrieve admins')
  }
}

/**
 * Get specific admin by ID
 */
export const getAdminById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = AdminIdSchema.parse(req.params)

    const admin = await adminService.findAdminById(id)

    if (!admin) {
      sendNotFoundResponse(res, 'Admin not found')
      return
    }

    sendSuccessResponse(res, { admin }, 'Admin retrieved successfully')
  } catch (error) {
    handleControllerError(res, error, 'Failed to retrieve admin')
  }
}

/**
 * Update admin details
 */
export const updateAdmin = async (req: AdminAuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = AdminIdSchema.parse(req.params)
    const updateData = UpdateAdminSchema.parse(req.body)

    if (!req.admin?.id) {
      sendUnauthorizedResponse(res, 'Invalid admin session')
      return
    }

    const result = await adminService.updateAdminById(id, updateData, req.admin.id)

    sendSuccessResponse(res, { admin: result }, 'Admin updated successfully')
  } catch (error) {
    handleControllerError(res, error, 'Failed to update admin')
  }
}

/**
 * Change admin password
 */
export const changePassword = async (req: AdminAuthRequest, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = AdminPasswordChangeSchema.parse(req.body)

    if (!req.admin?.id) {
      sendUnauthorizedResponse(res, 'Invalid admin session')
      return
    }

    await adminService.changeAdminPassword(req.admin.id, currentPassword, newPassword)

    sendSuccessResponse(res, null, 'Password changed successfully')
  } catch (error) {
    handleControllerError(res, error, 'Failed to change password')
  }
}

// ================================
// ADMIN STATISTICS
// ================================

/**
 * Get admin statistics and dashboard data
 */
export const getAdminStats = async (req: AdminAuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.admin?.id) {
      sendUnauthorizedResponse(res, 'Invalid admin session')
      return
    }

    const stats = await adminService.getAdminDashboardStats()

    sendSuccessResponse(res, { stats }, 'Admin statistics retrieved successfully')
  } catch (error) {
    handleControllerError(res, error, 'Failed to retrieve admin statistics')
  }
}
