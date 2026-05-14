import type { UserRole } from '@prisma/client'
import type { NextFunction, Response } from 'express'
import { AdminService } from '../services/admin.services'
import { AuthService } from '../services/auth.services'
import type { AuthRequest } from '../types/req-res'
import { attachGuestAccessToRequest } from '../utils/guest-dashboard-auth'
import { nnSec } from '../utils/data-type'

export const updateCache = nnSec * 4
const authService = new AuthService()
const adminService = new AdminService()

// Extended AuthRequest for admin routes
export interface AdminAuthRequest extends AuthRequest {
  admin?: {
    id: number
    email: string
    role: string
    sessionId: string
  }
}

// ================================
// JWT AUTHENTICATION MIDDLEWARE
// ================================

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
        code: 'NO_TOKEN'
      })
    }

    const token = authHeader.split(' ')[1]
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token format',
        code: 'INVALID_TOKEN_FORMAT'
      })
    }

    try {
      const decoded = await authService.verifyToken(token)

      // Attach user info to request
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role as UserRole,
        sessionId: decoded.sessionId,
        isGuest: decoded.user.isGuest
      }

      next()
    } catch (error) {
      const errorMessage = (error as Error).message

      if (errorMessage.includes('expired')) {
        return res.status(401).json({
          success: false,
          message: 'Token has expired',
          code: 'TOKEN_EXPIRED'
        })
      }

      if (errorMessage.includes('invalid') || errorMessage.includes('malformed')) {
        return res.status(401).json({
          success: false,
          message: 'Invalid token',
          code: 'INVALID_TOKEN'
        })
      }

      if (errorMessage.includes('Session expired')) {
        return res.status(401).json({
          success: false,
          message: 'Session has expired. Please login again',
          code: 'SESSION_EXPIRED'
        })
      }

      if (errorMessage.includes('no longer active')) {
        return res.status(401).json({
          success: false,
          message: 'Account is no longer active',
          code: 'ACCOUNT_INACTIVE'
        })
      }

      return res.status(401).json({
        success: false,
        message: 'Authentication failed',
        code: 'AUTH_FAILED'
      })
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal authentication error',
      code: 'AUTH_ERROR'
    })
  }
}

// ================================
// OPTIONAL AUTHENTICATION MIDDLEWARE
// ================================

export const optionalAuthMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      attachGuestAccessToRequest(req)
      // No token provided, continue without authentication
      return next()
    }

    const token = authHeader.split(' ')[1]
    if (!token) {
      return next()
    }

    try {
      const decoded = await authService.verifyToken(token)

      // Attach user info to request if token is valid
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role as UserRole,
        sessionId: decoded.sessionId,
        isGuest: decoded.user.isGuest
      }
    } catch (error) {
      // Ignore authentication errors and continue
    }

    attachGuestAccessToRequest(req)
    next()
  } catch (error) {
    // If there's any error, just continue without authentication
    attachGuestAccessToRequest(req)
    next()
  }
}

// ================================
// ROLE-BASED ACCESS CONTROL
// ================================

export const requireRole = (allowedRoles: UserRole | UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): Response | void => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'NOT_AUTHENTICATED'
      })
    }

    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        code: 'NOT_AUTHORIZED',
        details: {
          required: roles,
          current: req.user.role
        }
      })
    }

    next()
  }
}

// ================================
// ADMIN ONLY MIDDLEWARE
// ================================

export const requireAdmin = requireRole('ADMIN')

// ================================
// CUSTOMER OR ADMIN MIDDLEWARE
// ================================

export const requireCustomerOrAdmin = requireRole(['CUSTOMER', 'ADMIN'])

// ================================
// NON-GUEST MIDDLEWARE
// ================================

export const requireNonGuest = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Response | void => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      code: 'NOT_AUTHENTICATED'
    })
  }

  if (req.user.isGuest) {
    return res.status(403).json({
      success: false,
      message: 'This action requires a registered account',
      code: 'GUEST_NOT_ALLOWED'
    })
  }

  next()
}

// ================================
// USER OWNERSHIP MIDDLEWARE
// ================================

export const requireOwnershipOrAdmin = (userIdParam: string = 'id') => {
  return (req: AuthRequest, res: Response, next: NextFunction): Response | void => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'NOT_AUTHENTICATED'
      })
    }

    const userIdStr = req.params[userIdParam]
    if (!userIdStr) {
      return res.status(400).json({
        success: false,
        message: 'User ID parameter is required',
        code: 'MISSING_USER_ID'
      })
    }

    const targetUserId = parseInt(userIdStr, 10)
    if (isNaN(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
        code: 'INVALID_USER_ID'
      })
    }

    // Admin can access any user's data
    if (req.user.role === 'ADMIN') {
      return next()
    }

    // User can only access their own data
    if (req.user.userId !== targetUserId) {
      return res.status(403).json({
        success: false,
        message: 'You can only access your own data',
        code: 'OWNERSHIP_REQUIRED'
      })
    }

    next()
  }
}

// ================================
// RATE LIMITING HELPER
// ================================

export const extractUserIdentifier = (req: AuthRequest): string => {
  if (req.user) {
    return `user:${req.user.userId}`
  }
  return `ip:${req.ip || req.connection.remoteAddress || 'unknown'}`
}

// ================================
// SESSION VALIDATION MIDDLEWARE
// ================================

export const validateActiveSession = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  if (!req.user?.sessionId) {
    return res.status(401).json({
      success: false,
      message: 'No active session found',
      code: 'NO_SESSION'
    })
  }

  try {
    const sessions = await authService.getActiveSessions(req.user.userId)
    const currentSession = sessions.find((session) => session.id === req.user!.sessionId)

    if (!currentSession) {
      return res.status(401).json({
        success: false,
        message: 'Session is no longer active',
        code: 'SESSION_INACTIVE'
      })
    }

    next()
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Session validation failed',
      code: 'SESSION_VALIDATION_ERROR'
    })
  }
}

// ================================
// ADMIN AUTHENTICATION MIDDLEWARE
// ================================

/**
 * Admin Authentication Middleware
 *
 * This middleware provides enhanced security for admin authentication by:
 * 1. Using separate JWT secrets (ADMIN_JWT_SECRET) for admin token verification
 * 2. Validating admin-specific token payload (isAdmin flag)
 * 3. Performing additional admin privilege and session checks
 * 4. Providing detailed error responses for admin authentication failures
 *
 * Security Benefits:
 * - Admin tokens are signed with different secrets than user tokens
 * - Compromised user JWT secrets don't affect admin authentication
 * - Clear separation between user and admin authentication systems
 */
export const adminAuthMiddleware = async (
  req: AdminAuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Admin access token required',
        code: 'NO_ADMIN_TOKEN'
      })
    }

    const token = authHeader.split(' ')[1]
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin token format',
        code: 'INVALID_ADMIN_TOKEN_FORMAT'
      })
    }

    try {
      const decoded = await adminService.verifyAdminToken(token)
      // Attach admin info to request
      req.admin = {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        sessionId: decoded.sessionId
      }

      // Also populate user field for compatibility with existing middleware
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role as UserRole,
        sessionId: decoded.sessionId,
        isGuest: false
      }

      next()
    } catch (error) {
      const errorMessage = (error as Error).message

      if (errorMessage.includes('expired')) {
        return res.status(401).json({
          success: false,
          message: 'Admin token has expired',
          code: 'ADMIN_TOKEN_EXPIRED'
        })
      }

      if (errorMessage.includes('invalid') || errorMessage.includes('malformed')) {
        return res.status(401).json({
          success: false,
          message: 'Invalid admin token',
          code: 'INVALID_ADMIN_TOKEN'
        })
      }

      if (errorMessage.includes('Session expired')) {
        return res.status(401).json({
          success: false,
          message: 'Admin session has expired. Please login again',
          code: 'ADMIN_SESSION_EXPIRED'
        })
      }

      if (errorMessage.includes('Admin privileges revoked')) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to perform this action',
          code: 'ADMIN_PRIVILEGES_REVOKED'
        })
      }

      if (errorMessage.includes('no longer active')) {
        return res.status(401).json({
          success: false,
          message: 'Admin account is no longer active',
          code: 'ADMIN_ACCOUNT_INACTIVE'
        })
      }

      return res.status(401).json({
        success: false,
        message: 'Admin authentication failed',
        code: 'ADMIN_AUTH_FAILED'
      })
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal admin authentication error',
      code: 'ADMIN_AUTH_ERROR'
    })
  }
}

// ================================
// ADMIN PERMISSION MIDDLEWARE
// ================================

export const requireAdminAuth = (
  req: AdminAuthRequest,
  res: Response,
  next: NextFunction
): Response | void => {
  if (!req.admin) {
    return res.status(401).json({
      success: false,
      message: 'Admin authentication required',
      code: 'ADMIN_AUTH_REQUIRED'
    })
  }

  // Allow both ADMIN and MODERATOR access to admin dashboard
  if (req.admin.role !== 'ADMIN' && req.admin.role !== 'MODERATOR') {
    return res.status(403).json({
      success: false,
      message: 'Admin or Moderator privileges required',
      code: 'ADMIN_OR_MODERATOR_REQUIRED'
    })
  }

  next()
}

// ================================
// ADMIN-ONLY MIDDLEWARE (for sensitive operations)
// ================================

export const requireAdminOnly = (
  req: AdminAuthRequest,
  res: Response,
  next: NextFunction
): Response | void => {
  if (!req.admin) {
    return res.status(401).json({
      success: false,
      message: 'Admin authentication required',
      code: 'ADMIN_AUTH_REQUIRED'
    })
  }

  // Only ADMIN can perform sensitive operations (not MODERATOR)
  if (req.admin.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Full admin privileges required for this operation',
      code: 'ADMIN_ONLY_REQUIRED'
    })
  }

  next()
}

// ================================
// SUPER ADMIN DETECTION MIDDLEWARE
// ================================

export const preventSuperAdminAccess = (
  req: AdminAuthRequest,
  res: Response,
  next: NextFunction
): Response | void => {
  // Check if trying to access super admin account
  const targetEmail = req.body?.email || req.query?.email

  // Prevent super admin email in requests
  if (targetEmail === 'superadmin@uhq.com') {
    return res.status(403).json({
      success: false,
      message: 'Super admin account access is restricted',
      code: 'SUPER_ADMIN_ACCESS_DENIED'
    })
  }

  next()
}

// ================================
// ADMIN SESSION VALIDATION
// ================================

export const validateAdminSession = async (
  req: AdminAuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  if (!req.admin?.sessionId) {
    return res.status(401).json({
      success: false,
      message: 'No active admin session found',
      code: 'NO_ADMIN_SESSION'
    })
  }

  try {
    const sessions = await adminService.getActiveAdminSessions(req.admin.id)
    const currentSession = sessions.find((session) => session.id === req.admin!.sessionId)

    if (!currentSession) {
      return res.status(401).json({
        success: false,
        message: 'Admin session is no longer active',
        code: 'ADMIN_SESSION_INACTIVE'
      })
    }

    next()
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Admin session validation failed',
      code: 'ADMIN_SESSION_VALIDATION_ERROR'
    })
  }
}

// ================================
// PERMISSION-BASED ACCESS CONTROL
// ================================

/**
 * Middleware to check specific resource-action permissions
 * Only applies to admin-protected routes
 */
export const requirePermission = (resource: string, action: string) => {
  return async (
    req: AdminAuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    // This middleware should only be used after adminAuthMiddleware
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED'
      })
    }

    try {
      // ADMIN bypasses all permission checks
      if (req.admin.role === 'ADMIN') {
        return next()
      }

      // MODERATOR must have specific permission
      if (req.admin.role === 'MODERATOR') {
        const { PermissionService } = await import('../services/permission.services')
        const permissionService = new PermissionService()

        const hasAccess = await permissionService.checkModeratorPermission(
          req.admin.id,
          resource,
          action
        )

        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            message: `Not authorized to ${action.toLowerCase()} ${resource.toLowerCase()}`,
            code: 'NOT_AUTHORIZED',
            details: { resource, action, required: `${resource}:${action}` }
          })
        }

        return next()
      }

      // Should never reach here due to adminAuthMiddleware
      return res.status(403).json({
        success: false,
        message: 'Invalid user role for admin operation',
        code: 'INVALID_ROLE'
      })
    } catch (error) {
      console.error('Permission check error:', error)
      return res.status(500).json({
        success: false,
        message: 'Permission validation failed',
        code: 'PERMISSION_CHECK_ERROR'
      })
    }
  }
}

// ================================
// ADMIN USER OWNERSHIP MIDDLEWARE
// ================================

export const requireOwnershipOrAdminAuth = (userIdParam: string = 'id') => {
  return (req: AdminAuthRequest, res: Response, next: NextFunction): Response | void => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: 'Admin authentication required',
        code: 'ADMIN_AUTH_REQUIRED'
      })
    }

    const userIdStr = req.params[userIdParam]
    if (!userIdStr) {
      return res.status(400).json({
        success: false,
        message: 'User ID parameter is required',
        code: 'MISSING_USER_ID'
      })
    }

    const targetUserId = parseInt(userIdStr, 10)
    if (isNaN(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
        code: 'INVALID_USER_ID'
      })
    }

    // ADMIN can access any user's data
    if (req.admin.role === 'ADMIN') {
      return next()
    }

    // MODERATOR with user management permissions can access user data
    if (req.admin.role === 'MODERATOR') {
      // This will be checked by requirePermission middleware
      // For now, allow and let permission middleware handle it
      return next()
    }

    return res.status(403).json({
      success: false,
      message: 'Admin or appropriate moderator permissions required',
      code: 'ADMIN_OR_MODERATOR_REQUIRED'
    })
  }
}

// ================================
// EXPORT ALL MIDDLEWARES
// ================================

export { type AuthRequest }
