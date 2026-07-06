"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FollowButtonProps {
  producerId: string;
  initialIsFollowing: boolean;
  isLoggedIn: boolean;
}

export default function FollowButton({
  producerId,
  initialIsFollowing,
  isLoggedIn,
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleClick = () => {
    // Not logged in -> send to login instead of calling the API
    if (!isLoggedIn) {
      router.push(`/login?callbackUrl=/producer/${producerId}`);
      return;
    }

    const previousState = isFollowing;
    setIsFollowing(!previousState); // optimistic update

    startTransition(async () => {
      try {
        const res = await fetch(`/api/producers/${producerId}/follow`, {
          method: previousState ? "DELETE" : "POST",
        });

        if (!res.ok) {
          throw new Error("Follow request failed");
        }

        router.refresh(); // sync followers count shown on the page
      } catch (err) {
        // Revert optimistic update on failure
        setIsFollowing(previousState);
        console.error("Follow toggle failed:", err);
      }
    });
  };

  return (
    <Button
      onClick={handleClick}
      disabled={isPending}
      variant={isFollowing ? "outline" : "default"}
      size="sm"
      className="shrink-0"
    >
      {isFollowing ? (
        <>
          <UserCheck className="mr-1.5 h-4 w-4" />
          Following
        </>
      ) : (
        <>
          <UserPlus className="mr-1.5 h-4 w-4" />
          Follow
        </>
      )}
    </Button>
  );
}