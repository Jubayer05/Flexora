import { z } from 'zod'

// Admin role enum
export enum AdminRole {
  ADMIN = 'ADMIN',
  //   SUPER_ADMIN = 'SUPER_ADMIN',
  MODERATOR = 'MODERATOR'
}

// Unified admin schema (password optional for updates)
export const CreateAdminSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  firstName: z.string().min(1, 'First name is required'),
  role: z.nativeEnum(AdminRole),
  roleId: z.number().int().positive().optional(), // Custom role from DB - used when role is MODERATOR
  phone: z.string().optional(),
  telegramUsername: z.string().optional()
})

// TypeScript types
export type CreateAdminType = z.infer<typeof CreateAdminSchema>
export type UpdateAdminType = CreateAdminType // Use same type for both

// Admin user response type (matches API response)
export interface AdminUser {
  id: number
  email: string
  firstName: string
  role: AdminRole
  roleId?: number | null
  customRole?: { id: number; name: string; description?: string; permissions?: unknown[] } | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type AdminResponseType = AdminUser
