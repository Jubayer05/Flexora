export type PaymentAdjustmentMethod = {
  bonus?: string | number | null
  bonusThreshold?: string | number | null
  feeType?: string | null
  feeValue?: string | number | null
}

export const toPaymentNumber = (value?: string | number | null) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

export const calculatePaymentAdjustments = (
  amount: number,
  method?: PaymentAdjustmentMethod | null
) => {
  const baseAmount = Number.isFinite(amount) ? Math.max(0, amount) : 0
  let finalAmount = baseAmount
  let feeAmount = 0
  let bonusAmount = 0

  if (!method) {
    return { baseAmount, feeAmount, bonusAmount, finalAmount, walletCreditAmount: baseAmount }
  }

  const feeValue = toPaymentNumber(method.feeValue)
  const feeType = String(method.feeType || '').toUpperCase()

  if (feeValue > 0) {
    if (feeType === 'PERCENTAGE') {
      feeAmount = (baseAmount * feeValue) / 100
    } else if (feeType === 'FIXED') {
      feeAmount = feeValue
    }

    finalAmount += feeAmount
  }

  const bonus = toPaymentNumber(method.bonus)
  const bonusThreshold = toPaymentNumber(method.bonusThreshold)
  if (bonus > 0 && baseAmount >= bonusThreshold) {
    bonusAmount = (baseAmount * bonus) / 100
  }

  const walletCreditAmount = baseAmount + bonusAmount

  return {
    baseAmount,
    feeAmount: Number(feeAmount.toFixed(2)),
    bonusAmount: Number(bonusAmount.toFixed(2)),
    finalAmount: Number(Math.max(0, finalAmount).toFixed(2)),
    walletCreditAmount: Number(walletCreditAmount.toFixed(2))
  }
}

export const getPaymentFeeCopy = (method?: PaymentAdjustmentMethod | null) => {
  const feeValue = toPaymentNumber(method?.feeValue)
  const feeType = String(method?.feeType || '').toUpperCase()
  if (feeValue <= 0) return null
  return feeType === 'PERCENTAGE' ? `${feeValue}% fee` : `$${feeValue.toFixed(2)} fee`
}

export const getPaymentBonusCopy = (method?: PaymentAdjustmentMethod | null) => {
  const bonus = toPaymentNumber(method?.bonus)
  const threshold = toPaymentNumber(method?.bonusThreshold)
  if (bonus <= 0) return null
  return threshold > 0 ? `${bonus}% bonus from $${threshold.toFixed(2)}` : `${bonus}% bonus`
}
