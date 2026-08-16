"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Ticket,
  Copy,
  Check,
  Eye,
  Loader2,
  Ban,
  Rocket,
  Pause,
  Play,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { couponStatusConfig } from "@/features/studio/coupon-status";
import type { ICoupon, CouponStatus } from "@/types";

interface CouponWithStatus extends ICoupon {
  status: CouponStatus;
}

interface Props {
  coupons: CouponWithStatus[];
}

export default function StudioCouponsClient({ coupons }: Props) {
  const router = useRouter();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState<string | null>(null);

  const stats = useMemo(() => {
    const active = coupons.filter((c) => c.status === "active").length;
    const totalUsage = coupons.reduce((sum, c) => sum + c.currentUses, 0);
    return { total: coupons.length, active, totalUsage };
  }, [coupons]);

  const handleCopy = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleStatusAction = async (
    id: string,
    action: "publish" | "pause" | "resume" | "deactivate"
  ) => {
    setActionId(id);
    try {
      if (action === "deactivate") {
        const res = await fetch(`/api/coupons/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to deactivate");
        toast.success("Coupon deactivated");
      } else {
        const update =
          action === "publish"
            ? { isDraft: false }
            : action === "pause"
              ? { isActive: false }
              : { isActive: true };
        const res = await fetch(`/api/coupons/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(update),
        });
        if (!res.ok) throw new Error(`Failed to ${action}`);
        const labels = { publish: "published", pause: "paused", resume: "resumed" };
        toast.success(`Coupon ${labels[action]}`);
      }
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : `Failed to ${action}`;
      toast.error(message);
    } finally {
      setActionId(null);
      setConfirmDeactivate(null);
    }
  };

  const formatDiscount = (c: CouponWithStatus) =>
    c.discountType === "percentage" ? `${c.discountValue}%` : `₹${c.discountValue}`;

  const formatDate = (d: string | Date) =>
    new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="page-shell">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Coupons</h1>
          <p className="text-muted-foreground">
            Create discount codes for your beat packs.
          </p>
        </div>
        <Button asChild>
          <Link href="/studio/coupons/new">
            <Plus className="mr-1.5 h-4 w-4" />
            Create Coupon
          </Link>
        </Button>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card className="rounded-2xl border-border/50 bg-card/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
              Total Coupons
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{stats.total}</CardContent>
        </Card>
        <Card className="rounded-2xl border-border/50 bg-card/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
              Active
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-green-500">{stats.active}</CardContent>
        </Card>
        <Card className="rounded-2xl border-border/50 bg-card/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
              Total Uses
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{stats.totalUsage}</CardContent>
        </Card>
      </div>

      {coupons.length === 0 ? (
        <Card className="rounded-2xl border-border/50 bg-card/80 py-16 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Ticket className="h-7 w-7 text-primary" />
            </div>
            <h3 className="mb-1 text-lg font-semibold">No coupons yet</h3>
            <p className="mb-6 max-w-sm text-sm text-muted-foreground">
              Create your first coupon code to offer discounts on your beat packs and boost sales.
            </p>
            <Button asChild>
              <Link href="/studio/coupons/new">
                <Plus className="mr-1.5 h-4 w-4" />
                Create Your First Coupon
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {coupons.map((coupon) => {
            const sc = couponStatusConfig[coupon.status];
            return (
              <Card key={coupon._id.toString()} className="rounded-2xl border-border/50 bg-card/80 shadow-sm">
                <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handleCopy(coupon.code)}
                        className="flex items-center gap-1.5 rounded-lg bg-muted/60 px-2.5 py-1 font-mono text-sm font-semibold tracking-wider transition-colors hover:bg-muted"
                        title="Click to copy"
                      >
                        {coupon.code}
                        {copiedCode === coupon.code ? (
                          <Check className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </button>
                      <Badge variant={sc.variant}>{sc.label}</Badge>
                      <Badge variant="outline">{formatDiscount(coupon)} off</Badge>
                    </div>
                    {coupon.description && (
                      <p className="line-clamp-1 text-sm text-muted-foreground">
                        {coupon.description}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(coupon.startsAt)} – {formatDate(coupon.expiresAt)}
                      {coupon.maxUses > 0 && (
                        <span className="ml-2">
                          · {coupon.currentUses}/{coupon.maxUses} used
                        </span>
                      )}
                      {coupon.maxUses === 0 && (
                        <span className="ml-2">· {coupon.currentUses} used (unlimited)</span>
                      )}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {confirmDeactivate === coupon._id.toString() ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-destructive">Deactivate?</span>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleStatusAction(coupon._id.toString(), "deactivate")}
                          disabled={actionId === coupon._id.toString()}
                        >
                          {actionId === coupon._id.toString() ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            "Yes"
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setConfirmDeactivate(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/studio/coupons/${coupon._id.toString()}`}>
                            <Eye className="mr-1.5 h-3.5 w-3.5" />
                            Details
                          </Link>
                        </Button>
                        {coupon.status === "draft" && (
                          <Button
                            size="sm"
                            onClick={() => handleStatusAction(coupon._id.toString(), "publish")}
                            disabled={actionId === coupon._id.toString()}
                          >
                            {actionId === coupon._id.toString() ? (
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Rocket className="mr-1.5 h-3.5 w-3.5" />
                            )}
                            Publish
                          </Button>
                        )}
                        {coupon.status === "active" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusAction(coupon._id.toString(), "pause")}
                            disabled={actionId === coupon._id.toString()}
                          >
                            <Pause className="mr-1.5 h-3.5 w-3.5" />
                            Pause
                          </Button>
                        )}
                        {coupon.status === "paused" && (
                          <Button
                            size="sm"
                            onClick={() => handleStatusAction(coupon._id.toString(), "resume")}
                            disabled={actionId === coupon._id.toString()}
                          >
                            <Play className="mr-1.5 h-3.5 w-3.5" />
                            Resume
                          </Button>
                        )}
                        {(coupon.status === "active" || coupon.status === "paused") && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setConfirmDeactivate(coupon._id.toString())}
                          >
                            <Ban className="mr-1.5 h-3.5 w-3.5" />
                            Deactivate
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
