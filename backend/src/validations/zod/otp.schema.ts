import { z } from 'zod';

export const RequestOTPSchema = z.object({
  body: z.object({
    accountId: z.number().int().positive('Account ID must be a positive integer'),
  }),
});

export const OTPStatusParamsSchema = z.object({
  params: z.object({
    accountId: z.string().regex(/^\d+$/, 'Account ID must be a valid number').transform(Number),
  }),
});

export const NotificationSchema = z.object({
  body: z.object({
    notificationId: z.string().optional(),
  }),
});

export const NotificationQuerySchema = z.object({
  query: z.object({
    limit: z.string().regex(/^\d+$/, 'Limit must be a valid number').transform(Number).optional(),
  }),
});
