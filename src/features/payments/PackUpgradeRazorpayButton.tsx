"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowUpCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loadRazorpayScript } from "@/features/payments/RazorpayButton";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

interface Props {
  packId: string;
  targetTier: "premium" | "unlimited";
  upgradeAmount: number;
  packTitle: string;
  currentTier: string;
}

export default function PackUpgradeRazorpayButton({
  packId,
  targetTier,
  upgradeAmount,
  packTitle,
  currentTier,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
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
        body: JSON.stringify({ packId, targetTier }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to create upgrade order");
        return;
      }

      const { orderId } = await res.json();
      const razorpay = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: upgradeAmount * 100,
        currency: "INR",
        name: "Trishul Beats",
        description: `Upgrade ${currentTier} → ${targetTier} — ${packTitle}`,
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
              toast.success(`Upgraded to ${targetTier}! Refreshing…`);
              router.push(`/beat-packs/${packId}?purchased=1`);
              router.refresh();
              return;
            }
            const data = await verifyRes.json().catch(() => ({}));
            console.error("Upgrade verification failed:", data);
            toast.error(data.error || "Upgrade verification failed");
          } catch (err) {
            console.error("Upgrade verification error:", err);
            toast.error("Network error during upgrade verification");
          }
        },
        modal: {
          ondismiss: async () => {
            await fetch("/api/payment/fail", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId,
                reason: "Upgrade cancelled by user",
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
      className="w-full"
      onClick={handleUpgrade}
      disabled={loading}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing…
        </>
      ) : (
        <>
          <ArrowUpCircle className="mr-2 h-4 w-4" />
          Upgrade to {targetTier} — ₹{upgradeAmount.toLocaleString("en-IN")}
        </>
      )}
    </Button>
  );
}
