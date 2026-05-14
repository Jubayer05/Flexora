import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long')
})

export const registerSchema = z
  .object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().optional(),
    email: z.email('Invalid email address'),
    phone: z.string().optional(),
    telegramUsername: z.string().optional(),
    password: z.string().min(8, 'Password must be at least 8 characters').optional(),
    confirm: z.string().min(8, 'Confirm Password must be at least 8 characters').optional()
  })
  .refine(
    (data) =>
      (data.password === undefined && data.confirm === undefined) || data.password === data.confirm,
    {
      message: 'Passwords do not match',
      path: ['confirm']
    }
  )

export const resetSchema = z.object({
  email: z.email('Invalid email address'),
  otp: z.string().min(8, 'OTP must be at least 8 characters long')
})

export type LoginSchema = z.infer<typeof loginSchema>
export type RegisterSchema = z.infer<typeof registerSchema>
export type ResetSchema = z.infer<typeof resetSchema>
