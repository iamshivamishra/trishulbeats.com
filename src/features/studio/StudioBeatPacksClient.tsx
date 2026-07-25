"use client";

import { useState } from "react";
import Link from "next/link";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Layers, Plus, Pencil, Eye, Clock3, Trash2, Loader2 } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BeatPackUi } from "@/features/beats/beat-pack-ui";

interface Props {
  packs: BeatPackUi[];
}

export default function StudioBeatPacksClient({ packs }: Props) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const handleDelete = async (packId: string) => {
    setDeletingId(packId);
    try {
      const res = await fetch(`/api/beat-packs/${packId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete");
      }
      toast.success("Beat pack deleted");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete";
      toast.error(message);
    } finally {
      setDeletingId(null);
      setShowDeleteConfirm(null);
    }
  };

  const stats = useMemo(() => {
    const published = packs.filter((pack) => pack.status === "published").length;
    const draft = packs.filter((pack) => pack.status === "draft").length;
    const beats = packs.reduce((sum, pack) => sum + pack.beatCount, 0);
    return { total: packs.length, published, draft, beats };
  }, [packs]);

  return (
    <div className="page-shell">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Beat Packs</h1>
          <p className="text-muted-foreground">
            Group beats into collections and manage pack-level pricing tiers.
          </p>
        </div>
        <Button asChild>
          <Link href="/studio/beat-packs/new">
            <Plus className="mr-1.5 h-4 w-4" />
            Create Beat Pack
          </Link>
        </Button>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl border-border/50 bg-card/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
              Total Packs
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{stats.total}</CardContent>
        </Card>
        <Card className="rounded-2xl border-border/50 bg-card/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
              Published
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-green-500">{stats.published}</CardContent>
        </Card>
        <Card className="rounded-2xl border-border/50 bg-card/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
              Draft
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-amber-500">{stats.draft}</CardContent>
        </Card>
        <Card className="rounded-2xl border-border/50 bg-card/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
              Beats in Packs
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{stats.beats}</CardContent>
        </Card>
      </div>

      <div className="grid gap-4">
        {packs.map((pack) => (
          <Card key={pack.id} className="rounded-2xl border-border/50 bg-card/80 shadow-sm">
            <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-md border border-border/50 bg-muted/30">
                  {(pack.imageUrls?.[0] || pack.coverUrl) ? (
                    <Image
                      src={pack.imageUrls?.[0] || pack.coverUrl!}
                      alt={pack.title}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Layers className="h-4 w-4 text-muted-foreground/50" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-base font-semibold">{pack.title}</h2>
                  <Badge variant={pack.status === "published" ? "default" : "secondary"}>
                    {pack.status}
                  </Badge>
                  <Badge variant="outline">{pack.beatCount} beats</Badge>
                </div>
                <p className="line-clamp-1 text-sm text-muted-foreground">{pack.description}</p>
                <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock3 className="h-3.5 w-3.5" />
                  {pack.updatedAtLabel}
                </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {showDeleteConfirm === pack.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-destructive">Delete this pack?</span>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(pack.id)} disabled={deletingId === pack.id}>
                      {deletingId === pack.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Yes, delete"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowDeleteConfirm(null)}>Cancel</Button>
                  </div>
                ) : (
                  <>
                    {pack.status === "published" ? (
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/beat-packs/${pack.id}`}>
                          <Eye className="mr-1.5 h-3.5 w-3.5" />
                          Preview
                        </Link>
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" disabled>
                        <Eye className="mr-1.5 h-3.5 w-3.5" />
                        Draft
                      </Button>
                    )}
                    <Button size="sm" onClick={() => router.push(`/studio/beat-packs/${pack.id}/edit`)}>
                      <Pencil className="mr-1.5 h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setShowDeleteConfirm(pack.id)}
                      disabled={deletingId === pack.id}
                    >
                      {deletingId === pack.id ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

    </div>
  );
}

