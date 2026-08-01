import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { userRepository } from "@/lib/repositories/user.repository";
import { purchaseRepository } from "@/lib/repositories/purchase.repository";
import { orderRepository } from "@/lib/repositories/order.repository";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowRight,
  Calendar,
  CreditCard,
  Disc3,
  ExternalLink,
  IndianRupee,
  Package,
  Pencil,
  Receipt,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await userRepository.findById(session.user.id);
  if (!user) redirect("/login");

  const { data: purchases, total: totalPurchases } =
    await purchaseRepository.findByBuyerIdPaginated(session.user.id, 1, 500);

  const orders = await orderRepository.findByBuyer(session.user.id);
  const paidOrders = orders.filter((o) => o.status === "paid");

  // Analytics
  const totalSpent = paidOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalTransactions = paidOrders.length;

  const individualBeats = purchases.filter(
    (p) => p.sourceType !== "pack" || !p.sourcePackId
  );

  const packIds = new Set<string>();
  for (const p of purchases) {
    if (p.sourceType === "pack" && p.sourcePackId)
      packIds.add(p.sourcePackId.toString());
  }

  const licenseCounts = { basic: 0, premium: 0, unlimited: 0 };
  for (const p of purchases) {
    const key = p.licenseType as keyof typeof licenseCounts;
    if (key in licenseCounts) licenseCounts[key]++;
  }
  const dominantLicense =
    (Object.entries(licenseCounts) as [string, number][])
      .sort((a, b) => b[1] - a[1])
      .find(([, count]) => count > 0)?.[0] ?? null;

  // Recent activity (last 5 paid orders)
  const recentOrders = paidOrders.slice(0, 5);

  const memberSince = new Date(user.createdAt).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
  });

  const displayName = user.displayName || user.name;
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const avatarSrc = user.avatarUrl || user.image;
  const isProducer = user.role === "producer" || user.role === "admin";

  const stats = [
    {
      label: "Total Spent",
      value: `₹${totalSpent.toLocaleString("en-IN")}`,
      icon: IndianRupee,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      label: "Beats Owned",
      value: String(individualBeats.length),
      icon: Disc3,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      href: "/profile/beats",
    },
    {
      label: "Packs Owned",
      value: String(packIds.size),
      icon: Package,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      href: "/profile/packs",
    },
    {
      label: "Transactions",
      value: String(totalTransactions),
      icon: Receipt,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
      href: "/profile/transactions",
    },
  ];

  return (
    <div className="page-shell max-w-4xl">
      {/* Profile card */}
      <Card className="rounded-2xl border-border/50 bg-card/80 shadow-sm">
        <CardContent className="flex flex-col items-center gap-4 p-6 sm:flex-row">
          <Avatar className="h-20 w-20">
            {avatarSrc && <AvatarImage src={avatarSrc} alt={displayName} />}
            <AvatarFallback className="bg-primary/20 text-2xl text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-semibold">{displayName}</h1>
            {user.username && (
              <p className="text-sm text-muted-foreground">@{user.username}</p>
            )}
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="capitalize">
                {user.role}
              </Badge>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                Member since {memberSince}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/profile/edit">
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Edit Profile
              </Link>
            </Button>
            {isProducer && user.username && (
              <Button asChild variant="ghost" size="sm">
                <Link href={`/producer/${user.username}`}>
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  View Public
                </Link>
              </Button>
            )}
            {isProducer && (
              <Button asChild variant="outline" size="sm">
                <Link href="/studio">
                  Studio <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats grid */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => {
          const inner = (
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${stat.bgColor}`}
              >
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xl font-bold leading-none">{stat.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {stat.label}
                </p>
              </div>
            </div>
          );

          return stat.href ? (
            <Link key={stat.label} href={stat.href}>
              <Card className="rounded-xl border-border/40 bg-card/80 p-4 transition-colors hover:border-primary/30 hover:bg-primary/5">
                {inner}
              </Card>
            </Link>
          ) : (
            <Card
              key={stat.label}
              className="rounded-xl border-border/40 bg-card/80 p-4"
            >
              {inner}
            </Card>
          );
        })}
      </div>

      {/* Two-column section: License breakdown + recent activity */}
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {/* License breakdown */}
        <Card className="rounded-2xl border-border/50 bg-card/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-primary" />
              License Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {totalPurchases > 0 ? (
              <div className="space-y-3">
                {(
                  [
                    {
                      tier: "basic",
                      label: "Basic",
                      count: licenseCounts.basic,
                      color: "bg-blue-500",
                    },
                    {
                      tier: "premium",
                      label: "Premium",
                      count: licenseCounts.premium,
                      color: "bg-purple-500",
                    },
                    {
                      tier: "unlimited",
                      label: "Unlimited",
                      count: licenseCounts.unlimited,
                      color: "bg-amber-500",
                    },
                  ] as const
                ).map((item) => {
                  const pct =
                    totalPurchases > 0
                      ? Math.round((item.count / totalPurchases) * 100)
                      : 0;
                  return (
                    <div key={item.tier}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium">{item.label}</span>
                        <span className="text-muted-foreground">
                          {item.count}{" "}
                          <span className="text-xs">({pct}%)</span>
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted/50">
                        <div
                          className={`h-full rounded-full ${item.color} transition-all`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {dominantLicense && (
                  <p className="pt-2 text-xs text-muted-foreground">
                    Most purchased:{" "}
                    <span className="font-medium capitalize text-foreground">
                      {dominantLicense}
                    </span>
                  </p>
                )}
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No purchases yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card className="rounded-2xl border-border/50 bg-card/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentOrders.length > 0 ? (
              <div className="space-y-3">
                {recentOrders.map((order) => {
                  const dateStr = new Date(
                    order.paidAt || order.createdAt
                  ).toLocaleDateString("en-IN", {
                    month: "short",
                    day: "numeric",
                  });
                  const firstItem = order.items[0];
                  const label =
                    order.items.length === 1
                      ? firstItem?.beatTitle ?? "Order"
                      : `${order.items.length} items`;
                  const typeLabel =
                    firstItem?.sourceType === "pack"
                      ? "Pack"
                      : firstItem?.sourceType === "upgrade"
                        ? "Upgrade"
                        : "Beat";

                  return (
                    <div
                      key={order._id.toString()}
                      className="flex items-center gap-3"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <CreditCard className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{label}</p>
                        <p className="text-xs text-muted-foreground">
                          {typeLabel} · {dateStr}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold">
                        ₹{order.totalAmount.toLocaleString("en-IN")}
                      </p>
                    </div>
                  );
                })}
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="mt-1 w-full text-xs"
                >
                  <Link href="/profile/transactions">
                    View all transactions
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No activity yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick navigation */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          {
            href: "/profile/beats",
            icon: Disc3,
            label: "My Beats",
            desc: "Download your purchased beats",
            color: "text-blue-500",
            bg: "bg-blue-500/10",
          },
          {
            href: "/profile/packs",
            icon: Package,
            label: "My Packs",
            desc: "View packs & upgrade licenses",
            color: "text-purple-500",
            bg: "bg-purple-500/10",
          },
          {
            href: "/profile/transactions",
            icon: Receipt,
            label: "Transactions",
            desc: "Receipts & payment history",
            color: "text-amber-500",
            bg: "bg-amber-500/10",
          },
        ].map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="group rounded-xl border-border/40 bg-card/80 p-4 transition-all hover:border-primary/30 hover:bg-primary/5 hover:shadow-md">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.bg}`}
                >
                  <item.icon className={`h-5 w-5 ${item.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold group-hover:text-primary transition-colors">
                    {item.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
