import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface BeatProducerCardProps {
  producer: {
    displayName?: string;
    name?: string;
    username?: string;
    avatarUrl?: string;
    image?: string;
    bio?: string;
    verified?: boolean;
    genres?: string[];
    salesCount?: number;
    followersCount?: number;
  };
}

export default function BeatProducerCard({ producer }: BeatProducerCardProps) {
  const initials = (producer.displayName || producer.name || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const profileHref = producer.username ? `/producer/${producer.username}` : "#";

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        About the Producer
      </h2>
      <Card className="border-border/50 bg-card/80">
        <CardContent className="p-4">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
            <Link href={profileHref} className="shrink-0">
              <Avatar className="h-14 w-14">
                {(producer.avatarUrl || producer.image) && (
                  <AvatarImage
                    src={producer.avatarUrl || producer.image}
                    alt={producer.displayName || producer.name}
                  />
                )}
                <AvatarFallback className="bg-primary/20 text-primary text-lg">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className="min-w-0 w-full flex-1">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <Link href={profileHref} className="font-semibold hover:text-primary">
                  {producer.displayName || producer.name}
                </Link>
                {producer.verified && (
                  <Badge className="bg-blue-500/20 text-blue-400 text-xs">Verified</Badge>
                )}
              </div>
              {producer.username && (
                <p className="text-sm text-muted-foreground">@{producer.username}</p>
              )}
              {producer.bio && (
                <p className="mt-2 text-sm text-foreground/70 line-clamp-2 break-words">
                  {producer.bio}
                </p>
              )}
              {producer.genres && producer.genres.length > 0 && (
                <div className="mt-2 flex flex-wrap justify-center gap-1 sm:justify-start">
                  {producer.genres.slice(0, 4).map((g) => (
                    <Badge key={g} variant="secondary" className="text-xs">{g}</Badge>
                  ))}
                </div>
              )}
              <div className="mt-3 flex items-center justify-center gap-4 text-xs text-muted-foreground sm:justify-start">
                <span>{producer.salesCount ?? 0} sales</span>
                <span>{producer.followersCount ?? 0} followers</span>
              </div>
            </div>
            <Button asChild variant="outline" size="sm" className="w-full shrink-0 sm:w-auto">
              <Link href={profileHref}>
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                Profile
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
