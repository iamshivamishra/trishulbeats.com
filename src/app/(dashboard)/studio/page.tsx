import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import StudioDashboard from "@/features/studio/StudioDashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Studio — Trishul Beats",
  description: "Producer analytics dashboard. Track your revenue, sales, and beat performance.",
};

export default async function StudioPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "producer" && session.user.role !== "admin") {
    redirect("/");
  }

  return <StudioDashboard />;
}
