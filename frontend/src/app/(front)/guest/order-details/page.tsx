"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Typography } from "@/components/common/typography";
import { Button } from "@/components/ui/button";
import requests from "@/services/network/http";

export default function GuestOrderDetailsPage() {
  const router = useRouter();
  const params = useSearchParams();
  const cartGroup = params.get("cartGroup") || "";
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchOrder = async () => {
      const guestToken = sessionStorage.getItem("guestToken");
      if (!guestToken || !cartGroup) {
        setError("Missing guest token or cart group");
        setLoading(false);
        return;
      }
      try {
        const res = await requests.get("/guest/order-details?cartGroup=" + cartGroup, {
          headers: { Authorization: `Bearer ${guestToken}` }
        });
        setOrder(res.order);
      } catch (err: any) {
        setError(err?.response?.data?.message || "Failed to fetch order");
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [cartGroup]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>;
  if (!order) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-lg w-full p-6 rounded-lg border bg-foreground/60">
        <Typography variant="h4" className="mb-4">Order Details</Typography>
        <div className="space-y-2">
          <Typography variant="body1"><b>Order Number:</b> {order.orderNumber}</Typography>
          <Typography variant="body1"><b>Status:</b> {order.status}</Typography>
          <Typography variant="body1"><b>Product:</b> {order.product?.name}</Typography>
          <Typography variant="body1"><b>Quantity:</b> {order.quantity}</Typography>
          <Typography variant="body1"><b>Total:</b> ${order.total}</Typography>
          {/* Add more fields as needed */}
        </div>
        <Button className="mt-6 w-full" onClick={() => router.push("/guest/orders")}>Back to Orders</Button>
      </div>
    </div>
  );
}
