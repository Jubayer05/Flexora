import { z } from 'zod'

// Unified rank system schema
export const rankSystemSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, 'Name is required'),
  displayOrder: z.number().optional(),
  description: z.string().optional(),
  minSpending: z.number().min(0, 'Value must be a positive number'),
  maxSpending: z.number().min(0, 'Value must be a positive number'),
  discount: z.number().min(0).max(100, 'Discount must be between 0 and 100').optional(),
  bonusDevices: z.number().min(0).optional(),
  meta: z
    .object({
      features: z.array(z.string()).optional()
    })
    .optional(),
  icon: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
})

// TypeScript types
export type RankSystemType = z.infer<typeof rankSystemSchema>
