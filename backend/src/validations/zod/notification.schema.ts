import { z } from 'zod';
import { BooleanSchemaString, PaginationSchema } from '../common/pagination.schema';

// Enums matching Prisma schema
export const NotificationType = z.enum([
  'ORDER',
  'PAYMENT',
  'RESTOCK',
  'SYSTEM',
  'PROMOTION',
  'OTHERS',
]);

export const UserRole = z.enum(['ADMIN', 'CUSTOMER', 'GUEST', 'MODERATOR']);

// Base Notification Schema (matches Prisma model)
export const NotificationBaseSchema = z.object({
  userId: z.number().int().positive('User ID must be a positive integer').optional(),
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters'),
  message: z
    .string()
    .min(1, 'Message is required')
    .max(2000, 'Message must be less than 2000 characters'),
  attachments: z
    .array(z.string().url('Invalid attachment URL'))
    .optional()
    .default([])
    .transform((val) => val || []),
  role: UserRole.optional().default('CUSTOMER'),
  type: NotificationType.optional().default('OTHERS'),
  meta: z.record(z.string(), z.any()).optional(),
});

// Create Notification Schema
export const CreateNotificationSchema = NotificationBaseSchema;

// Update Notification Schema
export const UpdateNotificationSchema = z.object({
  id: z.number().int().positive('Notification ID must be a positive integer'),
  isRead: z.boolean().optional(),
});

// Notification Query Schema
export const NotificationQuerySchema = PaginationSchema.extend({
  userId: z
    .string()
    .optional()
    .refine((val) => !val || /^\d+$/.test(val), 'User ID must be a valid number')
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .refine((val) => !val || val > 0, 'User ID must be positive'),
  type: NotificationType.optional(),
  role: UserRole.optional(),
  isRead: BooleanSchemaString,
  sortBy: z.enum(['createdAt', 'updatedAt', 'type']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// Notification ID Schema
export const NotificationIdSchema = z.object({
  id: z.number().int().positive('Notification ID must be a positive integer'),
});

// Mark Notifications as Read Schema
export const MarkNotificationsReadSchema = z.object({
  userId: z.number().int().positive('User ID must be a positive integer'),
  notificationIds: z.array(z.number().int().positive()).optional(), // If not provided, mark all as read
});

export const GroupNotificationTargetSchema = z.enum([
  'all',
  'guest',
  'loggedIn',
  'purchased',
  'loggedInNoPurchase',
]);

export const GroupNotificationFiltersSchema = z.object({
  countries: z.array(z.string().trim().min(1)).optional().default([]),
  roles: z.array(UserRole).optional().default([]),
  minSpent: z.coerce.number().min(0).optional(),
  categoryIds: z.array(z.coerce.number().int().positive()).optional().default([]),
});

export const GroupNotificationPreviewSchema = z.object({
  targetUsers: GroupNotificationTargetSchema,
  customFilters: GroupNotificationFiltersSchema.optional(),
});

export const SendGroupNotificationSchema = z.object({
  targetUsers: GroupNotificationTargetSchema,
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters'),
  subject: z.string().max(255, 'Subject must be less than 255 characters').optional(),
  message: z.string().min(1, 'Message is required'),
  type: NotificationType.optional().default('OTHERS'),
  customFilters: GroupNotificationFiltersSchema.optional(),
  delivery: z
    .object({
      email: z.boolean().optional().default(false),
      dashboard: z.boolean().optional().default(true),
    })
    .optional()
    .default({ email: false, dashboard: true }),
}).superRefine((data, ctx) => {
  if (!data.delivery.dashboard) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['delivery'],
      message: 'Dashboard delivery is required for group notifications',
    });
  }
});

// Export types
export type NotificationBase = z.infer<typeof NotificationBaseSchema>;
export type CreateNotification = z.infer<typeof CreateNotificationSchema>;
export type UpdateNotification = z.infer<typeof UpdateNotificationSchema>;
export type NotificationQuery = z.infer<typeof NotificationQuerySchema>;
export type NotificationId = z.infer<typeof NotificationIdSchema>;
export type MarkNotificationsRead = z.infer<typeof MarkNotificationsReadSchema>;
export type GroupNotificationTarget = z.infer<typeof GroupNotificationTargetSchema>;
export type GroupNotificationFilters = z.infer<typeof GroupNotificationFiltersSchema>;
export type GroupNotificationPreview = z.infer<typeof GroupNotificationPreviewSchema>;
export type SendGroupNotification = z.infer<typeof SendGroupNotificationSchema>;
