import { z } from 'zod'

export const GroupEmailTargetSchema = z.enum([
  'all',
  'guest',
  'loggedIn',
  'purchased',
  'loggedInNoPurchase'
])

export const GroupEmailRoleSchema = z.enum(['ADMIN', 'CUSTOMER', 'GUEST', 'MODERATOR'])

export const GroupEmailFiltersSchema = z.object({
  countries: z.array(z.string().trim().min(1)).optional().default([]),
  roles: z.array(GroupEmailRoleSchema).optional().default([]),
  minSpent: z.coerce.number().min(0).optional()
})

export const SendGroupEmailSchema = z.object({
  audience: z
    .enum(['customer', 'moderator', 'admin'], {
      message: 'Invalid audience type. Must be customer, moderator, or admin'
    })
    .optional(),
  targetUsers: GroupEmailTargetSchema.optional(),
  subject: z.string().min(1, 'Subject is required').max(255, 'Subject is too long'),
  body: z.string().optional(),
  html: z.string().optional(),
  message: z.string().optional(),
  customFilters: GroupEmailFiltersSchema.optional()
}).superRefine((data, ctx) => {
  if (!data.audience && !data.targetUsers) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['targetUsers'],
      message: 'Select a target audience'
    })
  }

  if (!data.body?.trim() && !data.html?.trim() && !data.message?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['html'],
      message: 'Email body is required'
    })
  }
})

export const GroupEmailPreviewSchema = z.object({
  targetUsers: GroupEmailTargetSchema,
  customFilters: GroupEmailFiltersSchema.optional()
})

export type SendGroupEmailInput = z.infer<typeof SendGroupEmailSchema>
export type GroupEmailPreviewInput = z.infer<typeof GroupEmailPreviewSchema>
export type GroupEmailTarget = z.infer<typeof GroupEmailTargetSchema>
export type GroupEmailFilters = z.infer<typeof GroupEmailFiltersSchema>
