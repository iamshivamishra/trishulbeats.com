"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Music, Headphones, Mic2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface OnboardingFormProps {
  userName: string;
}

export default function OnboardingForm({ userName }: OnboardingFormProps) {
  const router = useRouter();
  const { update } = useSession();
  const [selected, setSelected] = useState<"buyer" | "producer" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!selected) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selected }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong");
        return;
      }

      await update({ role: selected });
      router.push("/");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-lg border-border/60 bg-card/85 shadow-sm">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
          <Music className="h-5 w-5 text-primary" />
        </div>
        <CardTitle className="text-2xl font-semibold">Welcome, {userName}!</CardTitle>
        <CardDescription>
          How do you want to use Trishul Beats? You can change this later.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div role="alert" aria-live="polite" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setSelected("buyer")}
            className={cn(
              "flex flex-col items-center gap-3 rounded-xl border-2 p-6 text-center transition-all hover:border-primary/50",
              selected === "buyer"
                ? "border-primary bg-primary/10"
                : "border-border/50 bg-background"
            )}
          >
            <div
              className={cn(
                "flex h-14 w-14 items-center justify-center rounded-full",
                selected === "buyer" ? "bg-primary/20" : "bg-muted"
              )}
            >
              <Headphones
                className={cn(
                  "h-7 w-7",
                  selected === "buyer" ? "text-primary" : "text-muted-foreground"
                )}
              />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Buyer</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Browse, preview, and license beats for your projects
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSelected("producer")}
            className={cn(
              "flex flex-col items-center gap-3 rounded-xl border-2 p-6 text-center transition-all hover:border-primary/50",
              selected === "producer"
                ? "border-primary bg-primary/10"
                : "border-border/50 bg-background"
            )}
          >
            <div
              className={cn(
                "flex h-14 w-14 items-center justify-center rounded-full",
                selected === "producer" ? "bg-primary/20" : "bg-muted"
              )}
            >
              <Mic2
                className={cn(
                  "h-7 w-7",
                  selected === "producer" ? "text-primary" : "text-muted-foreground"
                )}
              />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Producer</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Upload beats, set license prices, and earn from sales
              </p>
            </div>
          </button>
        </div>

        <Button
          className="w-full"
          size="lg"
          disabled={!selected || loading}
          onClick={handleSubmit}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Setting up...
            </>
          ) : (
            "Continue"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}




