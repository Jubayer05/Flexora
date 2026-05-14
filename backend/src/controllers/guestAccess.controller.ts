import type { Request, Response } from 'express'
import db from '../configs/db'
import jwt from 'jsonwebtoken'

// POST /api/guest/verify
export const verifyGuestCode = async (req: Request, res: Response) => {
  const { email, cartGroup, code } = req.body
  if (!email || !cartGroup || !code) {
    return res.status(400).json({ success: false, message: 'Missing required fields' })
  }

  // Find GuestAccess record
  const record = await db.guestAccess.findFirst({
    where: {
      email,
      cartGroup,
      code,
      expiresAt: { gt: new Date() },
      verified: false
    }
  })
  if (!record) {
    return res.status(401).json({ success: false, message: 'Invalid or expired code' })
  }

  // Mark as verified
  await db.guestAccess.update({ where: { id: record.id }, data: { verified: true } })

  // Generate Guest JWT
  const token = jwt.sign(
    { email, cartGroup, type: 'guest' },
    process.env.JWT_SECRET,
    { expiresIn: '20m' }
  )
  res.json({ success: true, token })
}
