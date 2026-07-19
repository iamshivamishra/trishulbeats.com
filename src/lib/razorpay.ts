import Razorpay from "razorpay";
import crypto from "crypto";

let _razorpay: Razorpay | null = null;

export const razorpay = new Proxy({} as Razorpay, {
  get(_target, prop) {
    if (!_razorpay) {
      _razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID!,
        key_secret: process.env.RAZORPAY_KEY_SECRET!,
      });
    }
    return (_razorpay as unknown as Record<string, unknown>)[prop as string];
  },
});

export function verifySignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const body = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(body)
    .digest("hex");
  return expectedSignature === signature;
}

interface RazorpayPaymentLike {
  id: string;
  order_id?: string;
  status?: string;
  amount?: number;
  currency?: string;
}

export async function fetchPaymentById(paymentId: string): Promise<RazorpayPaymentLike> {
  const payment = await razorpay.payments.fetch(paymentId);
  return payment as RazorpayPaymentLike;
}
