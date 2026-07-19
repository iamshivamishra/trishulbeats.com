import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardRedirect() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role === "producer" || session.user.role === "admin") {
    redirect("/studio");
  }

  redirect("/profile");
}
