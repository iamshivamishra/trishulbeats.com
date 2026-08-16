"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Copy,
  Check,
  Pencil,
  Ban,
  Loader2,
  Rocket,
  Pause,
  Play,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { couponStatusConfig } from "@/features/studio/coupon-status";
import type { ICoupon, ICouponUsage, CouponStatus } from "@/types";

interface CouponWithStatus extends ICoupon {
  status: CouponStatus;
}

interface Props {
  coupon: CouponWithStatus;
  usages: ICouponUsage[];
  totalDiscount: number;
}

export default function CouponDetailClient({
  coupon,
  usages,
  totalDiscount,
}: Props) {
  const router = useRouter();
  const [copiedCode, setCopiedCode] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  const sc = couponStatusConfig[coupon.status];

  const handleCopy = async () => {
    await navigator.clipboard.writeText(coupon.code);
    setCopiedCode(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleStatusUpdate = async (update: Record<string, boolean>, successMsg: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/coupons/${coupon._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success(successMsg);
      router.refresh();
    } catch {
      toast.error("Failed to update coupon");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePublish = () => handleStatusUpdate({ isDraft: false }, "Coupon published");
  const handlePause = () => handleStatusUpdate({ isActive: false }, "Coupon paused");
  const handleResume = () => handleStatusUpdate({ isActive: true }, "Coupon resumed");
  const handleDeactivate = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/coupons/${coupon._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to deactivate");
      toast.success("Coupon deactivated");
      router.refresh();
    } catch {
      toast.error("Failed to deactivate");
    } finally {
      setActionLoading(false);
      setConfirmDeactivate(false);
    }
  };

  const formatDate = (d: string | Date) =>
    new Date(d).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const formatDiscount =
    coupon.discountType === "percentage"
      ? `${coupon.discountValue}%`
      : `₹${coupon.discountValue}`;

  return (
    <div className="page-shell max-w-3xl">
      <div className="mb-6">
        <Link
          href="/studio/coupons"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Coupons
        </Link>
      </div>

      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 rounded-xl bg-muted/60 px-4 py-2 font-mono text-lg font-bold tracking-wider transition-colors hover:bg-muted"
          >
            {coupon.code}
            {copiedCode ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          <Badge variant={sc.variant}>{sc.label}</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/studio/coupons/${coupon._id}/edit`}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Edit
            </Link>
          </Button>
          {coupon.status === "draft" && (
            <Button size="sm" onClick={handlePublish} disabled={actionLoading}>
              {actionLoading ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Rocket className="mr-1.5 h-3.5 w-3.5" />
              )}
              Publish
            </Button>
          )}
          {coupon.status === "active" && (
            <Button variant="outline" size="sm" onClick={handlePause} disabled={actionLoading}>
              {actionLoading ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Pause className="mr-1.5 h-3.5 w-3.5" />
              )}
              Pause
            </Button>
          )}
          {coupon.status === "paused" && (
            <Button size="sm" onClick={handleResume} disabled={actionLoading}>
              {actionLoading ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="mr-1.5 h-3.5 w-3.5" />
              )}
              Resume
            </Button>
          )}
          {(coupon.status === "active" || coupon.status === "paused") &&
            (confirmDeactivate ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-destructive">Deactivate?</span>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleDeactivate}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    "Yes"
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setConfirmDeactivate(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setConfirmDeactivate(true)}
                disabled={actionLoading}
              >
                <Ban className="mr-1.5 h-3.5 w-3.5" />
                Deactivate
              </Button>
            ))}
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card className="rounded-2xl border-border/50 bg-card/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
              Discount
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{formatDiscount}</CardContent>
        </Card>
        <Card className="rounded-2xl border-border/50 bg-card/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
              Times Used
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {coupon.currentUses}
            {coupon.maxUses > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                /{coupon.maxUses}
              </span>
            )}
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/50 bg-card/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
              Revenue Impact
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-amber-500">
            -₹{totalDiscount}
          </CardContent>
        </Card>
      </div>

      {/* Details */}
      <Card className="mb-6 rounded-2xl border-border/50 bg-card/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {coupon.description && (
              <>
                <dt className="text-muted-foreground">Description</dt>
                <dd className="col-span-1">{coupon.description}</dd>
              </>
            )}
            <dt className="text-muted-foreground">Validity</dt>
            <dd>
              {formatDate(coupon.startsAt)} – {formatDate(coupon.expiresAt)}
            </dd>
            <dt className="text-muted-foreground">Per-user limit</dt>
            <dd>{coupon.maxUsesPerUser === 0 ? "Unlimited" : coupon.maxUsesPerUser}</dd>
            {coupon.maxDiscountCap && (
              <>
                <dt className="text-muted-foreground">Max discount cap</dt>
                <dd>₹{coupon.maxDiscountCap}</dd>
              </>
            )}
            {coupon.minOrderAmount && (
              <>
                <dt className="text-muted-foreground">Min order amount</dt>
                <dd>₹{coupon.minOrderAmount}</dd>
              </>
            )}
            {coupon.restrictedToEmails.length > 0 && (
              <>
                <dt className="text-muted-foreground">Restricted to</dt>
                <dd className="flex flex-wrap gap-1">
                  {coupon.restrictedToEmails.map((e) => (
                    <Badge key={e} variant="secondary" className="text-xs">
                      {e}
                    </Badge>
                  ))}
                </dd>
              </>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Usage History */}
      <Card className="rounded-2xl border-border/50 bg-card/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Usage History</CardTitle>
        </CardHeader>
        <CardContent>
          {usages.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No uses yet.
            </p>
          ) : (
            <div className="space-y-2">
              {usages.map((u) => (
                <div
                  key={u._id?.toString()}
                  className="flex items-center justify-between rounded-lg border border-border/40 px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">Order: {u.orderId}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(u.usedAt)}
                    </p>
                  </div>
                  <span className="font-semibold text-amber-500">-₹{u.discount}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
