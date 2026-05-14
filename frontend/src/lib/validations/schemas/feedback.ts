import { z } from 'zod'

/** CUSTOMER = real customer, MANUAL = admin form, BULK_GENERATED = bulk fake reviews */
export const feedbackSourceEnum = z.enum(['CUSTOMER', 'MANUAL', 'BULK_GENERATED'])
export type FeedbackSource = z.infer<typeof feedbackSourceEnum>

export const FeedbackSchema = z.object({
  productId: z
    .number({ message: 'Product ID must be a number' })
    .int('Product ID must be an integer')
    .positive('Product ID must be positive')
    .optional(),
  name: z.string().min(1, 'Customer name is required').max(100, 'Name is too long'),
  feedback: z
    .string()
    .min(1, 'Feedback is required')
    .min(5, 'Feedback must be at least 5 characters')
    .max(1000, 'Feedback is too long'),
  rating: z
    .number({ message: 'Rating is required' })
    .min(0.1, 'Rating must be at least 0.1')
    .max(5, 'Rating must be at most 5')
    .refine(
      (val) => {
        const decimalPart = val.toString().split('.')[1]
        return !decimalPart || decimalPart.length <= 1
      },
      {
        message: 'Rating cannot have more than 1 decimal place'
      }
    ),
  published: z.boolean().optional()
})

export const fakeFeedbackSchema = z.object({
  reviews: z.string().min(1, 'Reviews are required'),
  minRatings: z
    .number({ message: 'Min rating is required' })
    .min(4.1, 'Min rating must be at least 4.1')
    .max(5, 'Min rating must be at most 5'),
  maxRatings: z
    .number({ message: 'Max rating is required' })
    .min(4.1, 'Max rating must be at least 4.1')
    .max(5, 'Max rating must be at most 5'),
  startedAt: z.number().int().optional(),
  endedAt: z.number().int().optional()
}).refine((data) => data.minRatings <= data.maxRatings, {
  message: 'Min rating must be less than or equal to max rating',
  path: ['minRatings']
})

export type FeedbackFormData = z.infer<typeof FeedbackSchema>
