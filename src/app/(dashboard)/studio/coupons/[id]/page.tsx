import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import CouponDetailClient from "@/features/studio/CouponDetailClient";
import { couponService } from "@/lib/services/coupon.service";

export const metadata: Metadata = {
  title: "Coupon Details — Studio",
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CouponDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "producer" && session.user.role !== "admin") {
    redirect("/");
  }

  let data;
  try {
    data = await couponService.getAnalytics(id, session.user.id);
  } catch {
    notFound();
  }

  return (
    <CouponDetailClient
      coupon={JSON.parse(JSON.stringify(data.coupon))}
      usages={JSON.parse(JSON.stringify(data.usages))}
      totalDiscount={data.totalDiscount}
    />
  );
}
