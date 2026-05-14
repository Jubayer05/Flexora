import { z } from 'zod';
import { BooleanSchemaString, PaginationSchema } from '../common/pagination.schema';

// Settings Schema
export const SettingsSchema = z.object({
  key: z
    .string()
    .min(1, 'Setting key is required')
    .max(100, 'Setting key must be less than 100 characters'),
  value: z.any(),
});

// Update Settings Schema
export const UpdateSettingsSchema = z.object({
  id: z.number().int().positive('Setting ID must be a positive integer'),
  value: z.any(),
});

// Bulk Settings Update Schema
export const BulkSettingsUpdateSchema = z.object({
  settings: z
    .array(
      z.object({
        key: z.string().min(1, 'Setting key is required'),
        value: z.any(),
      })
    )
    .min(1, 'At least one setting is required'),
});

// Settings Query Schema
export const SettingsQuerySchema = z.object({
  keys: z.array(z.string()).optional(), // Get specific settings by keys
});

// Login Session Schema
export const LoginSessionSchema = z.object({
  userId: z.number().int().positive('User ID must be a positive integer'),
  token: z.string().min(1, 'Token is required'),
  userAgent: z.string().max(500, 'User agent must be less than 500 characters').optional(),
  ipAddress: z
    .string()
    .regex(
      /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/,
      'Invalid IP address'
    )
    .optional(),
  expiresAt: z.string().datetime('Invalid expiration date'),
  meta: z.record(z.string(), z.any()).optional(),
});

// Update Login Session Schema
export const UpdateLoginSessionSchema = z.object({
  id: z.string().uuid('Invalid session ID'),
  isActive: z.boolean().optional(),
  expiresAt: z.string().datetime('Invalid expiration date').optional(),
  meta: z.record(z.string(), z.any()).optional(),
});

// Login Session Query Schema
export const LoginSessionQuerySchema = PaginationSchema.extend({
  userId: z
    .string()
    .optional()
    .refine((val) => !val || /^\d+$/.test(val), 'User ID must be a valid number')
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .refine((val) => !val || val > 0, 'User ID must be positive'),
  isActive: BooleanSchemaString,
  ipAddress: z
    .string()
    .regex(
      /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/,
      'Invalid IP address'
    )
    .optional(),
  startDate: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), 'Invalid start date'),
  endDate: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), 'Invalid end date'),
  sortBy: z.enum(['createdAt', 'updatedAt', 'expiresAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// System Revoke Session Schema
export const SystemRevokeSessionSchema = z.object({
  sessionId: z.uuid('Invalid session ID').optional(),
  userId: z.number().int().positive('User ID must be a positive integer').optional(),
  revokeAll: z.boolean().default(false), // Revoke all sessions for user
  reason: z.string().max(255, 'Reason must be less than 255 characters').optional(),
});

// Audit Log Schema
export const AuditLogSchema = z.object({
  userId: z.number().int().positive('User ID must be a positive integer').optional(),
  action: z
    .string()
    .min(1, 'Action is required')
    .max(100, 'Action must be less than 100 characters'),
  entity: z
    .string()
    .min(1, 'Entity is required')
    .max(100, 'Entity must be less than 100 characters'),
  entityId: z.string().max(50, 'Entity ID must be less than 50 characters').optional(),
  oldValues: z.record(z.string(), z.any()).optional(),
  newValues: z.record(z.string(), z.any()).optional(),
  ipAddress: z
    .string()
    .regex(
      /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/,
      'Invalid IP address'
    )
    .optional(),
  userAgent: z.string().max(500, 'User agent must be less than 500 characters').optional(),
});

// Audit Log Query Schema
export const AuditLogQuerySchema = PaginationSchema.extend({
  userId: z
    .string()
    .optional()
    .refine((val) => !val || /^\d+$/.test(val), 'User ID must be a valid number')
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .refine((val) => !val || val > 0, 'User ID must be positive'),
  action: z.string().optional(),
  entity: z.string().optional(),
  entityId: z.string().optional(),
  search: z.string().optional(), // Search by entityId
  startDate: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), 'Invalid start date'),
  endDate: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), 'Invalid end date'),
  ipAddress: z
    .string()
    .optional()
    .refine(
      (val) => !val || val === '' || /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/.test(val),
      'Invalid IP address'
    )
    .transform((val) => (val === '' ? undefined : val)),
  sortBy: z.enum(['createdAt', 'action', 'entity', 'userId']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// System Status Schema
export const SystemStatusSchema = z.object({
  service: z.string().min(1, 'Service name is required'),
  status: z.enum(['healthy', 'degraded', 'down']),
  message: z.string().max(500, 'Message must be less than 500 characters').optional(),
  responseTime: z.number().min(0, 'Response time cannot be negative').optional(),
  lastChecked: z.string().datetime('Invalid last checked date'),
});

// Database Backup Schema
export const DatabaseBackupSchema = z.object({
  name: z
    .string()
    .min(1, 'Backup name is required')
    .max(255, 'Backup name must be less than 255 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  includeData: z.boolean().default(true),
  includeSchema: z.boolean().default(true),
  compression: z.enum(['none', 'gzip', 'bzip2']).default('gzip'),
});

// Database Restore Schema
export const DatabaseRestoreSchema = z.object({
  backupId: z.string().min(1, 'Backup ID is required'),
  confirmRestore: z.boolean().refine((val) => val === true, {
    message: 'You must confirm the restore operation',
  }),
  restoreData: z.boolean().default(true),
  restoreSchema: z.boolean().default(true),
});

// System Maintenance Schema
export const SystemMaintenanceSchema = z
  .object({
    title: z
      .string()
      .min(1, 'Title is required')
      .max(255, 'Title must be less than 255 characters'),
    description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
    startTime: z.string().datetime('Invalid start time'),
    endTime: z.string().datetime('Invalid end time'),
    isActive: z.boolean().default(false),
    notifyUsers: z.boolean().default(true),
    blockAccess: z.boolean().default(false),
  })
  .refine((data) => new Date(data.endTime) > new Date(data.startTime), {
    message: 'End time must be after start time',
    path: ['endTime'],
  });

// Cache Management Schema
export const CacheManagementSchema = z.object({
  action: z.enum(['clear', 'invalidate', 'refresh']),
  keys: z.array(z.string()).optional(), // Specific cache keys
  pattern: z.string().optional(), // Pattern to match keys (e.g., 'user:*')
  category: z.string().optional(), // Cache category (e.g., 'products', 'users')
});

// Email Template Schema
export const EmailTemplateSchema = z.object({
  name: z
    .string()
    .min(1, 'Template name is required')
    .max(100, 'Template name must be less than 100 characters'),
  subject: z
    .string()
    .min(1, 'Subject is required')
    .max(255, 'Subject must be less than 255 characters'),
  htmlContent: z.string().min(1, 'HTML content is required'),
  textContent: z.string().optional(),
  variables: z.array(z.string()).default([]), // Template variables like {{customerName}}
  isActive: z.boolean().default(true),
  category: z.string().max(50, 'Category must be less than 50 characters').optional(),
});

// Update Email Template Schema
export const UpdateEmailTemplateSchema = z.object({
  id: z.number().int().positive('Template ID must be a positive integer'),
  name: z
    .string()
    .min(1, 'Template name is required')
    .max(100, 'Template name must be less than 100 characters')
    .optional(),
  subject: z
    .string()
    .min(1, 'Subject is required')
    .max(255, 'Subject must be less than 255 characters')
    .optional(),
  htmlContent: z.string().min(1, 'HTML content is required').optional(),
  textContent: z.string().optional(),
  variables: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  category: z.string().max(50, 'Category must be less than 50 characters').optional(),
});

// System Analytics Schema
export const SystemAnalyticsSchema = z.object({
  startDate: z.string().datetime('Invalid start date'),
  endDate: z.string().datetime('Invalid end date'),
  metrics: z
    .array(
      z.enum([
        'users',
        'orders',
        'revenue',
        'products',
        'accounts',
        'tickets',
        'payments',
        'errors',
      ])
    )
    .default(['users', 'orders', 'revenue']),
  groupBy: z.enum(['hour', 'day', 'week', 'month']).default('day'),
});

// Export types
export type Settings = z.infer<typeof SettingsSchema>;
export type UpdateSettings = z.infer<typeof UpdateSettingsSchema>;
export type BulkSettingsUpdate = z.infer<typeof BulkSettingsUpdateSchema>;
export type SettingsQuery = z.infer<typeof SettingsQuerySchema>;
export type LoginSession = z.infer<typeof LoginSessionSchema>;
export type UpdateLoginSession = z.infer<typeof UpdateLoginSessionSchema>;
export type LoginSessionQuery = z.infer<typeof LoginSessionQuerySchema>;
export type SystemRevokeSession = z.infer<typeof SystemRevokeSessionSchema>;
export type AuditLog = z.infer<typeof AuditLogSchema>;
export type AuditLogQuery = z.infer<typeof AuditLogQuerySchema>;
export type SystemStatus = z.infer<typeof SystemStatusSchema>;
export type DatabaseBackup = z.infer<typeof DatabaseBackupSchema>;
export type DatabaseRestore = z.infer<typeof DatabaseRestoreSchema>;
export type SystemMaintenance = z.infer<typeof SystemMaintenanceSchema>;
export type CacheManagement = z.infer<typeof CacheManagementSchema>;
export type EmailTemplate = z.infer<typeof EmailTemplateSchema>;
export type UpdateEmailTemplate = z.infer<typeof UpdateEmailTemplateSchema>;
export type SystemAnalytics = z.infer<typeof SystemAnalyticsSchema>;
