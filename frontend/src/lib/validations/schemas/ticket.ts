import { z } from 'zod'
import { BooleanSchemaString, PaginationSchema } from './common'

/**
 * Ticket Validation Schemas
 *
 * This file contains all Zod validation schemas for Ticket operations:
 * - TicketBaseSchema: Core ticket fields validation
 * - CreateTicketSchema: For creating new tickets
 * - UpdateTicketSchema: For updating existing tickets (includes ID)
 * - TicketQuerySchema: For filtering and searching tickets
 * - TicketIdSchema: For validating ticket ID parameters
 */

// Ticket Priority Enum
export const TicketPriority = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])

// Ticket Status Enum
export const TicketStatus = z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'])

// Ticket Category Enum
export const TicketCategory = z.enum([
  'technical',
  'billing',
  'general',
  'feature_request',
  'bug_report'
])

// Ticket Source Enum
export const TicketSource = z.enum(['user_portal', 'admin_panel', 'email', 'api', 'chat'])

// Ticket Meta Schema
export const TicketMetaSchema = z.object({
  category: TicketCategory,
  source: TicketSource,
  tags: z.array(z.string()).optional().default([]),
  attachments: z.array(z.string()).optional().default([]),
  internalNotes: z.string().optional(),
  estimatedResolutionTime: z.number().int().positive().optional(),
  assignedDepartment: z.string().optional()
})

// Base Ticket Schema
export const TicketBaseSchema = z.object({
  subject: z
    .string('Subject is required')
    .min(1, 'Subject is required')
    .max(255, 'Subject must be less than 255 characters')
    .trim(),
  description: z
    .string('Description is required')
    .min(1, 'Description is required')
    .max(5000, 'Description must be less than 5000 characters')
    .trim(),
  priority: TicketPriority.default('MEDIUM'),
  status: TicketStatus.default('OPEN'),
  userId: z
    .number('User ID is required')
    .int('User ID must be an integer')
    .positive('User ID must be a positive number'),
  assignedToId: z
    .number('Assigned user ID must be a number')
    .int('Assigned user ID must be an integer')
    .positive('Assigned user ID must be a positive number')
    .optional()
    .nullable(),
  meta: TicketMetaSchema.optional().default({
    category: 'general',
    source: 'user_portal',
    tags: [],
    attachments: []
  })
})

// Create Ticket Schema
export const CreateTicketSchema = TicketBaseSchema.omit({ status: true })

// Update Ticket Schema
export const UpdateTicketSchema = TicketBaseSchema.partial().extend({
  id: z.number().int().positive('Ticket ID must be a positive integer')
})

// Ticket Query/Filter Schema
export const TicketQuerySchema = PaginationSchema.extend({
  search: z.string().optional(),
  priority: TicketPriority.optional(),
  status: TicketStatus.optional(),
  category: TicketCategory.optional(),
  source: TicketSource.optional(),
  userId: z.number().int().positive().optional(),
  assignedToId: z.number().int().positive().optional(),
  isUnassigned: BooleanSchemaString,
  isOverdue: BooleanSchemaString,
  createdFrom: z.string().optional(),
  createdTo: z.string().optional(),
  sortBy: z
    .enum(['subject', 'priority', 'status', 'userId', 'assignedToId', 'createdAt', 'updatedAt'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
})

// Ticket ID Schema
export const TicketIdSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, 'Ticket ID must be a valid number')
    .transform((val) => parseInt(val, 10))
})

// Ticket Comment Schema
export const TicketCommentSchema = z.object({
  ticketId: z.number().int().positive('Ticket ID is required'),
  message: z
    .string('Message is required')
    .min(1, 'Message is required')
    .max(2000, 'Message must be less than 2000 characters')
    .trim(),
  isInternal: z.boolean().default(false),
  attachments: z.array(z.string()).optional().default([])
})

// Export types
export type TicketBase = z.infer<typeof TicketBaseSchema>
export type CreateTicket = z.infer<typeof CreateTicketSchema>
export type UpdateTicket = z.infer<typeof UpdateTicketSchema>
export type TicketQuery = z.infer<typeof TicketQuerySchema>
export type TicketId = z.infer<typeof TicketIdSchema>
export type TicketMeta = z.infer<typeof TicketMetaSchema>
export type TicketComment = z.infer<typeof TicketCommentSchema>
