import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

import { userRepository } from "@/lib/repositories/user.repository";
import { beatRepository } from "@/lib/repositories/beat.repository";
import { purchaseRepository } from "@/lib/repositories/purchase.repository";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  Shield,
  Users,
  Music,
  ShoppingBag,
  IndianRupee,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Admin Dashboard",
};

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
}) {
  return (
    <Card className="rounded-2xl border-border/50 bg-card/80 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </CardTitle>

        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>

      <CardContent>
        <p className="text-3xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

export default async function AdminPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== "admin") {
    redirect("/");
  }

  const [
    totalUsers,
    totalBuyers,
    totalProducers,
    totalBeats,
    totalSales,
    totalRevenue,
  ] = await Promise.all([
    userRepository.countAll(),
    userRepository.countByRole("buyer"),
    userRepository.countByRole("producer"),
    beatRepository.countAll(),
    purchaseRepository.countAll(),
    purchaseRepository.getTotalRevenue(),
  ]);

  return (
    <div className="page-shell">
      {/* Header */}
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-3xl font-semibold">
          <Shield className="h-7 w-7 text-primary" />
          Admin Dashboard
        </h1>

        <p className="text-muted-foreground">
          Platform overview and analytics
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          icon={Users}
          label="Total Users"
          value={totalUsers}
        />

        <StatCard
          icon={Users}
          label="Buyers"
          value={totalBuyers}
        />

        <StatCard
          icon={Users}
          label="Producers"
          value={totalProducers}
        />

        <StatCard
          icon={Music}
          label="Total Beats"
          value={totalBeats}
        />

        <StatCard
          icon={ShoppingBag}
          label="Total Sales"
          value={totalSales}
        />

        <StatCard
          icon={IndianRupee}
          label="Total Revenue"
          value={`₹${totalRevenue.toLocaleString("en-IN")}`}
        />
      </div>
    </div>
  );
}