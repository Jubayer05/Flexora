import jwt from 'jsonwebtoken'
import type { Request, Response, NextFunction } from 'express'

export function guestAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization
  if (!auth) return res.status(401).json({ message: 'No token' })
  const token = auth.split(' ')[1]
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    if (typeof decoded !== 'object' || decoded.type !== 'guest') throw new Error()
    req.guest = decoded
    next()
  } catch {
    res.status(401).json({ message: 'Invalid or expired guest token' })
  }
}
