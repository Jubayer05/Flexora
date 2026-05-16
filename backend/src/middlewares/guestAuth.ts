import jwt from 'jsonwebtoken'
import type { Response, NextFunction } from 'express'
import type { AuthRequest } from '../types/req-res'

export function guestAuthMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const auth = req.headers.authorization
  if (!auth) return res.status(401).json({ message: 'No token' })
  const token = auth.split(' ')[1]
  const secret = process.env.JWT_SECRET
  if (!secret || !token) {
    return res.status(500).json({ message: 'Server misconfigured' })
  }
  try {
    const decoded = jwt.verify(token, secret)
    if (typeof decoded !== 'object' || decoded === null || (decoded as { type?: string }).type !== 'guest') {
      throw new Error('Invalid guest token')
    }
    const email = (decoded as { email?: string }).email
    if (!email) {
      throw new Error('Invalid guest token')
    }
    req.guestAccess = { email }
    next()
  } catch {
    res.status(401).json({ message: 'Invalid or expired guest token' })
  }
}
