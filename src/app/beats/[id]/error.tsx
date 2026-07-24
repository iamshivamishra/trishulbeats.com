"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function BeatDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Beat detail error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <Card className="max-w-md border-destructive/30 bg-card/80">
        <CardContent className="flex flex-col items-center p-8 text-center">
          <AlertTriangle className="mb-4 h-12 w-12 text-destructive" />
          <h2 className="text-xl font-bold">Could not load this beat</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This beat may have been removed or there was a server error.
          </p>
          <Button onClick={reset} className="mt-6">
            Try Again
          </Button>
          <Button asChild variant="outline" className="mt-3">
            <Link href="/beats">Back to Beats</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
