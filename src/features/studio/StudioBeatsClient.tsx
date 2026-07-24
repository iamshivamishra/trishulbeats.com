"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Music, Upload, Play, DollarSign, BarChart3, FileText,
  Pencil, Trash2, Eye, EyeOff, Archive, MoreHorizontal,
  ChevronLeft, ChevronRight, Layers, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { IBeat, BeatStatus } from "@/types";

interface BeatWithPrice extends IBeat {
  startingPrice?: number;
  packTitle?: string | null;
}

interface Props {
  beats: BeatWithPrice[];
  stats: { total: number; published: number; drafts: number };
  earnings: number;
  pagination: {
    page: number;
    totalPages: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  currentStatus: string;
}

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Drafts" },
  { value: "archived", label: "Archived" },
];

function statusBadge(status: BeatStatus) {
  switch (status) {
    case "published":
      return <Badge className="bg-green-600/20 text-green-400 border-green-600/30">Published</Badge>;
    case "draft":
      return <Badge variant="secondary">Draft</Badge>;
    case "archived":
      return <Badge variant="outline" className="text-muted-foreground">Archived</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function StudioBeatsClient({
  beats,
  stats,
  earnings,
  pagination,
  currentStatus,
}: Props) {
  const router = useRouter();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleStatusChange = async (beatId: string, newStatus: BeatStatus) => {
    setActionLoading(beatId);
    try {
      const res = await fetch(`/api/beats/${beatId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to update status");
        return;
      }

      toast.success(
        newStatus === "published"
          ? "Beat published!"
          : newStatus === "draft"
            ? "Beat moved to drafts"
            : "Beat archived"
      );
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (beatId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      return;
    }

    setActionLoading(beatId);
    try {
      const res = await fetch(`/api/beats/${beatId}`, { method: "DELETE" });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to delete beat");
        return;
      }

      toast.success("Beat deleted");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setActionLoading(null);
    }
  };

  const navigateStatus = (status: string) => {
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    router.push(`/studio/beats?${params.toString()}`);
  };

  const navigatePage = (page: number) => {
    const params = new URLSearchParams();
    if (currentStatus !== "all") params.set("status", currentStatus);
    params.set("page", page.toString());
    router.push(`/studio/beats?${params.toString()}`);
  };

  const totalPlays = beats.reduce((sum, b) => sum + b.plays, 0);

  return (
    <div className="page-shell">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">My Beats</h1>
          <p className="text-muted-foreground">Manage, edit, and publish your beats</p>
        </div>
        <Button asChild>
          <Link href="/upload">
            <Upload className="mr-2 h-4 w-4" />
            Upload Beat
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="mb-8 grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl border-border/50 bg-card/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Total Beats</CardTitle>
            <Music className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {stats.published} published, {stats.drafts} drafts
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/50 bg-card/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Total Plays</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalPlays.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/50 bg-card/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">₹{earnings.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/50 bg-card/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Published</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.published}</p>
          </CardContent>
        </Card>
      </div>

      {/* Status tabs */}
      <div className="mb-6 flex items-center gap-1 rounded-xl border border-border/50 bg-card/60 p-1.5 w-fit shadow-sm">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => navigateStatus(tab.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              currentStatus === tab.value
                ? "bg-primary/90 text-primary-foreground"
                : "text-muted-foreground hover:bg-accent"
            }`}
          >
            {tab.label}
            {tab.value === "draft" && stats.drafts > 0 && (
              <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/20 px-1.5 text-xs">
                {stats.drafts}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Beats table */}
      {beats.length > 0 ? (
        <Card className="overflow-hidden rounded-2xl border-border/50 bg-card/80 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[50px]" />
                <TableHead>Title</TableHead>
                <TableHead className="hidden sm:table-cell">Genre</TableHead>
                <TableHead className="hidden md:table-cell">BPM</TableHead>
                <TableHead className="hidden lg:table-cell">Plays</TableHead>
                <TableHead className="hidden lg:table-cell">Sales</TableHead>
                <TableHead className="hidden md:table-cell">Pack</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Date</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {beats.map((beat) => (
                <TableRow key={beat._id.toString()} className="group">
                  {/* Artwork thumbnail */}
                  <TableCell className="py-2">
                    <div className="relative h-10 w-10 overflow-hidden rounded-md">
                      {beat.coverUrl ? (
                        <Image
                          src={beat.coverUrl}
                          alt={beat.title}
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-primary/10">
                          <Music className="h-4 w-4 text-primary/40" />
                        </div>
                      )}
                    </div>
                  </TableCell>

                  {/* Title + price */}
                  <TableCell>
                    <div>
                      <Link
                        href={`/studio/beats/${beat._id}/edit`}
                        className="font-medium hover:text-primary transition-colors"
                      >
                        {beat.title}
                      </Link>
                      {beat.startingPrice !== undefined && (
                        <p className="text-xs text-muted-foreground">
                          From ₹{beat.startingPrice}
                        </p>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="secondary" className="text-xs">{beat.genre}</Badge>
                  </TableCell>

                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {beat.bpm || "—"}
                  </TableCell>

                  <TableCell className="hidden lg:table-cell">
                    <span className="flex items-center gap-1 text-sm">
                      <Play className="h-3 w-3" />
                      {beat.plays.toLocaleString()}
                    </span>
                  </TableCell>

                  <TableCell className="hidden lg:table-cell text-sm">
                    {beat.salesCount ?? 0}
                  </TableCell>

                  <TableCell className="hidden md:table-cell">
                    {beat.packTitle ? (
                      <Link
                        href={`/studio/beat-packs/${beat.packId}/edit`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        <Layers className="h-3 w-3" />
                        <span className="max-w-[120px] truncate">{beat.packTitle}</span>
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  <TableCell>{statusBadge(beat.status)}</TableCell>

                  <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                    {formatDate(beat.createdAt)}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="py-2">
                    {actionLoading === beat._id.toString() ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => router.push(`/studio/beats/${beat._id}/edit`)}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>

                          {beat.status === "published" && (
                            <DropdownMenuItem
                              onClick={() => router.push(`/beats/${beat._id}`)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Public
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator />

                          {beat.status !== "published" && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(beat._id.toString(), "published")}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Publish
                            </DropdownMenuItem>
                          )}

                          {beat.status === "published" && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(beat._id.toString(), "draft")}
                            >
                              <EyeOff className="mr-2 h-4 w-4" />
                              Unpublish
                            </DropdownMenuItem>
                          )}

                          {beat.status !== "archived" && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(beat._id.toString(), "archived")}
                            >
                              <Archive className="mr-2 h-4 w-4" />
                              Archive
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDelete(beat._id.toString(), beat.title)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <Card className="rounded-2xl border-border/50 bg-card/60 shadow-sm">
          <CardContent className="flex flex-col items-center py-16">
            <FileText className="mb-3 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">
              {currentStatus === "all" ? "No beats yet" : `No ${currentStatus} beats`}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {currentStatus === "all"
                ? "Upload your first beat to get started."
                : "No beats match this filter."}
            </p>
            {currentStatus === "all" && (
              <Button asChild className="mt-4">
                <Link href="/upload">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Beat
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {beats.length} of {pagination.total} beats
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.hasPrev}
              onClick={() => navigatePage(pagination.page - 1)}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              {pagination.page} / {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.hasNext}
              onClick={() => navigatePage(pagination.page + 1)}
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
