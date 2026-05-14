// Central export for all validation schemas
export * from './zod/account.schema';
export * from './zod/category.schema';
export * from './zod/emailTemplate.schema';
export * from './zod/feedback.schema';
export * from './zod/notification.schema';
export * from './zod/order.schema';
export * from './zod/payment-method.schema';
export * from './zod/payment.schema';
export * from './zod/product.schema';
export * from './zod/rank.schema';
export * from './zod/setting.schema';
export * from './zod/subscription-package.schema';
export * from './zod/system.schema';
export * from './zod/ticket.schema';
export * from './zod/user.schema';

// Validation helper functions
export const validateSchema = <T>(
  schema: any,
  data: unknown
): { success: boolean; data?: T; errors?: string[] } => {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error: any) {
    const errors = error.errors?.map((err: any) => `${err.path.join('.')}: ${err.message}`) || [
      'Validation failed',
    ];
    return { success: false, errors };
  }
};

export const safeParseSchema = <T>(
  schema: any,
  data: unknown
): { success: boolean; data?: T; error?: any } => {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, error: result.error };
  }
};
