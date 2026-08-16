"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loadRazorpayScript } from "@/features/payments/RazorpayButton";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

interface Props {
  packId: string;
  tier: "basic" | "premium" | "unlimited";
  amount: number;
  packTitle: string;
  couponCode?: string;
}

export default function PackRazorpayButton({ packId, tier, amount, packTitle, couponCode }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error("Failed to load payment gateway");
        return;
      }

      const res = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId, tier, ...(couponCode && { couponCode }) }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to create order");
        return;
      }

      const { orderId } = await res.json();
      const razorpay = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: amount * 100,
        currency: "INR",
        name: "Trishul Beats",
        description: `${tier} Pack License — ${packTitle}`,
        order_id: orderId,
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const verifyRes = await fetch("/api/payment/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              }),
            });
            if (verifyRes.ok) {
              const data = await verifyRes.json();
              toast.success("Payment successful! Redirecting…");
              router.push(`/checkout/success?orderId=${data.order?._id || response.razorpay_order_id}`);
              return;
            }
            const data = await verifyRes.json().catch(() => ({}));
            console.error("Payment verification failed:", data);
            toast.error(data.error || "Payment verification failed. Please contact support.");
          } catch (err) {
            console.error("Payment verification network error:", err);
            toast.error("Network error during payment verification. Please refresh and check your profile.");
          }
        },
        modal: {
          ondismiss: async () => {
            await fetch("/api/payment/fail", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId,
                reason: "Payment cancelled by user",
              }),
            }).catch(() => {});
          },
        },
        theme: { color: "#c2410c" },
      });

      razorpay.open();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button className="w-full" onClick={handlePayment} disabled={loading}>
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <ShoppingCart className="mr-2 h-4 w-4" />
          Buy {tier} — ₹{amount.toLocaleString("en-IN")}
        </>
      )}
    </Button>
  );
}

