import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { purchaseRepository } from "@/lib/repositories/purchase.repository";
import { beatRepository } from "@/lib/repositories/beat.repository";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Disc3, Music, ShoppingBag } from "lucide-react";
import DownloadPanel from "@/components/DownloadPanel";

export const metadata: Metadata = { title: "My Beats" };
export const dynamic = "force-dynamic";

export default async function MyBeatsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { data: purchases } = await purchaseRepository.findByBuyerIdPaginated(
    session.user.id,
    1,
    100
  );

  const individualPurchases = purchases.filter(
    (p) => p.sourceType !== "pack" || !p.sourcePackId
  );

  const beatIds = individualPurchases.map((p) => p.beatId.toString());
  const beats = await beatRepository.findByIds(beatIds);
  const beatMap = new Map(beats.map((b) => [b._id.toString(), b]));

  return (
    <div className="page-shell max-w-4xl">
      <Card className="rounded-2xl border-border/50 bg-card/80 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Disc3 className="h-5 w-5 text-primary" />
            My Beats
          </CardTitle>
        </CardHeader>
        <CardContent>
          {individualPurchases.length > 0 ? (
            <div className="space-y-4">
              {individualPurchases.map((purchase) => {
                const beat = beatMap.get(purchase.beatId.toString());
                return (
                  <div
                    key={purchase._id.toString()}
                    className="rounded-lg border border-border/30 bg-background p-4"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-primary/10">
                        {beat?.coverUrl ? (
                          <Image
                            src={beat.coverUrl}
                            alt={beat.title}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Music className="h-5 w-5 text-primary/50" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/beats/${purchase.beatId}`}
                          className="text-sm font-semibold hover:underline truncate block"
                        >
                          {beat?.title ?? "Unknown Beat"}
                        </Link>
                        <div className="mt-0.5 flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="text-xs capitalize"
                          >
                            {purchase.licenseType}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            ₹{purchase.amount.toLocaleString("en-IN")}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(purchase.createdAt).toLocaleDateString(
                              "en-IN",
                              { year: "numeric", month: "short", day: "numeric" }
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                    <DownloadPanel beatId={purchase.beatId.toString()} />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <ShoppingBag className="mx-auto mb-3 h-10 w-10" />
              <p className="font-medium">No beats purchased yet</p>
              <p className="mt-1 text-sm">Browse and purchase beats to see them here.</p>
              <Button asChild variant="link" className="mt-3">
                <Link href="/">Browse Beats</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
