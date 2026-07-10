import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LayoutDashboard, Users, Music, ShoppingBag } from "lucide-react";
import { auth } from "@/lib/auth";

const navItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/beats", label: "Beats", icon: Music },
  { href: "/admin/sales", label: "Sales", icon: ShoppingBag },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") notFound();

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-border/50 bg-[#0d0d0d] p-4">
        <h2 className="mb-6 px-2 text-lg font-bold">Admin</h2>
        <nav className="space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}