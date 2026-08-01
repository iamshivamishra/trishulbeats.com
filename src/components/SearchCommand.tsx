"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function SearchCommand() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      setOpen((prev) => !prev);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/beats?search=${encodeURIComponent(query.trim())}`);
    setOpen(false);
    setQuery("");
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setOpen(true)}
        aria-label="Search beats"
      >
        <Search className="h-5 w-5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
          <DialogTitle className="sr-only">Search beats</DialogTitle>
          <form onSubmit={handleSearch} className="flex items-center border-b border-border px-4">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search beats by genre, mood, artist..."
              className="border-0 bg-transparent py-4 text-base shadow-none focus-visible:ring-0"
              autoFocus
            />
            <kbd className="hidden shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-block">
              ESC
            </kbd>
          </form>
          <div className="px-4 py-3 text-center text-sm text-muted-foreground">
            <p>Press <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[10px] font-medium">Enter</kbd> to search or <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[10px] font-medium">ESC</kbd> to close</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
