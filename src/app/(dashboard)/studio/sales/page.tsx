import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import SalesClient from "@/features/studio/SalesClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sales History — Studio",
  description: "View your complete sales history and earnings.",
};

export default async function SalesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "producer" && session.user.role !== "admin") {
    redirect("/");
  }

  return <SalesClient />;
}
