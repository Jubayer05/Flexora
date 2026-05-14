import type { NextFunction, Request, Response } from 'express';
import { PayGateProviderService } from '../../services/paygate-provider.service';
import { sendSuccessResponse, type ApiResponse } from '../../utils';
import {
  payGateProviderQuerySchema,
  updatePayGateProvidersSchema
} from '../../validations/zod/paygate-provider.schema';

const payGateProviderService = new PayGateProviderService();

export const getPayGateProviders = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const query = payGateProviderQuerySchema.parse(req.query);
    const result = await payGateProviderService.listProviders(query);

    return sendSuccessResponse(res, result, 'PayGate providers retrieved successfully');
  } catch (error) {
    return next(error);
  }
};

export const upsertPayGateProviders = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { providers } = updatePayGateProvidersSchema.parse(req.body);
    const result = await payGateProviderService.updateProviders(providers);

    return sendSuccessResponse(res, result, 'PayGate providers updated successfully');
  } catch (error) {
    return next(error);
  }
};

export const resetPayGateProviders = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const result = await payGateProviderService.resetProviders();
    return sendSuccessResponse(res, result, 'PayGate providers reset to defaults');
  } catch (error) {
    return next(error);
  }
};
