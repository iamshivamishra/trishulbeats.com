import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import CouponEditorForm from "@/features/studio/CouponEditorForm";
import { couponService } from "@/lib/services/coupon.service";
import { beatPackService } from "@/lib/services/beat-pack.service";

export const metadata: Metadata = {
  title: "Edit Coupon — Studio",
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditCouponPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "producer" && session.user.role !== "admin") {
    redirect("/");
  }

  let coupon;
  try {
    coupon = await couponService.findById(id, session.user.id);
  } catch {
    notFound();
  }

  const result = await beatPackService.listByProducer(session.user.id, {
    page: 1,
    limit: 100,
  });
  const packs = result.data.map((p) => ({
    id: p._id.toString(),
    title: p.title,
  }));

  return (
    <CouponEditorForm
      mode="edit"
      couponId={id}
      packs={packs}
      initialData={{
        code: coupon.code,
        description: coupon.description ?? "",
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        maxDiscountCap: coupon.maxDiscountCap,
        minOrderAmount: coupon.minOrderAmount,
        applicablePacks: coupon.applicablePacks.map((p) => p.toString()),
        restrictedToEmails: coupon.restrictedToEmails,
        startsAt: new Date(coupon.startsAt).toISOString(),
        expiresAt: new Date(coupon.expiresAt).toISOString(),
        maxUses: coupon.maxUses,
        maxUsesPerUser: coupon.maxUsesPerUser,
        isDraft: coupon.isDraft,
        isActive: coupon.isActive,
      }}
    />
  );
}
