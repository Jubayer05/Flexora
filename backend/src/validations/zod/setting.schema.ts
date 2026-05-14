import { z } from 'zod'

// ================================
// SETTINGS SCHEMAS
// ================================

export const upsertSettingSchema = z.object({
  value: z.any().nullable(),
  type: z.enum(['UPDATE', 'CREATE']).optional()
})

export const settingQuerySchema = z.object({
  page: z.string().optional().default('1').transform(Number),
  limit: z.string().optional().default('10').transform(Number),
  search: z.string().optional()
})

export const settingKeyParamsSchema = z.object({
  key: z.string().min(1, 'Key is required')
})

export const multipleKeysParamsSchema = z.object({
  keys: z
    .string()
    .min(1, 'Keys are required')
    .transform((val) =>
      val
        .split(',')
        .map((k) => k.trim())
        .filter((k) => k.length > 0)
    )
    .refine((keys) => keys.length > 0, 'At least one key is required')
})

// ================================
// TYPE DEFINITIONS
// ================================

export type UpsertSettingData = z.infer<typeof upsertSettingSchema>
export type SettingQuery = z.infer<typeof settingQuerySchema>
export type SettingKeyParams = z.infer<typeof settingKeyParamsSchema>
export type MultipleKeysParams = z.infer<typeof multipleKeysParamsSchema>
