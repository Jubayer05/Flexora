import type { NextFunction, Request, Response } from 'express';
import { OtpService } from '../services/telegram/otp';
import { BotService } from '../services/telegram/bot';
import { sendSuccessResponse, type ApiResponse } from '../utils';

// ================================
// OTP DETECTION ENDPOINTS
// ================================

/**
 * Check for recent OTP messages (POST)
 * POST /api/v1/telegram/check-otp
 */
export const checkRecentOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { phone_number, customer_id, minutes_back = 30, proxy } = req.body;

    if (!phone_number) {
      return res.status(400).json({
        success: false,
        message: 'Missing phone_number',
      });
    }

    const result = await OtpService.checkRecentOtp(
      phone_number,
      customer_id || 0,
      minutes_back,
      proxy
    );

    return sendSuccessResponse(res, result, result.message);
  } catch (error) {
    next(error);
  }
};

/**
 * Check for recent OTP messages (GET) - Legacy endpoint
 * GET /api/v1/telegram/check-otp/:phone_number
 */
export const checkRecentOtpGet = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const phone_number = req.params.phone_number;
    const customer_id = parseInt(req.query.customer_id as string) || 0;
    const minutes_back = parseInt(req.query.minutes_back as string) || 30;

    if (!phone_number) {
      return res.status(400).json({
        success: false,
        message: 'Missing phone_number',
      });
    }

    const result = await OtpService.checkRecentOtp(
      phone_number,
      customer_id,
      minutes_back
    );

    return sendSuccessResponse(res, result, result.message);
  } catch (error) {
    next(error);
  }
};

/**
 * Start OTP monitoring
 * POST /api/v1/telegram/start-monitoring
 */
export const startOtpMonitoring = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { phone_number, customer_id } = req.body;

    if (!phone_number || !customer_id) {
      return res.status(400).json({
        success: false,
        message: 'Missing phone_number or customer_id',
      });
    }

    // OTP checking is on-demand, just return success
    return sendSuccessResponse(
      res,
      {
        success: true,
        phone_number,
        customer_id,
      },
      `OTP monitoring ready for ${phone_number}`
    );
  } catch (error) {
    next(error);
  }
};

// ================================
// DEBUG ENDPOINTS
// ================================

/**
 * Test OTP detection logic
 * GET /api/v1/telegram/debug/test-otp-detection
 */
export const testOtpDetection = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const message = (req.query.message as string) || 'Login code: 12345';
    const senderId = parseInt(req.query.sender_id as string) || 777000;

    const result = OtpService.testOtpDetection(message, senderId);

    return sendSuccessResponse(res, result, 'OTP detection test completed');
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch recent messages for debugging
 * GET /api/v1/telegram/debug/messages/:phone_number
 */
export const fetchRecentMessages = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const phone_number = req.params.phone_number;
    const limit = parseInt(req.query.limit as string) || 5;

    if (!phone_number) {
      return res.status(400).json({
        success: false,
        message: 'Missing phone_number',
      });
    }

    const result = await OtpService.fetchRecentMessages(phone_number, limit);

    return sendSuccessResponse(res, result, result.message || 'Messages fetched');
  } catch (error) {
    next(error);
  }
};

/**
 * Test session connection
 * GET /api/v1/telegram/debug/test-session/:phone_number
 */
export const testSessionConnection = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const phone_number = req.params.phone_number;

    if (!phone_number) {
      return res.status(400).json({
        success: false,
        message: 'Missing phone_number',
      });
    }

    const result = await OtpService.testSessionConnection(phone_number);

    return sendSuccessResponse(res, result, result.message || 'Session test completed');
  } catch (error) {
    next(error);
  }
};

// ================================
// BOT MESSAGING ENDPOINTS
// ================================

/**
 * Send message to a Telegram bot
 * POST /api/v1/telegram/send-bot-message
 */
export const sendBotMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { phone, phone_number, bot_username, message, proxy } = req.body;

    const phoneNum = phone || phone_number;

    if (!phoneNum) {
      return res.status(400).json({
        success: false,
        message: 'Missing phone or phone_number',
      });
    }

    if (!bot_username) {
      return res.status(400).json({
        success: false,
        message: 'Missing bot_username',
      });
    }

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Missing message',
      });
    }

    const result = await BotService.sendBotMessage(
      phoneNum,
      bot_username,
      message,
      proxy
    );

    return sendSuccessResponse(res, result, result.message);
  } catch (error) {
    next(error);
  }
};

/**
 * Send message to bot and get response
 * POST /api/v1/telegram/send-bot-message-with-response
 */
export const sendBotMessageWithResponse = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ApiResponse<any>> | void> => {
  try {
    const { phone, phone_number, bot_username, message, wait_for_response = true, timeout_ms = 10000, proxy } = req.body;

    const phoneNum = phone || phone_number;

    if (!phoneNum || !bot_username || !message) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: phone, bot_username, message',
      });
    }

    const result = await BotService.sendMessageAndGetResponse(
      phoneNum,
      bot_username,
      message,
      wait_for_response,
      timeout_ms,
      proxy
    );

    return sendSuccessResponse(res, result, result.message);
  } catch (error) {
    next(error);
  }
};
