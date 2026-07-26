import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import OnboardingForm from "./OnboardingForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Choose Your Role",
  robots: { index: false, follow: true },
};

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="app-container flex min-h-[calc(100vh-8rem)] items-center justify-center py-10">
      <OnboardingForm userName={session.user.name || "there"} />
    </div>
  );
}
