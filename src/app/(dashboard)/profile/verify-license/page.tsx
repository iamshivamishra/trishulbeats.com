"use client";

import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldX, Loader2, Search } from "lucide-react";

interface VerifyResult {
  verified: boolean;
  licenseNumber?: string;
  tier?: string;
  packTitle?: string;
  buyerName?: string;
  effectiveDate?: string;
  issuedDate?: string;
  status?: string;
  reason?: string;
}

export default function VerifyLicensePage() {
  const searchParams = useSearchParams();
  const initialLicense = searchParams.get("license") ?? "";

  const [licenseNumber, setLicenseNumber] = useState(initialLicense);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleVerify = useCallback(async () => {
    const trimmed = licenseNumber.trim();
    if (!trimmed) return;

    setLoading(true);
    setResult(null);
    setError("");

    try {
      const res = await fetch(
        `/api/licenses/verify?license=${encodeURIComponent(trimmed)}`
      );
      if (res.status === 401) {
        setError("You must be logged in to verify a license.");
        return;
      }
      if (res.status === 429) {
        setError("Too many requests. Please try again later.");
        return;
      }
      const data = await res.json();
      if (!res.ok && !data.verified && data.reason) {
        setResult({ verified: false, reason: data.reason });
        return;
      }
      setResult(data);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [licenseNumber]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Verify License
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter a license number to verify its authenticity.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerify();
            }}
            className="flex gap-3"
          >
            <Input
              placeholder="TB-LIC-2026-XXXXXXXXXXXX"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              className="font-mono text-sm"
            />
            <Button type="submit" disabled={loading || !licenseNumber.trim()}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              <span className="ml-2">Verify</span>
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive/50">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card
          className={
            result.verified
              ? "border-green-500/50"
              : "border-destructive/50"
          }
        >
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              {result.verified ? (
                <>
                  <ShieldCheck className="h-5 w-5 text-green-500" />
                  <span className="text-green-600 dark:text-green-400">
                    License Verified
                  </span>
                </>
              ) : (
                <>
                  <ShieldX className="h-5 w-5 text-destructive" />
                  <span className="text-destructive">
                    Verification Failed
                  </span>
                </>
              )}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {!result.verified && result.reason && (
              <p className="text-sm text-muted-foreground">{result.reason}</p>
            )}

            {result.licenseNumber && (
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <span className="text-xs font-medium uppercase text-muted-foreground">
                    License No.
                  </span>
                  <p className="mt-0.5 font-mono">{result.licenseNumber}</p>
                </div>
                <div>
                  <span className="text-xs font-medium uppercase text-muted-foreground">
                    Tier
                  </span>
                  <p className="mt-0.5 capitalize">{result.tier}</p>
                </div>
                <div>
                  <span className="text-xs font-medium uppercase text-muted-foreground">
                    Pack
                  </span>
                  <p className="mt-0.5">{result.packTitle}</p>
                </div>
                <div>
                  <span className="text-xs font-medium uppercase text-muted-foreground">
                    Licensee
                  </span>
                  <p className="mt-0.5">{result.buyerName}</p>
                </div>
                <div>
                  <span className="text-xs font-medium uppercase text-muted-foreground">
                    Effective Date
                  </span>
                  <p className="mt-0.5">
                    {result.effectiveDate
                      ? formatDate(result.effectiveDate)
                      : "—"}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-medium uppercase text-muted-foreground">
                    Issued Date
                  </span>
                  <p className="mt-0.5">
                    {result.issuedDate
                      ? formatDate(result.issuedDate)
                      : "—"}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-xs font-medium uppercase text-muted-foreground">
                    Status
                  </span>
                  <div className="mt-1">
                    <Badge
                      variant={
                        result.status === "active" ? "default" : "secondary"
                      }
                      className="capitalize"
                    >
                      {result.status}
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
