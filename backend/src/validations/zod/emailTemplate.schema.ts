import { z } from 'zod';

// ================================
// EMAIL TEMPLATE SCHEMAS
// ================================

export const createEmailTemplateSchema = z.object({
  type: z
    .string()
    .min(1, 'Type is required')
    .max(100, 'Type must be less than 100 characters')
    .regex(/^[A-Z_]+$/, 'Type must be uppercase with underscores (e.g., ORDER_CONFIRMATION)'),
  subject: z
    .string()
    .min(1, 'Subject is required')
    .max(200, 'Subject must be less than 200 characters'),
  body: z.string().min(1, 'Body is required'), // Plain text version (required)
  htmlBody: z.string().optional(), // HTML version (optional)
  isActive: z.boolean().default(true),
  variables: z.array(z.string()).default([]), // Available variables
  description: z.string().optional(), // Description of when this template is used
});

export const updateEmailTemplateSchema = z.object({
  type: z
    .string()
    .min(1, 'Type is required')
    .max(100, 'Type must be less than 100 characters')
    .regex(/^[A-Z_]+$/, 'Type must be uppercase with underscores (e.g., ORDER_CONFIRMATION)')
    .optional(),
  subject: z
    .string()
    .min(1, 'Subject is required')
    .max(200, 'Subject must be less than 200 characters')
    .optional(),
  body: z.string().min(1, 'Body is required').optional(),
  htmlBody: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  variables: z.array(z.string()).optional(),
  description: z.string().optional().nullable(),
});

export const emailTemplateQuerySchema = z.object({
  page: z.string().optional().default('1').transform(Number),
  limit: z.string().optional().default('10').transform(Number),
  type: z.string().optional(),
  search: z.string().optional(),
});

export const emailTemplateParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Invalid ID format').transform(Number),
});

// ================================
// TYPE DEFINITIONS
// ================================

export type CreateEmailTemplateData = z.infer<typeof createEmailTemplateSchema>;
export type UpdateEmailTemplateData = z.infer<typeof updateEmailTemplateSchema>;
export type EmailTemplateQuery = z.infer<typeof emailTemplateQuerySchema>;
export type EmailTemplateParams = z.infer<typeof emailTemplateParamsSchema>;
