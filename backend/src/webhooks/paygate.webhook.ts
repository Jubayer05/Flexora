import type { Request, Response } from 'express'
import { BalanceService } from '../services/balance.service'
import { PaymentService } from '../services/payment.service'

const paymentService = new PaymentService()
const balanceService = new BalanceService()

export async function handlePayGateWebhook(req: Request, res: Response) {
  try {
    // PayGate sends GET callback, so data is in query string
    const payload =
      req.method === 'GET'
        ? (req.query as any)
        : req.body

    // We protect callback using our own secret param
    const secret = String(payload?.cb_secret || '')

    console.log('[PayGate Webhook] Received:', {
      number: payload?.number,
      value_coin: payload?.value_coin,
      coin: payload?.coin,
      txid_out: payload?.txid_out,
      address_in: payload?.address_in
    })

    const paymentWebhookResult = await paymentService.handleWebhook('paygate', payload, secret)

    const paygateLinkId = String(payload?.paygateLinkId || payload?.number || '')
    if (paygateLinkId && /^pg(c|cr)_/i.test(paygateLinkId)) {
      try {
        await balanceService.processPayGateCallback({
          ...payload,
          paygateLinkId
        })
      } catch (topupError: any) {
        console.error('[PayGate Webhook] Topup callback handling failed:', topupError?.message)
      }
    }

    console.log('[PayGate Webhook] Processed result', {
      paymentSuccess: paymentWebhookResult?.success,
      paygateLinkId: paygateLinkId || null
    })

    return res.status(200).send('OK')
  } catch (error: any) {
    console.error('[PayGate Webhook] Failed:', error.message)
    // return 200 so PayGate doesn’t keep retrying
    return res.status(200).send('OK')
  }
}






