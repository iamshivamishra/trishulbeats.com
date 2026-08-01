"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  ShoppingCart, Trash2, ArrowLeft, Music, Loader2,
  CreditCard, ArrowRight, CheckCircle2,
} from "lucide-react";
import { loadRazorpayScript } from "@/components/RazorpayButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCart } from "@/components/CartProvider";
import { tierAccent } from "@/lib/license-ui";
import { packCartApi } from "@/lib/api/pack-cart";
import type { BeatPackCartItemPopulated, CartItemPopulated, ILicense } from "@/types";

function CartItemRow({
  item,
  onRemove,
  onUpdateLicense,
  removing,
  licenses,
  loadingLicenses,
}: {
  item: CartItemPopulated;
  onRemove: () => void;
  onUpdateLicense: (licenseId: string) => void;
  removing: boolean;
  licenses: ILicense[];
  loadingLicenses: boolean;
}) {

  return (
    <div className="flex gap-4 py-4">
      {/* Artwork */}
      <Link href={`/beats/${item.beatId}`} className="shrink-0">
        <div className="relative h-20 w-20 overflow-hidden rounded-lg">
          {item.beatCoverUrl ? (
            <Image
              src={item.beatCoverUrl}
              alt={item.beatTitle}
              fill
              className="object-cover"
              sizes="80px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-primary/10">
              <Music className="h-8 w-8 text-primary/30" />
            </div>
          )}
        </div>
      </Link>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <Link href={`/beats/${item.beatId}`} className="font-semibold hover:text-primary truncate block">
          {item.beatTitle}
        </Link>
        <p className="text-xs text-muted-foreground">
          by {item.producerName}
        </p>
        <Badge variant="secondary" className="mt-1 text-xs">
          {item.beatGenre}
        </Badge>

        {/* License selector */}
        <div className="mt-2">
          {loadingLicenses ? (
            <Skeleton className="h-8 w-32" />
          ) : licenses.length > 0 ? (
            <Select
              value={item.licenseId}
              onValueChange={(v) => v && onUpdateLicense(v)}
            >
              <SelectTrigger className="h-8 w-full max-w-[200px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {licenses.filter((l) => l.isActive).map((lic) => (
                  <SelectItem key={lic._id.toString()} value={lic._id.toString()}>
                    {lic.name} — ₹{lic.price.toLocaleString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-xs text-muted-foreground">
              {item.licenseName}
            </p>
          )}
        </div>
      </div>

      {/* Price + remove */}
      <div className="flex flex-col items-end justify-between">
        <p className={`text-lg font-bold ${tierAccent(item.licenseType)}`}>
          ₹{item.price.toLocaleString()}
        </p>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:bg-destructive/10"
          onClick={onRemove}
          disabled={removing}
          aria-label={`Remove ${item.beatTitle} from cart`}
        >
          {removing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

export default function CartClient() {
  const { data: session } = useSession();
  const { items, count, total, loading, removeItem, updateLicense, clearCart, refresh } = useCart();
  const router = useRouter();
  const [packItems, setPackItems] = useState<BeatPackCartItemPopulated[]>([]);
  const [loadingPackItems, setLoadingPackItems] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removingPackId, setRemovingPackId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  const [licensesMap, setLicensesMap] = useState<Record<string, ILicense[]>>({});
  const [loadingLicenses, setLoadingLicenses] = useState(false);

  const isGuest = !session?.user;
  const packTotal = packItems.reduce((sum, item) => sum + item.price, 0);
  const overallTotal = total + packTotal;
  const overallCount = count + packItems.length;

  useEffect(() => {
    const fetchPackItems = async () => {
      if (isGuest) {
        setPackItems([]);
        setLoadingPackItems(false);
        return;
      }
      try {
        setLoadingPackItems(true);
        const response = await packCartApi.get();
        setPackItems(response.items);
      } catch {
        setPackItems([]);
      } finally {
        setLoadingPackItems(false);
      }
    };
    fetchPackItems();
  }, [isGuest]);

  // Batch-fetch licenses for all cart items at once
  useEffect(() => {
    if (items.length === 0) {
      setLicensesMap({});
      return;
    }

    const fetchAllLicenses = async () => {
      setLoadingLicenses(true);
      const beatIds = items.map((i) => i.beatId);
      const results: Record<string, ILicense[]> = {};

      await Promise.all(
        beatIds.map(async (beatId) => {
          try {
            const res = await fetch(`/api/beats/${beatId}/licenses`);
            if (res.ok) {
              const data = await res.json();
              results[beatId] = data.licenses;
            }
          } catch {
            /* ignore */
          }
        })
      );

      setLicensesMap(results);
      setLoadingLicenses(false);
    };

    fetchAllLicenses();
  }, [items]);

  const handleRemove = async (beatId: string) => {
    setRemovingId(beatId);
    await removeItem(beatId);
    setRemovingId(null);
  };

  const handleClear = async () => {
    setClearing(true);
    await clearCart();
    if (!isGuest) {
      await fetch("/api/cart/packs", { method: "DELETE" }).catch(() => {});
      setPackItems([]);
    }
    setClearing(false);
  };

  const handleRemovePack = async (packId: string) => {
    setRemovingPackId(packId);
    try {
      await packCartApi.remove(packId);
      const response = await packCartApi.get();
      setPackItems(response.items);
      toast.success("Pack removed from cart");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not remove pack";
      toast.error(message);
    } finally {
      setRemovingPackId(null);
    }
  };

  const handleUpdateLicense = async (beatId: string, licenseId: string) => {
    await updateLicense(beatId, licenseId);
  };

  const handleCheckout = async () => {
    setCheckingOut(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error("Failed to load payment gateway");
        return;
      }

      const hasPackItems = packItems.length > 0;
      const res = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          hasPackItems
            ? { fromCart: true, includePackCart: true }
            : { fromCart: true }
        ),
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
        description: `${overallCount} ${overallCount === 1 ? "item" : "items"} — Trishul Beats`,
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
              setCheckoutSuccess(true);
              toast.success("Payment successful! Beats purchased.");
              await refresh();
              router.refresh();
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
      setCheckingOut(false);
    }
  };

  if (loading) {
    return (
      <div className="page-shell max-w-4xl">
        <h1 className="mb-8 text-3xl font-bold">Your Cart</h1>
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <Card className="border-border/50 bg-card/80">
            <CardContent className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-20 w-20 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/3" />
                    <Skeleton className="h-8 w-32" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </CardContent>
          </Card>
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell max-w-4xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Your Cart</h1>
          <p className="mt-1 text-muted-foreground">
            {overallCount === 0
              ? "Your cart is empty"
              : `${overallCount} ${overallCount === 1 ? "item" : "items"} in your cart`}
          </p>
        </div>
        {overallCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={clearing}
            className="text-destructive hover:text-destructive"
          >
            {clearing ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-1.5 h-4 w-4" />
            )}
            Clear Cart
          </Button>
        )}
      </div>

      {count === 0 && packItems.length === 0 && !loadingPackItems ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ShoppingCart className="mb-4 h-16 w-16 text-muted-foreground/30" />
          <p className="text-lg font-medium">No items in your cart</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse beats or beat packs and add what you love.
          </p>
          <Button asChild className="mt-6" size="lg">
            <Link href="/beats">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Browse Beats
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Items list */}
          <Card className="border-border/50 bg-card/80">
            <CardContent className="divide-y divide-border/50 p-4 sm:p-6">
              {packItems.map((item) => (
                <div key={`pack-${item.packId}`} className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-semibold">{item.packTitle}</p>
                    <p className="text-xs text-muted-foreground">
                      Beat Pack • {item.beatCount} beats • by {item.producerName}
                    </p>
                    <Badge variant="outline" className="mt-1 text-xs capitalize">
                      {item.tier} tier
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-bold text-primary">₹{item.price.toLocaleString()}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemovePack(item.packId)}
                      disabled={removingPackId === item.packId}
                    >
                      {removingPackId === item.packId ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}

              {items.map((item) => (
                <CartItemRow
                  key={item.beatId}
                  item={item}
                  onRemove={() => handleRemove(item.beatId)}
                  onUpdateLicense={(licenseId) =>
                    handleUpdateLicense(item.beatId, licenseId)
                  }
                  removing={removingId === item.beatId}
                  licenses={licensesMap[item.beatId] || []}
                  loadingLicenses={loadingLicenses}
                />
              ))}
            </CardContent>
          </Card>

          {/* Summary */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <Card className="border-border/50 bg-card/80">
              <CardHeader>
                <CardTitle className="text-lg">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  {packItems.map((item) => (
                    <div key={`summary-pack-${item.packId}`} className="flex justify-between">
                      <span className="truncate pr-2 text-muted-foreground">
                        {item.packTitle} ({item.tier})
                      </span>
                      <span className="shrink-0 font-medium">
                        ₹{item.price.toLocaleString()}
                      </span>
                    </div>
                  ))}
                  {items.map((item) => (
                    <div key={item.beatId} className="flex justify-between">
                      <span className="truncate pr-2 text-muted-foreground">
                        {item.beatTitle}
                      </span>
                      <span className="shrink-0 font-medium">
                        ₹{item.price.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="flex justify-between text-base font-bold">
                  <span>Total</span>
                  <span className="text-primary">
                    ₹{overallTotal.toLocaleString()}
                  </span>
                </div>

                {checkoutSuccess ? (
                  <div className="space-y-3 text-center">
                    <CheckCircle2 className="mx-auto h-10 w-10 text-green-400" />
                    <p className="font-medium text-green-400">
                      Purchase complete!
                    </p>
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/profile">View Purchases</Link>
                    </Button>
                  </div>
                ) : isGuest ? (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground text-center">
                      Sign in to proceed to checkout. Your cart will be saved.
                    </p>
                    <Button asChild className="w-full" size="lg">
                      <Link href="/login">
                        Sign in to Checkout
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={handleCheckout}
                      disabled={checkingOut}
                    >
                      {checkingOut ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating order...
                        </>
                      ) : (
                        <>
                          <CreditCard className="mr-2 h-4 w-4" />
                          Checkout — ₹{overallTotal.toLocaleString()}
                        </>
                      )}
                    </Button>
                  </div>
                )}

                <Button asChild variant="ghost" size="sm" className="w-full">
                  <Link href="/beats">
                    <ArrowLeft className="mr-1.5 h-4 w-4" />
                    Continue Shopping Beats
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="sm" className="w-full">
                  <Link href="/beat-packs">
                    <ArrowLeft className="mr-1.5 h-4 w-4" />
                    Continue Shopping Packs
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
