import { Request, Response, NextFunction } from 'express';
import { telegramPremiumService } from '../../services/telegram/premium.service';
import { sendSuccessResponse, sendErrorResponse } from '../../utils';
import db from '../../configs/db';

/**
 * Get Premium configuration
 */
export const getPremiumConfig = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    // Get config from database directly
    const setting = await db.settings.findUnique({
      where: { key: 'telegram_premium_config' }
    });

    if (!setting || !setting.value) {
      return sendSuccessResponse(res, {
        apiKey: '',
        baseUrl: '',
        enabled: false
      }, 'Premium configuration retrieved');
    }

    const config = setting.value as any;
    return sendSuccessResponse(res, config, 'Premium configuration retrieved');
  } catch (error: any) {
    return next(error);
  }
};

/**
 * Update Premium configuration
 */
export const updatePremiumConfig = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { apiKey, baseUrl, enabled } = req.body;

    if (!apiKey || !baseUrl) {
      return sendErrorResponse(res, 'API key and base URL are required', 400);
    }

    // Save to settings
    await db.settings.upsert({
      where: { key: 'telegram_premium_config' },
      update: {
        value: {
          apiKey,
          baseUrl,
          enabled: enabled !== undefined ? enabled : true
        }
      },
      create: {
        key: 'telegram_premium_config',
        value: {
          apiKey,
          baseUrl,
          enabled: enabled !== undefined ? enabled : true
        }
      }
    });

    // Reload config in service
    await telegramPremiumService.reloadConfig();

    return sendSuccessResponse(res, { apiKey, baseUrl, enabled }, 'Premium configuration updated');
  } catch (error: any) {
    return next(error);
  }
};

/**
 * Test Premium API connection
 */
export const testPremiumConnection = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const status = await telegramPremiumService.getServiceStatus();
    
    return sendSuccessResponse(res, status, 'Connection test completed');
  } catch (error: any) {
    return next(error);
  }
};

/**
 * Get Premium prices from Fragment API
 */
export const getPremiumPrices = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const prices = await telegramPremiumService.getPrices();
    
    if (!prices.success) {
      console.error('❌ Failed to fetch Premium prices:', prices.error);
      return sendErrorResponse(res, prices.error || 'Failed to fetch prices', 400);
    }

    return sendSuccessResponse(res, prices.prices, 'Premium prices retrieved');
  } catch (error: any) {
    console.error('❌ Error in getPremiumPrices controller:', error);
    return next(error);
  }
};

/**
 * Get Premium order history
 */
export const getPremiumOrderHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Get orders with premium products
    const orders = await db.order.findMany({
      where: {
        product: {
          type: {
            in: ['PREMIUM_1M', 'PREMIUM_3M', 'PREMIUM_6M', 'PREMIUM_12M']
          }
        }
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        total: true,
        createdAt: true,
        guestEmail: true,
        customerName: true,
        customerPhone: true,
        product: {
          select: {
            id: true,
            name: true,
            type: true,
            price: true
          }
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    });

    const total = await db.order.count({
      where: {
        product: {
          type: {
            in: ['PREMIUM_1M', 'PREMIUM_3M', 'PREMIUM_6M', 'PREMIUM_12M']
          }
        }
      }
    });

    return sendSuccessResponse(res, {
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }, 'Premium order history retrieved');
  } catch (error: any) {
    return next(error);
  }
};

