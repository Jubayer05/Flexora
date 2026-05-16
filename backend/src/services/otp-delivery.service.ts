/**
 * OTP delivery via Telegram bot has been removed.
 */

export class OTPDeliveryService {
  async sendOTPToCustomer(
    _phoneNumber: string,
    _otpCode: string
  ): Promise<{ success: boolean; message: string; chatId?: number }> {
    return {
      success: false,
      message: 'Telegram OTP delivery is not available'
    }
  }

  async sendOTPByUserId(
    _userId: number,
    _otpCode: string
  ): Promise<{ success: boolean; message: string }> {
    return {
      success: false,
      message: 'Telegram OTP delivery is not available'
    }
  }

  async broadcastMessage(
    _message: string
  ): Promise<{ success: boolean; message: string; sent: number; failed: number }> {
    return {
      success: false,
      message: 'Telegram broadcast is not available',
      sent: 0,
      failed: 0
    }
  }
}

export const otpDeliveryService = new OTPDeliveryService()
