"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RazorpayButtonProps {
  beatId: string;
  licenseId: string;
  price: number;
  beatTitle: string;
  licenseType: string;
  disabled?: boolean;
}

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export { loadRazorpayScript };

export default function RazorpayButton({
  beatId,
  licenseId,
  price,
  beatTitle,
  licenseType,
  disabled,
}: RazorpayButtonProps) {
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
        body: JSON.stringify({ beatId, licenseId }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to create order");
        return;
      }

      const { orderId, amount } = await res.json();

      const razorpay = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: amount * 100,
        currency: "INR",
        name: "Trishul Beats",
        description: `${licenseType} License — ${beatTitle}`,
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
              toast.success("Payment successful! Beat purchased.");
              router.push(`/checkout/success?orderId=${data.order?._id || response.razorpay_order_id}`);
            } else {
              const data = await verifyRes.json();
              toast.error(data.error || "Payment verification failed");
            }
          } catch {
            toast.error("Something went wrong during verification");
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
    <Button
      onClick={handlePayment}
      disabled={loading || disabled}
      className="w-full"
      size="lg"
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <ShoppingCart className="mr-2 h-4 w-4" />
          Buy Now — ₹{price.toLocaleString()}
        </>
      )}
    </Button>
  );
}
