import { z } from 'zod'

// Admin role enum
export enum AdminRole {
  ADMIN = 'ADMIN',
  //   SUPER_ADMIN = 'SUPER_ADMIN',
  MODERATOR = 'MODERATOR'
}

// Permission actions enum
export enum PermissionAction {
  INDEX = 'index',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  EXPORT = 'export',
  IMPORT = 'import',
  DOWNLOAD = 'download',
  BULK_UPDATE = 'bulk_update',
  BULK_DELETE = 'bulk_delete',
  BULK_CREATE = 'bulk_create',
  ANALYTICS = 'analytics',
  REPORTS = 'reports',
  PUBLISH = 'publish',
  ARCHIVE = 'archive',
  APPROVE = 'approve',
  REJECT = 'reject'
}

// Resources enum (keep in sync with backend permission.services RESOURCES)
export enum Resource {
  PRODUCTS = 'products',
  CATEGORIES = 'categories',
  ORDERS = 'orders',
  USERS = 'users',
  TICKETS = 'tickets',
  ACCOUNTS = 'accounts',
  PAYMENTS = 'payments',
  DELIVERIES = 'deliveries',
  NOTIFICATIONS = 'notifications',
  SETTINGS = 'settings',
  BLOGS = 'blogs',
  TELEGRAM = 'telegram'
}

// Permission schema
export const PermissionSchema = z.object({
  resource: z.nativeEnum(Resource),
  actions: z.array(z.nativeEnum(PermissionAction))
})

// API Permission response schema (with id and roleId)
export const ApiPermissionSchema = z.object({
  id: z.number(),
  roleId: z.number(),
  resource: z.nativeEnum(Resource),
  actions: z.array(z.nativeEnum(PermissionAction))
})

// Role schema (for form submission)
export const RoleSchema = z.object({
  name: z.string().min(1, 'Role name is required'),
  description: z.string().min(1, 'Role description is required'),
  permissions: z.array(PermissionSchema)
})

// Create role schema (for API requests)
export const CreateRoleSchema = RoleSchema

// Update role schema (for API requests)
export const UpdateRoleSchema = RoleSchema.partial().extend({
  id: z.string().optional()
})

// TypeScript types
export type PermissionType = z.infer<typeof PermissionSchema>
export type ApiPermissionType = z.infer<typeof ApiPermissionSchema>
export type RoleType = z.infer<typeof RoleSchema>
export type CreateRoleType = z.infer<typeof CreateRoleSchema>
export type UpdateRoleType = z.infer<typeof UpdateRoleSchema>

// Role response type (matches API response with extended permissions)
export interface RoleApiResponse {
  id: number
  name: string
  description: string
  permissions: ApiPermissionType[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// Simplified role type for form usage
export interface RoleFormData {
  id?: number
  name: string
  description: string
  permissions: PermissionType[]
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

export type RoleResponseType = RoleApiResponse

// Unified admin schema (password optional for updates)
export const CreateAdminSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.nativeEnum(AdminRole),
  phone: z.string().optional(),
  telegramUsername: z.string().optional()
})

// TypeScript types for admin
export type CreateAdminType = z.infer<typeof CreateAdminSchema>
export type UpdateAdminType = CreateAdminType // Use same type for both

// Admin user response type (matches API response)
export interface AdminUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: AdminRole
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type AdminResponseType = AdminUser
