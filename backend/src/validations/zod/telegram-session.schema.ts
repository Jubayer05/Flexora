import { z } from 'zod';

export const CreateSessionSchema = z.object({
  body: z.object({
    phoneNumber: z
      .string()
      .min(10, 'Phone number must be at least 10 characters')
      .max(20, 'Phone number must be at most 20 characters')
      .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
  }),
});

export const SubmitOTPSchema = z.object({
  body: z.object({
    phoneNumber: z
      .string()
      .min(10, 'Phone number must be at least 10 characters')
      .max(20, 'Phone number must be at most 20 characters')
      .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
    otpCode: z
      .string()
      .min(5, 'OTP code must be at least 5 digits')
      .max(6, 'OTP code must be at most 6 digits')
      .regex(/^\d+$/, 'OTP code must contain only digits'),
    password2FA: z.string().optional(),
  }),
});

export const SessionParamsSchema = z.object({
  params: z.object({
    phoneNumber: z
      .string()
      .min(10, 'Phone number must be at least 10 characters')
      .max(20, 'Phone number must be at most 20 characters'),
  }),
});
