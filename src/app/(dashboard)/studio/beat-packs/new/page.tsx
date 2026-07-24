import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import BeatPackEditorForm from "@/features/studio/BeatPackEditorForm";

export const metadata: Metadata = {
  title: "Studio — Create Beat Pack",
};

export default async function NewBeatPackPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "producer" && session.user.role !== "admin") {
    redirect("/");
  }

  return <BeatPackEditorForm mode="create" />;
}

