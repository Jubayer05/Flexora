'use client'

import MotionLoader from '@/components/common/MotionLoader'
import { Typography } from '@/components/common/typography'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import useAsync from '@/hooks/useAsync'
import { showError } from '@/lib/errMsg'
import requests from '@/services/network/http'
import {
  calculatePaymentAdjustments,
  getPaymentBonusCopy,
  getPaymentFeeCopy
} from '@/utils/payment-adjustments'
import {
  Check,
  CircleCheck,
  Clock3,
  Copy,
  CreditCard,
  ExternalLink,
  Loader2,
  ShieldCheck,
  TicketPercent,
  Wallet
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

type PaymentMethod = {
  id: number
  name: string
  gateway: string
  thumbnail?: string | null
  isActive: boolean
  minAmount?: number | string
  currencies?: string[]
  bonus?: number | string
  bonusThreshold?: number | string
  feeType?: string | null
  feeValue?: number | string | null
  testMode?: boolean
  meta?: {
    description?: string
    processingTime?: string
  } | null
}

type PendingTopup = {
  topupRequestId: number
  gateway: string
  gatewayTxnId?: string
  status: string
  paymentUrl?: string
  address?: string
  qrCode?: string
  expiresAt?: string
  paygate?: {
    address?: string
    amountCoin?: number
    coin?: string
    expiresAt?: string
    qrCodeData?: string
  }
}

const toNumber = (value?: string | number | null) => {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

const formatGatewayLabel = (gateway: string) => {
  if (!gateway) return 'Payment Method'
  return gateway.charAt(0).toUpperCase() + gateway.slice(1)
}

type WalletTopupPanelProps = {
  mode?: 'page' | 'modal'
}

export function WalletTopupPanel({ mode = 'page' }: WalletTopupPanelProps) {
  const [amount, setAmount] = useState('20')
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pendingTopup, setPendingTopup] = useState<PendingTopup | null>(null)
  const [paygateSecondsLeft, setPaygateSecondsLeft] = useState<number | null>(null)
  const [copiedAddress, setCopiedAddress] = useState(false)
  const [binanceOrderId, setBinanceOrderId] = useState('')
  const [verifyingBinance, setVerifyingBinance] = useState(false)

  const { data: balanceData, mutate: mutateBalance, loading: loadingBalance } = useAsync<{
    success: boolean
    data: { balance: number }
  }>(() => '/customer/balance')

  const { data: paymentMethodsData, loading: loadingPaymentMethods } = useAsync<{
    success: boolean
    data: PaymentMethod[]
  }>(() => '/payment-methods')

  const balance = Number(balanceData?.data?.balance || 0)
  const paymentMethods = paymentMethodsData?.data || []
  const walletPaymentMethods = useMemo(
    () => paymentMethods.filter((method) => method.gateway?.toLowerCase?.() !== 'balance'),
    [paymentMethods]
  )

  useEffect(() => {
    if (!walletPaymentMethods.length) {
      setSelectedPaymentMethodId(null)
      return
    }

    setSelectedPaymentMethodId((current) => {
      if (current && walletPaymentMethods.some((method) => method.id === current)) return current
      return walletPaymentMethods[0]!.id
    })
  }, [walletPaymentMethods])

  const selectedMethod = walletPaymentMethods.find((method) => method.id === selectedPaymentMethodId)
  const parsedAmount = Number(amount)
  const isAmountValid = Number.isFinite(parsedAmount) && parsedAmount > 0
  const selectedMethodMinAmount = toNumber(selectedMethod?.minAmount)
  const amountBelowSelectedMethodMin = Boolean(
    selectedMethod && parsedAmount < selectedMethodMinAmount
  )

  useEffect(() => {
    const expiresAt = pendingTopup?.paygate?.expiresAt || pendingTopup?.expiresAt
    if (!expiresAt) {
      setPaygateSecondsLeft(null)
      return
    }

    const tick = () => {
      const end = new Date(expiresAt).getTime()
      const now = Date.now()
      const seconds = Math.max(0, Math.floor((end - now) / 1000))
      setPaygateSecondsLeft(seconds)
    }

    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [pendingTopup?.expiresAt, pendingTopup?.paygate?.expiresAt])

  const countdownText = useMemo(() => {
    if (paygateSecondsLeft === null) return null
    const minutes = Math.floor(paygateSecondsLeft / 60)
    const seconds = paygateSecondsLeft % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }, [paygateSecondsLeft])

  const selectedPaymentAdjustment = useMemo(
    () => calculatePaymentAdjustments(isAmountValid ? parsedAmount : 0, selectedMethod),
    [isAmountValid, parsedAmount, selectedMethod]
  )

  const syncTopupStatus = useCallback(
    async (topupRequestId: number) => {
      try {
        const response = await requests.get<{
          success: boolean
          data: any
        }>(`/customer/balance/topup-status/${topupRequestId}`)

        const data = response.data
        const nextStatus = String(data?.status || 'PENDING')

        setPendingTopup((current) =>
          current
            ? {
                ...current,
                status: nextStatus,
                gatewayTxnId: data?.transactionId || current.gatewayTxnId,
                paygate: data?.paygate || current.paygate
              }
            : current
        )

        if (nextStatus === 'COMPLETED' || nextStatus === 'APPROVED') {
          await mutateBalance()
          toast.success('Wallet top-up completed successfully.')
        }
      } catch (error) {
        showError(error)
      }
    },
    [mutateBalance]
  )

  useEffect(() => {
    if (!pendingTopup?.topupRequestId) return
    if (pendingTopup.status === 'COMPLETED' || pendingTopup.status === 'APPROVED') return
    if (pendingTopup.status === 'FAILED' || pendingTopup.status === 'REJECTED') return

    const interval = setInterval(() => {
      syncTopupStatus(pendingTopup.topupRequestId)
    }, 12000)

    return () => clearInterval(interval)
  }, [pendingTopup?.topupRequestId, pendingTopup?.status, syncTopupStatus])

  const handleVerifyBinanceTopup = useCallback(async () => {
    if (!pendingTopup?.topupRequestId) return
    if (!binanceOrderId.trim()) {
      toast.error('Please enter your Binance Order ID')
      return
    }

    setVerifyingBinance(true)
    try {
      const response = await requests.post<{
        success: boolean
        data: {
          status: string
          transactionId?: string
        }
      }>('/customer/balance/verify-binance-topup', {
        topupRequestId: pendingTopup.topupRequestId,
        binanceOrderId: binanceOrderId.trim()
      })

      const data = response.data
      setPendingTopup((current) =>
        current
          ? {
              ...current,
              status: data?.status || 'COMPLETED',
              gatewayTxnId: data?.transactionId || current.gatewayTxnId
            }
          : current
      )
      await mutateBalance()
      toast.success('Binance top-up verified successfully.')
    } catch (error) {
      showError(error)
    } finally {
      setVerifyingBinance(false)
    }
  }, [binanceOrderId, mutateBalance, pendingTopup?.topupRequestId])

  const handleCopyAddress = useCallback(() => {
    const address = pendingTopup?.paygate?.address || pendingTopup?.address
    if (!address) return
    navigator.clipboard.writeText(address)
    setCopiedAddress(true)
    toast.success(
      pendingTopup?.gateway?.toLowerCase() === 'binance' ? 'Binance ID copied' : 'Payment address copied'
    )
    setTimeout(() => setCopiedAddress(false), 1500)
  }, [pendingTopup?.address, pendingTopup?.gateway, pendingTopup?.paygate?.address])

  const openPaymentWindow = (paymentUrl?: string) => {
    if (!paymentUrl) return

    const popup = window.open(paymentUrl, '_blank', 'noopener,noreferrer')
    if (!popup) {
      window.location.href = paymentUrl
      return
    }

    toast.success('Payment page opened in a new tab.')
  }

  const initiateTopup = async () => {
    if (!isAmountValid) {
      toast.error('Enter a valid amount (minimum $1)')
      return
    }

    if (!selectedMethod) {
      toast.error('Please select a payment method')
      return
    }

    if (parsedAmount < selectedMethodMinAmount) {
      toast.error(
        `${selectedMethod.name} requires at least $${selectedMethodMinAmount.toFixed(2)} to continue.`
      )
      return
    }

    setIsSubmitting(true)
    try {
      const response = await requests.post<{
        success: boolean
        data: any
      }>('/customer/balance/initiate-topup', {
        amount: parsedAmount,
        paymentMethodId: selectedMethod.id
      })

      const data = response.data
      const nextPending: PendingTopup = {
        topupRequestId: data.topupRequestId,
        gateway: data.gateway,
        gatewayTxnId: data.gatewayTxnId,
        status: data.status || 'PENDING',
        paymentUrl: data.paymentUrl,
        address: data.address,
        qrCode: data.qrCode,
        expiresAt: data.expiresAt,
        paygate: data.metadata?.paygate || data.paygate
      }

      setPendingTopup(nextPending)
      setBinanceOrderId('')

      if (data.paymentUrl) {
        openPaymentWindow(data.paymentUrl)
      } else if (data.address || data.qrCode) {
        toast.success('Payment instructions generated. Complete the payment and check the status.')
      } else {
        toast.success('Top-up initiated successfully.')
      }
    } catch (error) {
      showError(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loadingPaymentMethods) {
    return (
      <div className='flex min-h-[280px] items-center justify-center'>
        <MotionLoader size='lg' variant='dots' />
      </div>
    )
  }

  const Wrapper = mode === 'modal' ? 'div' : Card
  const wrapperProps =
    mode === 'modal'
      ? { className: 'space-y-6' }
      : { className: 'bg-background/80 backdrop-blur' }

  const paymentAddress = pendingTopup?.paygate?.address || pendingTopup?.address
  const paymentCoin = pendingTopup?.paygate?.coin
  const paymentAmountCoin = pendingTopup?.paygate?.amountCoin
  const isPendingBinance = pendingTopup?.gateway?.toLowerCase() === 'binance'

  return (
    <>
      <Wrapper {...wrapperProps}>
        {mode === 'page' ? (
          <>
            <CardHeader>
              <CardTitle className='text-xl font-semibold text-foreground'>Wallet Top-up</CardTitle>
              <CardDescription>
                Enter your amount and choose from all active payment methods added in admin.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-6'>
              <PanelContent />
            </CardContent>
          </>
        ) : (
          <PanelContent />
        )}
      </Wrapper>

    </>
  )

  function PanelContent() {
    return (
      <div className='space-y-6'>
        <div className='rounded-lg border border-border bg-muted/30 p-4'>
          <p className='text-sm text-muted-foreground'>Current balance</p>
          {loadingBalance ? (
            <div className='mt-1 flex h-8 items-center'>
              <MotionLoader size='sm' variant='dots' />
            </div>
          ) : (
            <p className='text-3xl font-semibold text-primary'>${balance.toFixed(2)}</p>
          )}
        </div>

        <div className='space-y-2'>
          <Label htmlFor='topup-amount'>Amount (USD)</Label>
          <Input
            id='topup-amount'
            type='number'
            min={1}
            step='0.01'
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder='Enter amount'
          />
        </div>

        <div className='space-y-3'>
          <Typography variant='body2' weight='semibold'>
            Select Payment Method
          </Typography>

          {!walletPaymentMethods.length ? (
            <div className='rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground'>
              No active top-up payment methods are available right now.
            </div>
          ) : (
            <div className='grid gap-3 md:grid-cols-2'>
              {walletPaymentMethods.map((method) => {
                const methodMinAmount = toNumber(method.minAmount)
                const isDisabledForAmount = isAmountValid && parsedAmount < methodMinAmount
                const feeCopy = getPaymentFeeCopy(method)
                const bonusCopy = getPaymentBonusCopy(method)
                const isSelected = selectedPaymentMethodId === method.id

                return (
                  <button
                    key={method.id}
                    type='button'
                    onClick={() => !isDisabledForAmount && setSelectedPaymentMethodId(method.id)}
                    disabled={isSubmitting || isDisabledForAmount}
                    className={`rounded-xl border-2 p-4 text-left transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/10 shadow-lg shadow-primary/10'
                        : 'border-border bg-background/60 hover:border-primary/50 hover:bg-muted/30'
                    } ${isDisabledForAmount ? 'cursor-not-allowed opacity-60 hover:border-border hover:bg-background/60' : ''}`}
                  >
                    <div className='flex items-start gap-3'>
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border ${
                          isSelected
                            ? 'border-primary/40 bg-primary/10'
                            : 'border-border bg-muted/30'
                        }`}
                      >
                        {method.gateway?.toLowerCase() === 'paygate' ? (
                          <Wallet className='h-5 w-5 text-primary' />
                        ) : (
                          <CreditCard className='h-5 w-5 text-primary' />
                        )}
                      </div>

                      <div className='min-w-0 flex-1'>
                        <div className='flex items-start justify-between gap-3'>
                          <div>
                            <div className='font-semibold text-foreground'>{method.name}</div>
                            <div className='text-xs text-muted-foreground'>
                              {formatGatewayLabel(method.gateway)}
                            </div>
                            {(method.meta?.description || method.meta?.processingTime) && (
                              <div className='mt-1 text-xs text-muted-foreground'>
                                {method.meta?.description || method.meta?.processingTime}
                              </div>
                            )}
                          </div>

                          {isSelected && (
                            <div className='rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground'>
                              Selected
                            </div>
                          )}
                        </div>

                        <div className='mt-3 flex flex-wrap gap-2 text-xs'>
                          <span className='rounded-full border border-border bg-muted/30 px-2.5 py-1 text-muted-foreground'>
                            Min ${methodMinAmount.toFixed(2)}
                          </span>
                          {method.currencies?.length ? (
                            <span className='rounded-full border border-border bg-muted/30 px-2.5 py-1 text-muted-foreground'>
                              {method.currencies.slice(0, 3).join(', ')}
                            </span>
                          ) : null}
                          {feeCopy && (
                            <span className='rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-amber-400'>
                              {feeCopy}
                            </span>
                          )}
                          {bonusCopy && (
                            <span className='inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-emerald-400'>
                              <TicketPercent className='h-3 w-3' />
                              {bonusCopy}
                            </span>
                          )}
                        </div>

                        {isDisabledForAmount && (
                          <p className='mt-3 text-xs text-destructive'>
                            Increase your amount to at least ${methodMinAmount.toFixed(2)} to use
                            this method.
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {selectedMethod && amountBelowSelectedMethodMin && (
          <div className='rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive'>
            {selectedMethod.name} requires at least ${selectedMethodMinAmount.toFixed(2)} for
            wallet top-up.
          </div>
        )}

        {selectedMethod && isAmountValid && !amountBelowSelectedMethodMin && (
          <div className='space-y-2 rounded-lg border border-border bg-muted/20 p-4 text-sm'>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground'>Top-up amount</span>
              <span className='font-medium text-foreground'>${selectedPaymentAdjustment.baseAmount.toFixed(2)}</span>
            </div>
            {selectedPaymentAdjustment.feeAmount > 0 && (
              <div className='flex items-center justify-between text-amber-400'>
                <span>Fee</span>
                <span className='font-semibold'>+${selectedPaymentAdjustment.feeAmount.toFixed(2)}</span>
              </div>
            )}
            {selectedPaymentAdjustment.bonusAmount > 0 && (
              <div className='flex items-center justify-between text-emerald-400'>
                <span>Bonus</span>
                <span className='font-semibold'>+${selectedPaymentAdjustment.bonusAmount.toFixed(2)}</span>
              </div>
            )}
            {selectedPaymentAdjustment.bonusAmount > 0 && (
              <div className='flex items-center justify-between text-emerald-400'>
                <span>Wallet credit</span>
                <span className='font-semibold'>${selectedPaymentAdjustment.walletCreditAmount.toFixed(2)}</span>
              </div>
            )}
            <div className='flex items-center justify-between border-t border-border pt-2'>
              <span className='font-semibold text-foreground'>Total to pay</span>
              <span className='font-bold text-primary'>${selectedPaymentAdjustment.finalAmount.toFixed(2)}</span>
            </div>
          </div>
        )}

        <Button
          onClick={() => initiateTopup()}
          disabled={isSubmitting || !isAmountValid || !selectedMethod || amountBelowSelectedMethodMin}
        >
          {isSubmitting ? (
            <>
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              Initializing...
            </>
          ) : (
            <>
              <Wallet className='mr-2 h-4 w-4' />
              Start Top-up
            </>
          )}
        </Button>

        {pendingTopup && (
          <div className='space-y-3 rounded-lg border border-border bg-card p-4'>
            <div className='flex items-center justify-between gap-3'>
              <div>
                <Typography variant='body2' className='text-muted-foreground'>
                  Top-up request #{pendingTopup.topupRequestId}
                </Typography>
                <Typography variant='caption' className='text-muted-foreground'>
                  {formatGatewayLabel(pendingTopup.gateway)}
                </Typography>
              </div>

              <div className='flex items-center gap-2'>
                {pendingTopup.status === 'COMPLETED' || pendingTopup.status === 'APPROVED' ? (
                  <CircleCheck className='h-4 w-4 text-green-500' />
                ) : (
                  <Clock3 className='h-4 w-4 text-amber-500' />
                )}
                <span className='text-sm font-semibold'>{pendingTopup.status}</span>
              </div>
            </div>

            <div className='flex flex-wrap gap-2'>
              <Button
                variant='secondary'
                size='sm'
                onClick={() => syncTopupStatus(pendingTopup.topupRequestId)}
              >
                Check Payment Status
              </Button>

              {pendingTopup.paymentUrl && (
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => openPaymentWindow(pendingTopup.paymentUrl)}
                >
                  <ExternalLink className='mr-2 h-4 w-4' />
                  Open Payment
                </Button>
              )}
            </div>

            {paymentAddress && (
              <div className='space-y-3 rounded-md border border-border bg-muted/30 p-3'>
                <div className='text-xs text-muted-foreground'>
                  {isPendingBinance ? 'Binance ID' : paymentAmountCoin ? 'Send exactly' : 'Payment address'}
                  {paymentAmountCoin && (
                    <span className='ml-1 font-semibold text-foreground'>
                      {paymentAmountCoin} {paymentCoin || ''}
                    </span>
                  )}
                </div>

                {countdownText && (
                  <div className='text-xs text-amber-600'>Payment expires in {countdownText}</div>
                )}

                <div className='rounded-md border border-border bg-background p-2'>
                  <div className='mb-1 text-[11px] text-muted-foreground'>
                    {isPendingBinance ? 'Binance ID' : 'Address'}
                  </div>
                  <div className='break-all text-xs font-mono'>{paymentAddress}</div>
                </div>

                {pendingTopup.qrCode && (
                  <div className='flex flex-col items-center gap-2'>
                    <div className='text-xs text-muted-foreground'>
                      {isPendingBinance
                        ? 'Scan this QR code with your Binance app'
                        : 'Scan this QR code'}
                    </div>
                    <div className='rounded-lg border border-border bg-white p-3'>
                      <img
                        src={pendingTopup.qrCode}
                        alt='Payment QR code'
                        width={180}
                        height={180}
                        className='h-[180px] w-[180px] object-contain'
                      />
                    </div>
                  </div>
                )}

                <div className='flex gap-2'>
                  <Button variant='outline' size='sm' onClick={handleCopyAddress}>
                    {copiedAddress ? (
                      <>
                        <Check className='mr-2 h-4 w-4 text-green-500' />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className='mr-2 h-4 w-4' />
                        {isPendingBinance ? 'Copy Binance ID' : 'Copy Address'}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {isPendingBinance && pendingTopup.status === 'PENDING' && (
              <div className='space-y-3 rounded-md border border-blue-500/20 bg-blue-500/5 p-3'>
                <div className='space-y-1 text-sm text-blue-100'>
                  <p>1. Open Binance and send the amount to the Binance ID above.</p>
                  <p>2. After payment, copy your Binance Order ID from the successful transfer.</p>
                  <p>3. Paste it below and verify to credit your wallet balance.</p>
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='wallet-binance-order-id'>Enter your Binance Order ID</Label>
                  <Input
                    id='wallet-binance-order-id'
                    value={binanceOrderId}
                    onChange={(e) => setBinanceOrderId(e.target.value)}
                    placeholder='e.g. 1234567890123456'
                    className='font-mono'
                  />
                </div>

                <Button
                  onClick={handleVerifyBinanceTopup}
                  disabled={verifyingBinance || !binanceOrderId.trim()}
                >
                  {verifyingBinance ? (
                    <>
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                      Verifying...
                    </>
                  ) : (
                    'Verify payment'
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        <div className='rounded-lg border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground'>
          <div className='mb-1 flex items-center gap-2 font-medium text-foreground'>
            <ShieldCheck className='h-4 w-4 text-primary' />
            Auto-credit flow
          </div>
          After successful payment confirmation, your wallet balance is credited automatically and
          shown in your profile balance card.
        </div>
      </div>
    )
  }
}
