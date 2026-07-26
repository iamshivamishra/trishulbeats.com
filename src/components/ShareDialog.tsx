"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Copy, Mail, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface ShareDialogProps {
  title: string;
  url: string;
  // Base UI's DialogTrigger uses a `render` prop, which needs a single
  // valid React element (not arbitrary ReactNode) when provided.
  children?: React.ReactElement;
}

const XIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const TelegramIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
    <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
);

interface SocialOption {
  name: string;
  icon: React.ReactNode;
  color: string;
  getUrl: (message: string, url: string) => string;
}

const SOCIAL_OPTIONS: SocialOption[] = [
  {
    name: "WhatsApp",
    icon: <WhatsAppIcon />,
    color: "bg-[#25D366] hover:bg-[#20bd5a] text-white",
    getUrl: (msg, url) => `https://wa.me/?text=${encodeURIComponent(`${msg}\n${url}`)}`,
  },
  {
    name: "X (Twitter)",
    icon: <XIcon />,
    color: "bg-black hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-black",
    getUrl: (msg, url) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(msg)}&url=${encodeURIComponent(url)}`,
  },
  {
    name: "Facebook",
    icon: <FacebookIcon />,
    color: "bg-[#1877F2] hover:bg-[#166fe5] text-white",
    getUrl: (msg, url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(msg)}`,
  },
  {
    name: "Telegram",
    icon: <TelegramIcon />,
    color: "bg-[#0088cc] hover:bg-[#007ab8] text-white",
    getUrl: (msg, url) => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(msg)}`,
  },
  {
    name: "Email",
    icon: <Mail className="h-4 w-4" />,
    color: "bg-muted hover:bg-muted/80 text-foreground border border-border/50",
    getUrl: (msg, url) => `mailto:?subject=${encodeURIComponent(msg)}&body=${encodeURIComponent(`${msg}\n\n${url}`)}`,
  },
];

export default function ShareDialog({ title, url, children }: ShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const defaultMessage = `Check out "${title}" on Trishul Beats! 🎵`;
  const [message, setMessage] = useState(defaultMessage);

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: message,
          url: url,
        });
        return true;
      } catch (error) {
        // User cancelled share operation
        return false;
      }
    }
    return false;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSocialClick = (option: SocialOption) => {
    window.open(option.getUrl(message, url), "_blank", "noopener,noreferrer");
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Share2 className="mr-1.5 h-3.5 w-3.5" />
      Share
    </Button>
  );

  return (
    <Dialog
      onOpenChange={(open) => {
        if (open) {
          setMessage(defaultMessage);
          setCopied(false);
        }
      }}
    >
      {/* Base UI's DialogTrigger takes a `render` prop (not `asChild`) */}
      <DialogTrigger render={children ?? defaultTrigger} />

      <DialogContent className="w-[92vw] max-w-md max-h-[90vh] overflow-y-auto rounded-2xl p-4 sm:p-6">
        <DialogHeader className="text-left space-y-1">
          <DialogTitle className="text-lg font-semibold">Share</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground break-words">
            Share &ldquo;{title}&rdquo; with your friends and followers.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Message input */}
          <div className="space-y-1.5">
            <label htmlFor="share-message" className="text-xs font-medium text-muted-foreground">
              Message
            </label>
            {/* text-base (16px) keeps iOS Safari from auto-zooming on focus */}
            <Input
              id="share-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a message..."
              className="text-base sm:text-sm h-10 sm:h-9"
            />
          </div>

          {/* Social media grid - stays 5-wide on phones too, with tighter, safer sizing */}
          <div className="grid grid-cols-5 gap-1 xs:gap-1.5 sm:gap-2">
            {SOCIAL_OPTIONS.map((option) => (
              <button
                key={option.name}
                type="button"
                onClick={() => handleSocialClick(option)}
                className={`flex min-w-0 flex-col items-center justify-center gap-1 sm:gap-1.5 rounded-xl p-2 sm:p-3 transition-all active:scale-95 ${option.color}`}
                title={`Share on ${option.name}`}
              >
                <span className="shrink-0 [&_svg]:h-4 [&_svg]:w-4">
                  {option.icon}
                </span>
                <span className="w-full truncate text-center text-[9px] sm:text-[10px] font-medium leading-none">
                  {option.name.split(" ")[0]}
                </span>
              </button>
            ))}
          </div>

          {/* Native Share button for Mobile Devices */}
          {typeof window !== "undefined" && typeof navigator !== "undefined" && "share" in navigator && (
            <Button
              variant="outline"
              onClick={handleNativeShare}
              className="w-full text-xs h-9 justify-center gap-2 border-dashed"
            >
              <Share2 className="h-3.5 w-3.5" /> More options (Mobile Share)
            </Button>
          )}

          {/* Copy link bar */}
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-1.5 pl-3">
            <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground select-all">
              {url}
            </span>
            <Button
              variant={copied ? "default" : "secondary"}
              size="sm"
              className="h-8 shrink-0 gap-1.5 text-xs px-3"
              onClick={handleCopyLink}
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}