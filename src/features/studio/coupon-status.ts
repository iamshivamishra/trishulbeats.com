import type { CouponStatus } from "@/types";

export const couponStatusConfig: Record<
  CouponStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  draft: { label: "Draft", variant: "outline" },
  active: { label: "Active", variant: "default" },
  scheduled: { label: "Scheduled", variant: "outline" },
  paused: { label: "Paused", variant: "secondary" },
  expired: { label: "Expired", variant: "secondary" },
  exhausted: { label: "Exhausted", variant: "secondary" },
};
