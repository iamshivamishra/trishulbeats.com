"use client";

import { useState, useEffect } from "react";
import {
  Download, FileAudio, FileArchive, Music, Lock,
  Loader2, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface FileEntitlement {
  type: "preview" | "master" | "stems";
  label: string;
  available: boolean;
  reason?: string;
}

interface Entitlements {
  beatId: string;
  beatTitle: string;
  licenseType: string;
  licenseName: string;
  files: FileEntitlement[];
}

interface Props {
  beatId: string;
}

function fileIcon(type: string) {
  switch (type) {
    case "preview": return <Music className="h-5 w-5" />;
    case "master": return <FileAudio className="h-5 w-5" />;
    case "stems": return <FileArchive className="h-5 w-5" />;
    default: return <Download className="h-5 w-5" />;
  }
}

function fileColorClass(type: string) {
  switch (type) {
    case "preview": return "text-blue-400";
    case "master": return "text-green-400";
    case "stems": return "text-violet-400";
    default: return "text-primary";
  }
}

export default function DownloadPanel({ beatId }: Props) {
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  const fetchEntitlements = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch(`/api/beats/${beatId}/download-links`);
      if (res.ok) {
        setEntitlements(await res.json());
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEntitlements();
  }, [beatId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDownload = async (file: FileEntitlement) => {
    if (!file.available) return;

    setDownloading(file.type);
    try {
      const res = await fetch(
        `/api/beats/${beatId}/download?type=${file.type}&json=true`
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate download link");
      }

      const { url } = await res.json();
      window.open(url, "_blank");
      toast.success(`Downloading ${file.label}...`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    } finally {
      setTimeout(() => setDownloading(null), 1000);
    }
  };

  if (loading) {
    return (
      <Card className="border-green-500/20 bg-green-500/5">
        <CardContent className="p-4 space-y-3">
          <Skeleton className="h-5 w-32" />
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!entitlements) return null;

  return (
    <Card className="border-green-500/20 bg-green-500/5">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Your Downloads</h3>
            <p className="text-xs text-muted-foreground">
              {entitlements.licenseName} License
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => fetchEntitlements(true)}
            disabled={refreshing}
            title="Refresh download info"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <div className="space-y-2">
          {entitlements.files.map((file) => (
            <div
              key={file.type}
              className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                file.available
                  ? "border-green-500/20 bg-green-500/5 hover:bg-green-500/10 cursor-pointer"
                  : "border-border/30 bg-muted/5 opacity-60"
              }`}
              onClick={() => file.available && handleDownload(file)}
              role={file.available ? "button" : undefined}
              tabIndex={file.available ? 0 : undefined}
              onKeyDown={(e) => {
                if (file.available && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  handleDownload(file);
                }
              }}
            >
              <div className={`shrink-0 ${file.available ? fileColorClass(file.type) : "text-muted-foreground"}`}>
                {file.available ? fileIcon(file.type) : <Lock className="h-5 w-5" />}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{file.label}</p>
                {!file.available && file.reason && (
                  <p className="text-xs text-muted-foreground">{file.reason}</p>
                )}
              </div>

              {file.available ? (
                <div className="shrink-0">
                  {downloading === file.type ? (
                    <Loader2 className="h-4 w-4 animate-spin text-green-400" />
                  ) : (
                    <Download className="h-4 w-4 text-green-400" />
                  )}
                </div>
              ) : (
                <Badge variant="outline" className="shrink-0 text-xs">
                  Locked
                </Badge>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
