import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Download, ArrowRight, FileText, Music } from "lucide-react";
import { auth } from "@/lib/auth";
import { orderRepository } from "@/lib/repositories/order.repository";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = {
  title: "Purchase Complete",
  robots: { index: false, follow: false },
};

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CheckoutSuccessPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const rawParams = await searchParams;
  const orderId = typeof rawParams.orderId === "string" ? rawParams.orderId : null;

  let order = null;
  if (orderId) {
    order = await orderRepository.findById(orderId);
    if (order && order.buyerId.toString() !== session.user.id) {
      order = null;
    }
  }

  return (
    <div className="page-shell flex flex-col items-center">
      <div className="w-full max-w-lg text-center">
        {/* Success animation */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10 motion-safe:animate-[scale-in_0.3s_ease-out]">
          <CheckCircle2 className="h-10 w-10 text-green-500" />
        </div>

        <h1 className="text-3xl font-bold tracking-tight">Thank you for your purchase!</h1>
        <p className="mt-3 text-muted-foreground">
          Your payment was successful. Your beats are ready to download.
        </p>

        {/* Order details */}
        {order && order.status === "paid" && (
          <Card className="mt-8 border-border/50 bg-card/80 text-left">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Order Summary
                </p>
                <Badge variant="secondary" className="bg-green-500/10 text-green-600 dark:text-green-400">
                  Paid
                </Badge>
              </div>

              <Separator />

              <div className="space-y-3">
                {order.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Music className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate text-sm font-medium">{item.beatTitle}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {item.licenseType}
                      </Badge>
                      <span className="text-sm font-semibold">
                        ₹{item.price.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              {order.couponCode && order.discountAmount > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>₹{(order.subtotalAmount ?? order.totalAmount + order.discountAmount).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-green-600">
                    <span className="flex items-center gap-1">
                      Coupon
                      <Badge variant="outline" className="ml-1 font-mono text-[10px]">
                        {order.couponCode}
                      </Badge>
                    </span>
                    <span>-₹{order.discountAmount.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Total</span>
                <span className="text-lg font-bold text-primary">
                  ₹{order.totalAmount.toLocaleString("en-IN")}
                </span>
              </div>

              {order.receipt && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Receipt: {order.receipt}</span>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/api/orders/${orderId}/receipt`}
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      <FileText className="h-3 w-3" />
                      Receipt
                    </Link>
                    {(() => {
                      const packItem = order.items.find(
                        (i) =>
                          (i.sourceType === "pack" || i.sourceType === "upgrade") &&
                          i.sourcePackId
                      );
                      if (!packItem?.sourcePackId) return null;
                      return (
                        <Link
                          href={`/api/beat-packs/${packItem.sourcePackId}/license`}
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          <FileText className="h-3 w-3" />
                          License
                        </Link>
                      );
                    })()}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="mt-8 space-y-3">
          <Button asChild size="lg" className="w-full">
            <Link href="/profile">
              <Download className="mr-2 h-4 w-4" />
              Download Your Beats
            </Link>
          </Button>

          {/* <Button asChild variant="outline" size="lg" className="w-full">
            <Link href="/beats">
              Browse More Beats
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button> */}
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          A confirmation has been sent to your email. You can always access your purchases from your{" "}
          <Link href="/profile" className="text-primary hover:underline">
            profile
          </Link>.
        </p>
      </div>
    </div>
  );
}
