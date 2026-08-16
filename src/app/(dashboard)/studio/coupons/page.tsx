import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import StudioCouponsClient from "@/features/studio/StudioCouponsClient";
import { couponService } from "@/lib/services/coupon.service";

export const metadata: Metadata = {
  title: "Studio — Coupons",
};

export default async function StudioCouponsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "producer" && session.user.role !== "admin") {
    redirect("/");
  }

  const coupons = await couponService.listByProducer(session.user.id);

  return <StudioCouponsClient coupons={JSON.parse(JSON.stringify(coupons))} />;
}
