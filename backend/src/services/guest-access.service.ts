import db from '../configs/db'
import crypto from 'crypto'

/**
 * GuestAccessService
 * Manages guest order access tokens for customers who checkout without registration
 * Allows secure access to order details via email-based token
 */
export class GuestAccessService {
  /**
   * Generate a secure access token for guest order
   * Stores token in database for validation
   */
  async generateAccessToken(
    orderId: number,
    guestEmail: string,
    expiresInHours: number = 90 * 24 // 90 days
  ): Promise<string> {
    try {
      // Generate random token
      const token = crypto.randomBytes(32).toString('hex')

      // Calculate expiration time
      const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000)

      // Store token in database (reusing payment table's meta field or create guest_access)
      // For now, we'll store in order metadata
      const order = await db.order.findUnique({
        where: { id: orderId },
        select: { id: true, guestEmail: true }
      })

      if (!order) {
        throw new Error('Order not found')
      }

      // Verify email matches
      if (order.guestEmail && order.guestEmail !== guestEmail) {
        throw new Error('Email does not match this order')
      }

      // Check if guest access record already exists, if not create it
      const existingAccess = await db.guestOrderAccess.findUnique({
        where: { orderId }
      })

      if (existingAccess) {
        // Update existing token
        await db.guestOrderAccess.update({
          where: { orderId },
          data: {
            token,
            expiresAt,
            accessCount: 0
          }
        })
      } else {
        // Create new guest access record
        await db.guestOrderAccess.create({
          data: {
            orderId,
            token,
            guestEmail,
            expiresAt,
            accessCount: 0,
            isActive: true
          }
        })
      }

      console.log('[GuestAccess] Access token generated', {
        orderId,
        email: guestEmail,
        expiresAt
      })

      return token
    } catch (error) {
      console.error('[GuestAccess] Failed to generate access token', {
        orderId,
        guestEmail,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Validate guest access token
   * Returns order ID if token is valid
   */
  async validateAccessToken(token: string, guestEmail: string): Promise<number> {
    try {
      const guestAccess = await db.guestOrderAccess.findUnique({
        where: { token },
        include: { order: true }
      })

      if (!guestAccess) {
        throw new Error('Invalid access token')
      }

      // Check if expired
      if (new Date() > guestAccess.expiresAt) {
        throw new Error('Access token has expired')
      }

      // Check if active
      if (!guestAccess.isActive) {
        throw new Error('Access token has been deactivated')
      }

      // Check email matches
      if (guestAccess.guestEmail !== guestEmail) {
        throw new Error('Email does not match this token')
      }

      // Check order still exists
      if (!guestAccess.order) {
        throw new Error('Associated order not found')
      }

      // Increment access count
      await db.guestOrderAccess.update({
        where: { token },
        data: { accessCount: { increment: 1 } }
      })

      console.log('[GuestAccess] Token validated successfully', {
        orderId: guestAccess.orderId,
        email: guestEmail,
        accessCount: guestAccess.accessCount + 1
      })

      return guestAccess.orderId
    } catch (error) {
      console.error('[GuestAccess] Token validation failed', {
        token: token.substring(0, 8) + '***',
        email: guestEmail,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Get access token for existing order
   */
  async getAccessToken(orderId: number): Promise<string | null> {
    try {
      const guestAccess = await db.guestOrderAccess.findUnique({
        where: { orderId }
      })

      if (!guestAccess || !guestAccess.isActive) {
        return null
      }

      // Check if expired
      if (new Date() > guestAccess.expiresAt) {
        return null
      }

      return guestAccess.token
    } catch (error) {
      console.error('[GuestAccess] Failed to get access token', {
        orderId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return null
    }
  }

  /**
   * Revoke/deactivate access token
   */
  async revokeAccessToken(token: string): Promise<boolean> {
    try {
      const result = await db.guestOrderAccess.update({
        where: { token },
        data: { isActive: false }
      })

      console.log('[GuestAccess] Token revoked', {
        orderId: result.orderId
      })

      return true
    } catch (error) {
      console.error('[GuestAccess] Failed to revoke token', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return false
    }
  }
}

export const guestAccessService = new GuestAccessService()
