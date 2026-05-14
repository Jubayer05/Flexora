import type { Coupon } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import { couponService } from '../services/coupon.services';
import type { Pagination } from '../types/req-res';
import { sendCreatedResponse, sendSuccessResponse, type ApiResponse } from '../utils';
import {
  BulkCouponDeleteSchema,
  BulkCouponUpdateSchema,
  CouponCodeSchema,
  CouponIdSchema,
  CouponQuerySchema,
  CouponStatsQuerySchema,
  CouponUsageQuerySchema,
  CreateCouponSchema,
  UpdateCouponSchema,
  ValidateCouponSchema,
} from '../validations/zod/coupon.schema';

// ================================
// COUPON CRUD OPERATIONS
// ================================

export const createCoupon = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<Coupon>> | void> => {
  try {
    const validatedData = CreateCouponSchema.parse(req.body);
    const coupon = await couponService.create(validatedData);

    return sendCreatedResponse(res, coupon, 'Coupon created successfully');
  } catch (error) {
    next(error);
  }
};

export const getCoupon = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<Coupon>> | void> => {
  try {
    const { id } = CouponIdSchema.parse(req.params);
    const coupon = await couponService.findById(id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found',
      });
    }

    return sendSuccessResponse(res, coupon, 'Coupon retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getCoupons = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<
  ApiResponse<{
    data: Coupon[];
    pagination: Pagination;
  }>
> | void> => {
  try {
    const validatedQuery = CouponQuerySchema.parse(req.query);
    const result = await couponService.findMany(validatedQuery);

    return sendSuccessResponse(res, result, 'Coupons retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const updateCoupon = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<Coupon>> | void> => {
  try {
    const { id } = CouponIdSchema.parse(req.params);
    const validatedData = UpdateCouponSchema.parse({ ...req.body, id });

    const coupon = await couponService.update(id, validatedData);

    return sendSuccessResponse(res, coupon, 'Coupon updated successfully');
  } catch (error) {
    next(error);
  }
};

export const deleteCoupon = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<null>> | void> => {
  try {
    const { id } = CouponIdSchema.parse(req.params);

    await couponService.delete(id);

    return sendSuccessResponse(res, null, 'Coupon deleted successfully');
  } catch (error) {
    next(error);
  }
};

// ================================
// BULK OPERATIONS
// ================================

export const bulkUpdateCoupons = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<{ updatedCount: number }>> | void> => {
  try {
    const validatedData = BulkCouponUpdateSchema.parse(req.body);
    const updatedCount = await couponService.bulkUpdate(validatedData);

    return sendSuccessResponse(
      res,
      { updatedCount },
      `${updatedCount} coupons updated successfully`
    );
  } catch (error) {
    next(error);
  }
};

export const bulkDeleteCoupons = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<{ deletedCount: number }>> | void> => {
  try {
    const validatedData = BulkCouponDeleteSchema.parse(req.body);
    const deletedCount = await couponService.bulkDelete(validatedData);

    return sendSuccessResponse(
      res,
      { deletedCount },
      `${deletedCount} coupons deleted successfully`
    );
  } catch (error) {
    next(error);
  }
};

// ================================
// COUPON VALIDATION & APPLICATION
// ================================

export const validateCoupon = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<
  ApiResponse<{
    isValid: boolean;
    coupon?: Coupon;
    discountAmount?: number;
    reason?: string;
    canApply: boolean;
  }>
> | void> => {
  try {
    const validatedData = ValidateCouponSchema.parse(req.body);
    const result = await couponService.validateCoupon(validatedData);

    const message =
      result.isValid && result.canApply
        ? 'Coupon is valid and applicable'
        : result.reason || 'Coupon validation failed';

    return sendSuccessResponse(res, result, message);
  } catch (error) {
    next(error);
  }
};

export const getCouponByCode = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<Coupon>> | void> => {
  try {
    const { code } = CouponCodeSchema.parse(req.params);
    const coupon = await couponService.findByCode(code);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found',
      });
    }

    return sendSuccessResponse(res, coupon, 'Coupon retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// ================================
// COUPON USAGE & ANALYTICS
// ================================

export const getCouponUsage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const validatedQuery = CouponUsageQuerySchema.parse(req.query);
    const result = await couponService.getUsageHistory(validatedQuery);

    return sendSuccessResponse(res, result, 'Coupon usage history retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getCouponStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<
  ApiResponse<{
    totalCoupons: number;
    activeCoupons: number;
    expiredCoupons: number;
    totalUsage: number;
    totalDiscountGiven: number;
    averageDiscountPerOrder: number;
    topCoupons: Array<{
      id: number;
      code: string;
      usageCount: number;
      totalDiscount: number;
    }>;
    usageByDate: Array<{
      date: string;
      usage: number;
      discount: number;
    }>;
  }>
> | void> => {
  try {
    const validatedQuery = CouponStatsQuerySchema.parse(req.query);
    const stats = await couponService.getStats(validatedQuery);

    return sendSuccessResponse(res, stats, 'Coupon statistics retrieved successfully');
  } catch (error) {
    next(error);
  }
};
