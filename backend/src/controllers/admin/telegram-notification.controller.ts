import type { Request, Response } from 'express';
import { userTelegramNotificationService } from '../../services/user-telegram-notification.service';
import { telegramNotificationService } from '../../services/telegram-notification.service';
import { sendErrorResponse, sendSuccessResponse } from '../../utils';

/**
 * Send custom Telegram message to a user
 */
export const sendMessageToUser = async (req: Request, res: Response) => {
  try {
    const { userId, message } = req.body;

    if (!userId || !message) {
      return sendErrorResponse(res, 'userId and message are required', 400);
    }

    const result = await userTelegramNotificationService.sendToUser(userId, message, {
      parseMode: 'HTML',
    });

    if (result.success) {
      return sendSuccessResponse(
        res,
        {
          userId,
          sent: true,
          method: result.method,
        },
        "Message sent successfully to user's Telegram"
      );
    } else {
      return sendErrorResponse(
        res,
        'Failed to send message. User may not have connected Telegram or set username.',
        400
      );
    }
  } catch (error: any) {
    console.error('Error sending Telegram message:', error);
    return sendErrorResponse(res, 'Failed to send Telegram message', 500);
  }
};

/**
 * Send custom Telegram message to multiple users
 */
export const sendMessageToMultipleUsers = async (req: Request, res: Response) => {
  try {
    const { userIds, message } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return sendErrorResponse(res, 'userIds array is required and must not be empty', 400);
    }

    if (!message) {
      return sendErrorResponse(res, 'message is required', 400);
    }

    const result = await userTelegramNotificationService.sendToMultipleUsers(userIds, message, {
      parseMode: 'HTML',
    });

    return sendSuccessResponse(
      res,
      {
        total: result.total,
        sent: result.sent,
        failed: result.failed,
        notConnected: result.notConnected,
        results: result.results,
      },
      `Message sent to ${result.sent}/${result.total} users`
    );
  } catch (error: any) {
    console.error('Error sending bulk Telegram messages:', error);
    return sendErrorResponse(res, 'Failed to send bulk Telegram messages', 500);
  }
};

/**
 * Send test Telegram notification using config or override credentials
 */
export const sendTestTelegramNotification = async (req: Request, res: Response) => {
  try {
    const { type, token, chatId } = req.body as {
      type?: 'general' | 'order' | 'transfer' | 'premium';
      token?: string;
      chatId?: string;
    };

    if (!type || !['general', 'order', 'transfer', 'premium'].includes(type)) {
      return sendErrorResponse(res, 'Valid notification type is required', 400);
    }

    let sent = false;
    const now = new Date();

    if (token && chatId) {
      sent = await telegramNotificationService.sendCustomTestNotification(type, token, chatId);
    } else {
      switch (type) {
        case 'general':
          sent = await telegramNotificationService.sendGeneralNotification(
            `<b>Telegram Config Test</b>\n\nGeneral notification test sent at ${now.toLocaleString()}`
          );
          break;
        case 'order':
          sent = await telegramNotificationService.sendOrderNotification({
            orderId: 999999,
            orderNumber: 'TEST-ORDER-001',
            customerName: 'Telegram Config Test',
            customerEmail: 'test@example.com',
            customerPhone: '+10000000000',
            total: 10,
            subtotal: 10,
            discount: 0,
            itemsCount: 1,
            items: [
              {
                productName: 'Test Product',
                quantity: 1,
                unitPrice: 10,
                totalPrice: 10,
              },
            ],
            status: 'TEST',
            createdAt: now,
          });
          break;
        case 'transfer':
          sent = await telegramNotificationService.sendTransferNotification({
            transferId: 999999,
            orderId: 999999,
            orderNumber: 'TEST-TRANSFER-001',
            productName: 'Test Transfer Product',
            customerEmail: 'test@example.com',
            customerTelegram: '@testuser',
            targetUrl: 'https://t.me/test_channel',
            status: 'PENDING',
            customerName: 'Telegram Config Test',
          });
          break;
        case 'premium':
          sent = await telegramNotificationService.sendPremiumNotification({
            username: 'testpremiumuser',
            duration: '1 Month',
            orderId: 999999,
            customerEmail: 'test@example.com',
            productName: 'Test Premium Product',
            status: 'pending',
          });
          break;
      }
    }

    if (!sent) {
      return sendErrorResponse(res, 'Failed to send test Telegram notification', 400);
    }

    return sendSuccessResponse(res, { type, sent: true }, 'Test Telegram notification sent successfully');
  } catch (error: any) {
    console.error('Error sending test Telegram notification:', error);
    return sendErrorResponse(res, 'Failed to send test Telegram notification', 500);
  }
};
