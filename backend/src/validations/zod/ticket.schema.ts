import { z } from 'zod'
import { PaginationSchema } from '../common/pagination.schema'

// Enums
export const TicketStatus = z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'])
export const TicketPriority = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])

// Base Ticket Schema
export const TicketBaseSchema = z.object({
  subject: z
    .string()
    .min(1, 'Subject is required')
    .max(255, 'Subject must be less than 255 characters'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(5000, 'Description must be less than 5000 characters'),
  userId: z.number().int().positive('User ID must be a positive integer'),
  attachments: z
    .array(z.string().url('Invalid attachment URL'))
    .max(10, 'Cannot attach more than 10 files')
    .optional()
    .default([]),
  meta: z.record(z.string(), z.any()).optional()
})

// Create Ticket Schema
export const CreateTicketSchema = TicketBaseSchema

// Update Ticket Schema
export const UpdateTicketSchema = z.object({
  subject: z
    .string()
    .min(1, 'Subject is required')
    .max(255, 'Subject must be less than 255 characters')
    .optional(),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(5000, 'Description must be less than 5000 characters')
    .optional(),
  status: TicketStatus.optional(),
  priority: TicketPriority.optional(),
  assignedTo: z.string().max(100, 'Assigned to must be less than 100 characters').optional(),
  meta: z.record(z.string(), z.any()).optional()
})

// Ticket Reply Schema
export const TicketReplySchema = z.object({
  ticketId: z.number().int().positive('Ticket ID must be a positive integer'),
  content: z
    .string()
    .min(1, 'Reply content is required')
    .max(5000, 'Reply content must be less than 5000 characters'),
  isStaff: z.boolean().default(false),
  attachments: z
    .array(z.url('Invalid attachment URL'))
    .max(10, 'Cannot attach more than 10 files')
    .default([]),
  meta: z.record(z.string(), z.any()).optional()
})

// Update Ticket Reply Schema
export const UpdateTicketReplySchema = z.object({
  id: z.number().int().positive('Reply ID must be a positive integer'),
  content: z
    .string()
    .min(1, 'Reply content is required')
    .max(5000, 'Reply content must be less than 5000 characters')
    .optional(),
  attachments: z
    .array(z.url('Invalid attachment URL'))
    .max(10, 'Cannot attach more than 10 files')
    .optional(),
  meta: z.record(z.string(), z.any()).optional()
})

// Ticket Query Schema
export const TicketQuerySchema = PaginationSchema.extend({
  search: z.string().optional(), // Search by ticket number, subject, description
  userId: z
    .string()
    .optional()
    .refine((val) => !val || /^\d+$/.test(val), 'User ID must be a valid number')
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .refine((val) => !val || val > 0, 'User ID must be positive'),
  status: TicketStatus.optional(),
  priority: TicketPriority.optional(),
  assignedTo: z.string().optional(),
  startDate: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), 'Invalid start date'),
  endDate: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), 'Invalid end date'),
  sortBy: z
    .enum(['ticketNumber', 'subject', 'priority', 'status', 'createdAt', 'updatedAt'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  includeReplies: z
    .string()
    .optional()
    .transform((val) => (val === 'true' ? true : false)),
  onlyUnassigned: z
    .string()
    .optional()
    .transform((val) => (val === 'true' ? true : false))
})

// Ticket ID Schema
export const TicketIdSchema = z.object({
  id: z.number().int().positive('Ticket ID must be a positive integer')
})

// Ticket Number Schema
export const TicketNumberSchema = z.object({
  ticketNumber: z.string().min(1, 'Ticket number is required')
})

// Ticket Assignment Schema
export const TicketAssignmentSchema = z.object({
  id: z.number().int().positive('Ticket ID must be a positive integer'),
  assignedTo: z
    .string()
    .min(1, 'Assignee is required')
    .max(100, 'Assignee must be less than 100 characters')
    .optional(),
  notifyAssignee: z.boolean().default(true),
  reason: z.string().max(500, 'Reason must be less than 500 characters').optional()
})

// Ticket Status Update Schema
export const TicketStatusUpdateSchema = z.object({
  status: TicketStatus,
  resolution: z.string().max(1000, 'Resolution must be less than 1000 characters').optional(),
  notifyCustomer: z.boolean().default(true),
  closeReason: z.string().max(500, 'Close reason must be less than 500 characters').optional()
})

// Bulk Ticket Operations Schema
export const BulkTicketUpdateSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1, 'At least one ticket ID is required'),
  updates: z.object({
    status: TicketStatus.optional(),
    priority: TicketPriority.optional(),
    assignedTo: z.string().max(100, 'Assignee must be less than 100 characters').optional()
  })
})

export const BulkTicketDeleteSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1, 'At least one ticket ID is required')
})

// Export types
export type TicketBase = z.infer<typeof TicketBaseSchema>
export type CreateTicket = z.infer<typeof CreateTicketSchema>
export type UpdateTicket = z.infer<typeof UpdateTicketSchema>
export type TicketReply = z.infer<typeof TicketReplySchema>
export type UpdateTicketReply = z.infer<typeof UpdateTicketReplySchema>
export type TicketQuery = z.infer<typeof TicketQuerySchema>
export type TicketId = z.infer<typeof TicketIdSchema>
export type TicketNumber = z.infer<typeof TicketNumberSchema>
export type TicketAssignment = z.infer<typeof TicketAssignmentSchema>
export type TicketStatusUpdate = z.infer<typeof TicketStatusUpdateSchema>
export type BulkTicketUpdate = z.infer<typeof BulkTicketUpdateSchema>
export type BulkTicketDelete = z.infer<typeof BulkTicketDeleteSchema>
