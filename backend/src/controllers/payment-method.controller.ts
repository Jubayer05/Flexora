import type { NextFunction, Request, Response } from 'express';
import { PaymentMethodService } from '../services/payment-method.service';
import { sendSuccessResponse, type ApiResponse } from '../utils';
import {
  createPaymentMethodSchema,
  paymentMethodIdParamsSchema,
  paymentMethodQuerySchema,
  updatePaymentMethodSchema,
} from '../validations/zod/payment-method.schema';

// Initialize service
const paymentMethodService = new PaymentMethodService();

// ================================
// CREATE
// ================================
export const createPaymentMethod = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const validatedData = createPaymentMethodSchema.parse(req.body);
    const paymentMethod = await paymentMethodService.create(validatedData);

    return sendSuccessResponse(res, paymentMethod, 'Payment method created successfully', 201);
  } catch (error) {
    return next(error);
  }
};

// ================================
// READ
// ================================
export const getPaymentMethods = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const validatedQuery = paymentMethodQuerySchema.parse(req.query);
    const result = await paymentMethodService.findMany(validatedQuery);

    return sendSuccessResponse(res, result, 'Payment methods retrieved successfully');
  } catch (error) {
    return next(error);
  }
};

export const getAllPaymentMethods = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const paymentMethods = await paymentMethodService.findAll();

    return sendSuccessResponse(res, paymentMethods, 'Payment methods retrieved successfully');
  } catch (error) {
    return next(error);
  }
};

export const getPaymentMethodById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = paymentMethodIdParamsSchema.parse(req.params);
    const paymentMethod = await paymentMethodService.findById(id);

    return sendSuccessResponse(res, paymentMethod, 'Payment method retrieved successfully');
  } catch (error) {
    return next(error);
  }
};

// ================================
// UPDATE
// ================================
export const updatePaymentMethod = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = paymentMethodIdParamsSchema.parse(req.params);
    const validatedData = updatePaymentMethodSchema.parse(req.body);

    const paymentMethod = await paymentMethodService.update(id, validatedData);

    return sendSuccessResponse(res, paymentMethod, 'Payment method updated successfully');
  } catch (error) {
    return next(error);
  }
};

// ================================
// DELETE
// ================================
export const deletePaymentMethod = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = paymentMethodIdParamsSchema.parse(req.params);
    // Check for force query parameter
    const force = req.query.force === 'true' || req.query.force === true;
    
    const result = await paymentMethodService.delete(id, force);

    return sendSuccessResponse(res, result, result.message || 'Payment method deleted successfully');
  } catch (error) {
    return next(error);
  }
};
// ================================
// TEST ENDPOINT
// ================================
export const testNOWPaymentsConnection = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { id } = paymentMethodIdParamsSchema.parse(req.params);
    const result = await paymentMethodService.testNOWPaymentsConnection(id);

    return sendSuccessResponse(res, result, 'NOWPayments configuration test completed');
  } catch (error) {
    return next(error);
  }
};