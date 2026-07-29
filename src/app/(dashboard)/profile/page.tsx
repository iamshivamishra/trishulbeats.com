import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { userRepository } from "@/lib/repositories/user.repository";
import { purchaseRepository } from "@/lib/repositories/purchase.repository";
import { beatRepository } from "@/lib/repositories/beat.repository";
import { beatPackRepository } from "@/lib/repositories/beat-pack.repository";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";
import { Music, ShoppingBag, Calendar, ArrowRight, Pencil, ExternalLink, Layers } from "lucide-react";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await userRepository.findById(session.user.id);
  if (!user) redirect("/login");

  const { data: purchases, total } = await purchaseRepository.findByBuyerIdPaginated(session.user.id, 1, 20);

  const beatIds = purchases.map((p) => p.beatId.toString());
  const beats = await beatRepository.findByIds(beatIds);
  const beatMap = new Map(beats.map((b) => [b._id.toString(), b]));
  const purchasedBeats = purchases.map((p) => ({
    purchase: p,
    beat: beatMap.get(p.beatId.toString()) ?? null,
  }));

  // Build pack purchase map from paginated purchases + any pack-sourced purchases
  const packPurchaseMap = new Map<string, {
    packId: string;
    purchasedAt: Date;
    tier: string;
    beatCount: number;
  }>();
  for (const purchase of purchases) {
    const packId = purchase.sourcePackId?.toString();
    if (!packId) continue;
    const existing = packPurchaseMap.get(packId);
    if (!existing) {
      packPurchaseMap.set(packId, {
        packId,
        purchasedAt: purchase.createdAt,
        tier: purchase.licenseType,
        beatCount: 1,
      });
      continue;
    }
    existing.beatCount += 1;
    if (purchase.createdAt < existing.purchasedAt) {
      existing.purchasedAt = purchase.createdAt;
    }
  }
  const purchasedPackIds = Array.from(packPurchaseMap.keys());
  const purchasedPacks = await beatPackRepository.findByIds(purchasedPackIds);
  const purchasedPackRows = purchasedPacks.map((pack) => ({
    packId: pack._id.toString(),
    title: pack.title,
    beatCount: pack.beatIds.length,
    purchasedAt: packPurchaseMap.get(pack._id.toString())?.purchasedAt ?? new Date(),
    tier: packPurchaseMap.get(pack._id.toString())?.tier ?? "basic",
  }));

  const displayName = user.displayName || user.name;
  const initials = displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const avatarSrc = user.avatarUrl || user.image;
  const isProducer = user.role === "producer" || user.role === "admin";

  return (
    <div className="page-shell max-w-4xl">
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
            <Badge variant="secondary" className="mt-2 capitalize">
              {user.role}
            </Badge>
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
                <Link href="/dashboard">
                  Dashboard <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Separator className="my-8" />

      <Card className="mb-8 rounded-2xl border-border/50 bg-card/80 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            My Beat Packs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {purchasedPackRows.length > 0 ? (
            <div className="space-y-3">
              {purchasedPackRows.map((pack) => (
                <div
                  key={pack.packId}
                  className="flex items-center justify-between rounded-lg border border-border/30 bg-background p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{pack.title}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="capitalize text-xs">
                        {pack.tier}
                      </Badge>
                      <span>{pack.beatCount} beats</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(pack.purchasedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/beat-packs/${pack.packId}`}>Open Pack</Link>
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <Layers className="mx-auto mb-2 h-8 w-8" />
              <p>No beat pack purchases yet.</p>
              <Button asChild variant="link" className="mt-2">
                <Link href="/beat-packs">Browse Beat Packs</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/50 bg-card/80 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            Purchase History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {purchasedBeats.length > 0 ? (
            <div className="space-y-3">
              {purchasedBeats.map(({ purchase, beat }) => (
                <div
                  key={purchase._id.toString()}
                  className="flex items-center justify-between rounded-lg border border-border/30 bg-background p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-primary/10">
                      {beat?.coverUrl ? (
                        <Image
                          src={beat.coverUrl}
                          alt={beat.title}
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Music className="h-5 w-5 text-primary" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {beat?.title || "Unknown Beat"}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs capitalize">
                          {purchase.licenseType}
                        </Badge>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(purchase.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">₹{purchase.amount}</p>
                    {beat && (
                      <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                        <a href={`/api/beats/${beat._id}/download`}>Download</a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {total > 20 && (
                <p className="pt-3 text-center text-xs text-muted-foreground">
                  Showing 20 of {total} purchases
                </p>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <ShoppingBag className="mx-auto mb-2 h-8 w-8" />
              <p>No purchases yet.</p>
              <Button asChild variant="link" className="mt-2">
                {/* <Link href="/beats">Browse Beats</Link> */}
                <Link href="/beat-packs">Browse Beat Packs</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
