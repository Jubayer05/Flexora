"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/common/typography";
import requests from "@/services/network/http";
import { toast } from "sonner";

export default function GuestAccessPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [cartGroup, setCartGroup] = useState("");
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

    const handleVerify = async () => {
      if (!email || !cartGroup || !code) {
        toast.error("Please fill all fields");
        return;
      }
      setIsVerifying(true);
      try {
        const res = await requests.post<{ success: boolean; token?: string; message?: string }>(
          "/guest/verify",
          { email, cartGroup, code }
        );
        if (res.success && res.token) {
          toast.success("Access granted!");
          // Store guest token in sessionStorage
          sessionStorage.setItem("guestToken", res.token);
          // Redirect to guest order details page
          router.push(`/guest/order-details?cartGroup=${cartGroup}`);
        } else {
          toast.error(res.message || "Invalid code");
        }
      } catch (err: any) {
        toast.error(err?.response?.data?.message || "Verification failed");
      } finally {
        setIsVerifying(false);
      }
    };
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full p-6 rounded-lg border border-border bg-card shadow-sm">
        <Typography variant="h4" className="mb-4 text-foreground">Guest Order Access</Typography>
        <div className="space-y-4">
          <Input
            placeholder="Your email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={isVerifying}
            autoComplete="email"
          />
          <Input
            placeholder="Order Number / Cart Group"
            value={cartGroup}
            onChange={e => setCartGroup(e.target.value)}
            disabled={isVerifying}
          />
          <Input
            placeholder="6-digit Access Code"
            value={code}
            onChange={e => setCode(e.target.value)}
            disabled={isVerifying}
            maxLength={6}
          />
          <Button className="w-full" onClick={handleVerify} disabled={isVerifying}>
            {isVerifying ? "Verifying..." : "Verify & View Order"}
          </Button>
        </div>
      </div>
    </div>
  );
}
