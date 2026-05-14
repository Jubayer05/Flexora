'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getImgUrl } from '@/lib/get-image-url'
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2,
  Image as ImageIcon,
  Download
} from 'lucide-react'
import { useState, useEffect } from 'react'

interface TransferStatusDisplayProps {
  transfer: any
  productName: string
  onRetry?: () => void
}

interface TransferProgress {
  currentStep: number
  totalSteps: number
  stepName: string
  status:
    | 'pending'
    | 'in-progress'
    | 'completed'
    | 'failed'
    | 'waiting'
    | 'waiting_period'
    | 'verification_required'
    | 'customer_joined'
    | 'transfer_in_progress'
}

export default function TransferStatusDisplay({
  transfer,
  productName,
  onRetry
}: TransferStatusDisplayProps) {
  const [progress, setProgress] = useState<TransferProgress | null>(null)
  const [floodWaitTime, setFloodWaitTime] = useState<number>(0)

  useEffect(() => {
    // Calculate progress based on transfer status
    const steps = {
      PENDING: { current: 0, total: 5, name: 'Pending' },
      VERIFICATION_REQUIRED: { current: 1, total: 5, name: 'Awaiting Verification' },
      CUSTOMER_JOINED: { current: 2, total: 5, name: 'Customer Joined' },
      TRANSFER_IN_PROGRESS: { current: 3, total: 5, name: 'Transfer In Progress' },
      WAITING_PERIOD: { current: 4, total: 5, name: 'Waiting Period' },
      COMPLETED: { current: 5, total: 5, name: 'Completed' },
      FAILED: { current: 0, total: 5, name: 'Failed' }
    }

    const currentStep = steps[transfer?.status as keyof typeof steps] || steps.PENDING

    // Parse meta for flood wait info
    if (transfer?.meta?.floodWaitUntil) {
      const waitUntil = new Date(transfer.meta.floodWaitUntil).getTime()
      const now = Date.now()
      const remaining = Math.max(0, waitUntil - now)
      setFloodWaitTime(remaining)
    }

    setProgress({
      currentStep: currentStep.current,
      totalSteps: currentStep.total,
      stepName: currentStep.name,
      status: transfer?.status?.toLowerCase() || 'pending'
    })
  }, [transfer])

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'in-progress':
      case 'transfer_in_progress':
      case 'customer_joined':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'verification_required':
      case 'waiting_period':
      case 'waiting':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'failed':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'pending':
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircle2 className='w-5 h-5' />
      case 'in-progress':
      case 'transfer_in_progress':
      case 'customer_joined':
      case 'waiting':
        return <Loader2 className='w-5 h-5 animate-spin' />
      case 'failed':
        return <XCircle className='w-5 h-5' />
      case 'verification_required':
      case 'waiting_period':
      case 'pending':
      default:
        return <Clock className='w-5 h-5' />
    }
  }

  const getStatusMessage = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'Transfer is pending. Waiting to start the process.'
      case 'verification_required':
        return 'Customer needs to verify membership in the group/channel before proceeding.'
      case 'customer_joined':
        return 'Customer has joined. Transfer process is being prepared.'
      case 'transfer_in_progress':
        return 'Transferring ownership to customer. This may take a few moments.'
      case 'waiting_period':
      case 'waiting':
        return 'Telegram is rate-limiting the transfer. The system will retry automatically after the cooldown period.'
      case 'completed':
        return 'Transfer completed successfully! Ownership has been transferred to the customer.'
      case 'failed':
        return 'Transfer failed. Check details below for more information.'
      default:
        return 'Transfer status unknown'
    }
  }

  if (!progress) {
    return null
  }

  const progressPercentage = (progress.currentStep / progress.totalSteps) * 100
  const proofUrl = transfer?.screenshotUrl || transfer?.transferProofUrl
  const resolvedProofUrl = proofUrl ? getImgUrl(proofUrl) : null

  return (
    <div className='space-y-6 w-full'>
      {/* Main Status Card */}
      <Card className='bg-background/50 border-white/10 p-6 space-y-4'>
        {/* Header with Status */}
        <div className='flex items-start justify-between gap-4'>
          <div className='space-y-2'>
            <h3 className='text-lg font-semibold text-white'>{productName}</h3>
            <p className='text-sm text-white/60'>Order Transfer Progress</p>
          </div>
          <div className='flex items-center gap-2'>
            {getStatusIcon(progress.status)}
            <Badge className={getStatusColor(progress.status)}>
              {progress.stepName}
            </Badge>
          </div>
        </div>

        {/* Status Message */}
        <div className={`border rounded-lg p-4 flex gap-3 ${
          progress.status === 'completed'
            ? 'bg-green-500/10 border-green-500/30'
            : progress.status === 'failed'
            ? 'bg-red-500/10 border-red-500/30'
            : progress.status === 'waiting'
            ? 'bg-yellow-500/10 border-yellow-500/30'
            : 'bg-blue-500/10 border-blue-500/30'
        }`}>
          <AlertCircle className='w-4 h-4 flex-shrink-0 mt-0.5' />
          <div>
            {getStatusMessage(progress.status)}
          </div>
        </div>

        {/* Progress Bar */}
        <div className='space-y-2'>
          <div className='flex justify-between items-center text-sm'>
            <span className='text-white/60'>Overall Progress</span>
            <span className='font-semibold text-white'>
              {progress.currentStep} / {progress.totalSteps}
            </span>
          </div>
          <div className='h-2 bg-white/10 rounded-full overflow-hidden'>
            <div
              className='h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-300'
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Details */}
        <div className='grid grid-cols-2 gap-4 pt-2'>
          <div className='space-y-1'>
            <p className='text-xs text-white/50'>Transfer Type</p>
            <p className='text-sm font-semibold text-white capitalize'>
              {transfer?.meta?.transferType || 'Unknown'}
            </p>
          </div>
          <div className='space-y-1'>
            <p className='text-xs text-white/50'>Target URL</p>
            <p className='text-sm font-semibold text-blue-400 truncate'>
              {transfer?.targetUrl || 'N/A'}
            </p>
          </div>
          {transfer?.customerTelegram && (
            <div className='space-y-1'>
              <p className='text-xs text-white/50'>Customer Username</p>
              <p className='text-sm font-semibold text-white'>
                {transfer.customerTelegram}
              </p>
            </div>
          )}
          {transfer?.createdAt && (
            <div className='space-y-1'>
              <p className='text-xs text-white/50'>Started</p>
              <p className='text-sm font-semibold text-white'>
                {new Date(transfer.createdAt).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Flood Wait Message */}
      {floodWaitTime > 0 &&
        (progress.status === 'waiting' || progress.status === 'waiting_period') && (
        <div className='bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 flex gap-3'>
          <Clock className='w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5' />
          <div className='text-yellow-400'>
            <strong>⏳ We will deliver soon!</strong> Telegram is rate-limiting the transfer.
            Waiting approximately {Math.ceil(floodWaitTime / 1000)} seconds before retrying...
          </div>
        </div>
      )}

      {/* Retry for Failed */}
      {progress.status === 'failed' && onRetry && (
        <div className='flex gap-3'>
          <div className='flex-1 bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex gap-3'>
            <XCircle className='w-4 h-4 text-red-400 flex-shrink-0 mt-0.5' />
            <div className='text-red-400'>
              <strong>Transfer Failed</strong>
              {transfer?.failureReason && `: ${transfer.failureReason}`}
            </div>
          </div>
          <button
            onClick={onRetry}
            className='px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors whitespace-nowrap'
          >
            Retry Transfer
          </button>
        </div>
      )}

      {/* Transfer Proof/Screenshot */}
      {resolvedProofUrl && progress.status === 'completed' && (
        <Card className='bg-background/50 border-green-500/20 p-4 space-y-3'>
          <div className='flex items-center gap-2 text-green-400'>
            <ImageIcon className='w-5 h-5' />
            <h4 className='font-semibold'>Transfer Proof</h4>
          </div>
          <div className='space-y-2'>
            <div className='relative bg-black rounded-lg overflow-hidden max-h-64'>
              <img
                src={resolvedProofUrl}
                alt='Transfer proof'
                className='w-full h-full object-contain'
              />
            </div>
            <a
              href={resolvedProofUrl}
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300'
            >
              <Download className='w-4 h-4' />
              Download Full Screenshot
            </a>
          </div>
          <p className='text-xs text-white/50'>
            Screenshot shows proof of successful ownership transfer
          </p>
        </Card>
      )}

      {/* Transfer Steps Timeline */}
      <Card className='bg-background/50 border-white/10 p-4 space-y-3'>
        <h4 className='font-semibold text-white'>Transfer Process</h4>
        <div className='space-y-2'>
          {[
            { step: 1, name: 'Pending', desc: 'Waiting to start transfer' },
            { step: 2, name: 'Verification', desc: 'Customer joins the group/channel' },
            { step: 3, name: 'Joined', desc: 'Customer verified membership' },
            { step: 4, name: 'Transferring', desc: 'Ownership transfer in progress' },
            { step: 5, name: 'Completed', desc: 'Transfer successful' }
          ].map((item) => (
            <div
              key={item.step}
              className={`flex items-start gap-3 p-2 rounded-lg transition-colors ${
                progress.currentStep >= item.step
                  ? 'bg-green-500/10'
                  : 'bg-white/5'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                  progress.currentStep >= item.step
                    ? 'bg-green-500 text-white'
                    : 'bg-white/10 text-white/50'
                }`}
              >
                {progress.currentStep >= item.step ? '✓' : item.step}
              </div>
              <div className='flex-1'>
                <p
                  className={`text-sm font-medium ${
                    progress.currentStep >= item.step
                      ? 'text-white'
                      : 'text-white/50'
                  }`}
                >
                  {item.name}
                </p>
                <p className='text-xs text-white/40'>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Important Notes */}
      <div className='bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex gap-3'>
        <AlertCircle className='w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5' />
        <div className='text-blue-300 text-sm'>
          <strong>Note:</strong> Transfer times may vary depending on Telegram&apos;s rate limits and
          account activity. If &quot;We will deliver soon&quot; message appears, please wait. The system will
          automatically retry after the cooldown period.
        </div>
      </div>
    </div>
  )
}
