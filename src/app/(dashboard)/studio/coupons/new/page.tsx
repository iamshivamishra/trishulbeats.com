import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import CouponEditorForm from "@/features/studio/CouponEditorForm";
import { beatPackService } from "@/lib/services/beat-pack.service";

export const metadata: Metadata = {
  title: "Create Coupon — Studio",
};

export default async function NewCouponPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "producer" && session.user.role !== "admin") {
    redirect("/");
  }

  const result = await beatPackService.listByProducer(session.user.id, {
    page: 1,
    limit: 100,
  });
  const packs = result.data.map((p) => ({
    id: p._id.toString(),
    title: p.title,
  }));

  return <CouponEditorForm mode="create" packs={packs} />;
}
