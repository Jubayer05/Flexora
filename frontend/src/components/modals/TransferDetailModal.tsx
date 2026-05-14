'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  CheckCircle2,
  Circle,
  Clock,
  ExternalLink,
  Phone,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import TransferStatusDisplay from '../admin/telegram/TransferStatusDisplay';

interface TransferDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transfer: {
    id: number;
    status: string;
    targetUrl: string;
    customerTelegram: string;
    joinVerified: boolean;
    joinVerifiedAt?: Date | null;
    transferStartedAt?: Date | null;
    transferCompletedAt?: Date | null;
    screenshotUrl?: string | null;
    transferProofUrl?: string | null;
    failureReason?: string | null;
    retryCount?: number;
    createdAt?: Date | string | null;
    updatedAt?: Date | string | null;
    meta?: Record<string, any> | null;
  };
  productName?: string;
}

const transferStages = [
  {
    key: 'PENDING',
    label: 'Transfer Created',
    description: 'Transfer request initiated',
    icon: Circle,
  },
  {
    key: 'VERIFICATION_REQUIRED',
    label: 'Verification Email Sent',
    description: 'Customer needs to join group/channel',
    icon: Clock,
  },
  {
    key: 'CUSTOMER_JOINED',
    label: 'Customer Joined',
    description: 'Membership verified successfully',
    icon: CheckCircle2,
  },
  {
    key: 'TRANSFER_IN_PROGRESS',
    label: 'Transfer In Progress',
    description: 'Ownership transfer is being processed',
    icon: TrendingUp,
  },
  {
    key: 'COMPLETED',
    label: 'Transfer Completed',
    description: 'Ownership transferred successfully',
    icon: CheckCircle2,
  },
];

export function TransferDetailModal({
  open,
  onOpenChange,
  transfer,
  productName,
}: TransferDetailModalProps) {
  const statusIndex = transferStages.findIndex((stage) => stage.key === transfer.status);
  const isFailed = transfer.status === 'FAILED';
  const normalizedTransfer = {
    ...transfer,
    screenshotUrl: transfer.screenshotUrl || transfer.transferProofUrl,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Transfer Progress</DialogTitle>
          <DialogDescription>
            {productName ? `Transfer details for ${productName}` : 'Track your transfer status'}
          </DialogDescription>
        </DialogHeader>

        {/* Transfer Info */}
        <div className="space-y-4 py-4">
          <TransferStatusDisplay
            transfer={normalizedTransfer}
            productName={productName || 'Transfer Product'}
          />

          {/* Basic Details */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Target URL</div>
              <a
                href={transfer.targetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline inline-flex items-center gap-1"
              >
                {transfer.targetUrl.replace('https://t.me/', '@')}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Submitted Telegram Username / Phone</div>
              <div className="text-sm inline-flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {transfer.customerTelegram}
              </div>
            </div>
            {transfer.retryCount && transfer.retryCount > 0 && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">Retry Count</div>
                <div className="text-sm">{transfer.retryCount}</div>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-2">
            <h4 className="font-semibold text-sm">What happens next</h4>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>1. Join the target group or channel from the link above.</p>
              <p>2. Make sure the joined account matches the submitted Telegram username or phone.</p>
              <p>3. Use the verification action once you have joined.</p>
              <p>4. After successful verification, the ownership flow continues automatically and the transfer status updates here.</p>
            </div>
          </div>

          {/* Progress Timeline */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Transfer Timeline</h4>
            {transferStages.map((stage, index) => {
              const Icon = stage.icon;
              const isCompleted = index < statusIndex || transfer.status === 'COMPLETED';
              const isCurrent = index === statusIndex && !isFailed;
              const isPending = index > statusIndex;

              return (
                <div key={stage.key} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        'rounded-full p-2 border-2',
                        isCompleted && 'bg-green-500/20 border-green-500',
                        isCurrent && 'bg-blue-500/20 border-blue-500 animate-pulse',
                        isPending && 'bg-muted border-muted-foreground/30'
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-4 w-4',
                          isCompleted && 'text-green-500',
                          isCurrent && 'text-blue-500',
                          isPending && 'text-muted-foreground'
                        )}
                      />
                    </div>
                    {index < transferStages.length - 1 && (
                      <div
                        className={cn(
                          'w-0.5 h-12 my-1',
                          isCompleted ? 'bg-green-500' : 'bg-muted-foreground/30'
                        )}
                      />
                    )}
                  </div>
                  <div className="flex-1 pb-8">
                    <div className="font-medium text-sm">{stage.label}</div>
                    <div className="text-xs text-muted-foreground">{stage.description}</div>
                    {stage.key === 'CUSTOMER_JOINED' && transfer.joinVerifiedAt && (
                      <div className="text-xs text-green-500 mt-1">
                        Verified on {format(new Date(transfer.joinVerifiedAt), 'MMM dd, HH:mm')}
                      </div>
                    )}
                    {stage.key === 'TRANSFER_IN_PROGRESS' && transfer.transferStartedAt && (
                      <div className="text-xs text-blue-500 mt-1">
                        Started on {format(new Date(transfer.transferStartedAt), 'MMM dd, HH:mm')}
                      </div>
                    )}
                    {stage.key === 'COMPLETED' && transfer.transferCompletedAt && (
                      <div className="text-xs text-green-500 mt-1">
                        Completed on{' '}
                        {format(new Date(transfer.transferCompletedAt), 'MMM dd, HH:mm')}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Failed Status */}
            {isFailed && (
              <div className="flex gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium text-sm text-red-500">Transfer Failed</div>
                  {transfer.failureReason && (
                    <div className="text-xs text-red-400 mt-1">{transfer.failureReason}</div>
                  )}
                  <div className="text-xs text-muted-foreground mt-2">
                    Please contact support for assistance.
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {transfer.status === 'VERIFICATION_REQUIRED' && (
            <Button asChild>
              <a href={transfer.targetUrl} target="_blank" rel="noopener noreferrer">
                Join Group/Channel
              </a>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
