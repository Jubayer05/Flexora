'use client';

import MotionLoader from '@/components/common/MotionLoader';
import { Typography } from '@/components/common/typography';
import { Button } from '@/components/ui/button';
import requests from '@/services/network/http';
import { ArrowLeft, XCircle } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

type OrderDetails = {
  orderId: number;
  orderNumber: string;
  amount: string;
  productName: string;
};

export default function PaymentCancelPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);

  const orderId = searchParams.get('order_id');

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        if (orderId) {
          const response = await requests.get<{
            success: boolean;
            data: {
              id: number;
              orderNumber: string;
              total: string;
              product: {
                name: string;
              };
            };
          }>(`/customer/orders/${orderId}`);

          if (response.success && response.data) {
            setOrderDetails({
              orderId: response.data.id,
              orderNumber: response.data.orderNumber,
              amount: response.data.total,
              productName: response.data.product.name,
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch order details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId]);

  if (loading && orderId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <MotionLoader size="lg" variant="dots" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full">
        <div className="bg-foreground/80 border border-muted-foreground rounded-lg p-8 space-y-6">
          {/* Cancel Icon */}
          <div className="flex justify-center">
            <div className="bg-orange-500/10 rounded-full p-4">
              <XCircle className="w-20 h-20 text-orange-500" />
            </div>
          </div>

          {/* Title */}
          <div className="text-center space-y-2">
            <Typography variant="h3" weight="bold" className="text-orange-500">
              Payment Cancelled
            </Typography>
            <Typography variant="body1" className="text-muted-foreground">
              Your payment was cancelled. No charges were made to your account.
            </Typography>
          </div>

          {/* Order Details */}
          {orderDetails && (
            <div className="bg-background/50 rounded-lg p-4 space-y-3">
              <Typography variant="h6" weight="semibold">
                Order Details
              </Typography>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Order Number</span>
                  <span className="font-medium">{orderDetails.orderNumber}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Product</span>
                  <span className="font-medium">{orderDetails.productName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium">${parseFloat(orderDetails.amount).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Information Box */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <Typography variant="body2" className="text-blue-400">
              <strong>What happened?</strong>
              <br />
              You cancelled the payment process before completing it. Your order is still pending
              and waiting for payment. You can retry the payment anytime.
            </Typography>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              onClick={() => {
                if (orderDetails?.orderId) {
                  router.push(`/checkout/accounts?id=${orderDetails.orderId}`);
                } else {
                  router.push('/shop');
                }
              }}
              className="flex-1 bg-linear-to-b from-primary to-primary/80 hover:bg-primary/90"
            >
              Retry Payment
            </Button>
            <Button variant="outline" onClick={() => router.push('/shop')} className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Shop
            </Button>
          </div>

          {/* Help Text */}
          <div className="text-center pt-4 border-t border-muted-foreground">
            <Typography variant="caption" className="text-muted-foreground">
              Changed your mind? Browse our{' '}
              <a href="/shop" className="text-primary hover:underline">
                products
              </a>{' '}
              or contact{' '}
              <a href="/support" className="text-primary hover:underline">
                support
              </a>
            </Typography>
          </div>
        </div>
      </div>
    </div>
  );
}
