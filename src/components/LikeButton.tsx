"use client";

import { useEffect, useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface LikeButtonProps {
  beatId: string;
  initialLiked: boolean;
  initialLikesCount: number;
  isLoggedIn: boolean;
  canLike: boolean;
}

export default function LikeButton({
  beatId,
  initialLiked,
  initialLikesCount,
  isLoggedIn,
  canLike,
}: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    const syncState = async () => {
      try {
        const res = await fetch(`/api/beats/${beatId}/like`, { method: "GET" });
        if (!res.ok) {
          return;
        }
        const data = (await res.json()) as { liked: boolean; likesCount: number };
        if (!cancelled) {
          setLiked(data.liked);
          setLikesCount(Math.max(0, data.likesCount));
        }
      } catch {
        // Keep initial server-rendered values when sync request fails.
      }
    };

    void syncState();

    return () => {
      cancelled = true;
    };
  }, [beatId]);

  const handleClick = () => {
    if (!isLoggedIn) {
      return;
    }

    if (!canLike) {
      toast.error("Only buyers can like beats");
      return;
    }

    const previousLiked = liked;
    const previousCount = likesCount;
    const nextLiked = !previousLiked;

    setLiked(nextLiked);
    setLikesCount(Math.max(0, previousCount + (nextLiked ? 1 : -1)));

    startTransition(async () => {
      try {
        const res = await fetch(`/api/beats/${beatId}/like`, { method: "POST" });
        if (!res.ok) {
          throw new Error("Like toggle failed");
        }

        const data = (await res.json()) as { liked: boolean; likesCount: number };
        setLiked(data.liked);
        setLikesCount(Math.max(0, data.likesCount));
      } catch {
        setLiked(previousLiked);
        setLikesCount(previousCount);
      }
    });
  };

  return (
    <Button
      type="button"
      onClick={handleClick}
      disabled={isPending || !isLoggedIn}
      variant={liked ? "default" : "outline"}
      size="sm"
      className="gap-1.5"
      aria-pressed={liked}
      title={!isLoggedIn ? "Login required to like beats" : !canLike ? "Only buyers can like beats" : undefined}
    >
      <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
      <span>{likesCount}</span>
      <span className="sr-only">{liked ? "Unlike beat" : "Like beat"}</span>
    </Button>
  );
}
