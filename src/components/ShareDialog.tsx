"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ShareDialogProps {
  title: string;
  url: string;
  children?: React.ReactElement;
}

const XIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const TelegramIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
    <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
);

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM12 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
  </svg>
);

interface SocialOption {
  name: string;
  icon: React.ReactNode;
  bg: string;
  getUrl?: (message: string, url: string) => string;
  isInstagram?: boolean;
}

const SOCIAL_OPTIONS: SocialOption[] = [
  {
    name: "WhatsApp",
    icon: <WhatsAppIcon />,
    bg: "#25D366",
    getUrl: (msg, url) => `https://wa.me/?text=${encodeURIComponent(`${msg}\n${url}`)}`,
  },
  {
    name: "X",
    icon: <XIcon />,
    bg: "#000000",
    getUrl: (msg, url) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(msg)}&url=${encodeURIComponent(url)}`,
  },
  {
    name: "Facebook",
    icon: <FacebookIcon />,
    bg: "#1877F2",
    getUrl: (msg, url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(msg)}`,
  },
  {
    name: "Telegram",
    icon: <TelegramIcon />,
    bg: "#0088cc",
    getUrl: (msg, url) => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(msg)}`,
  },
  {
    name: "Instagram",
    icon: <InstagramIcon />,
    bg: "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)",
    isInstagram: true,
  },
];

export default function ShareDialog({ title, url, children }: ShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const defaultMessage = `Check out "${title}" on Trishul Beats! 🎵`;
  const [message, setMessage] = useState(defaultMessage);

  const handleNativeShare = () => {
    if (navigator.share) {
      navigator.share({ title, text: message, url }).catch(() => {});
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${message}\n${url}`);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSocialClick = (option: SocialOption) => {
    const shareMessage = message.trim() || defaultMessage;

    // Instagram doesn't support a web share URL with prefilled text/link,
    // so copy the message+link and open Instagram for the user to paste it.
    if (option.isInstagram) {
      navigator.clipboard.writeText(`${shareMessage}\n${url}`);
      toast.success("Link copied! Paste it in your Instagram DM or story.");

      const isMobile = /iphone|ipad|ipod|android/i.test(
        typeof navigator !== "undefined" ? navigator.userAgent : "",
      );

      if (isMobile) {
        // Try opening the Instagram app directly; falls back to the web app.
        window.location.href = "instagram://app";
        setTimeout(() => {
          window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
        }, 500);
      } else {
        window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
      }
      return;
    }

    if (option.getUrl) {
      window.open(option.getUrl(shareMessage, url), "_blank", "noopener,noreferrer");
    }
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
          setCopied(false);
          setMessage(defaultMessage);
        }
      }}
    >
      <DialogTrigger render={children ?? defaultTrigger} />

      <DialogContent className="!w-[320px] !max-w-[320px] !p-6 rounded-2xl">
        <DialogHeader className="text-center mb-6">
          <DialogTitle className="text-lg font-semibold">Share</DialogTitle>
          <DialogDescription className="mt-1 text-sm text-muted-foreground truncate">
            {title}
          </DialogDescription>
        </DialogHeader>

        {/* Message input */}
        <div className="mb-5">
          <label htmlFor="share-msg" className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
            Message
          </label>
          <input
            id="share-msg"
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-muted/30 px-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/20"
          />
        </div>

        {/* Social icons row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 48px)",
            justifyContent: "center",
            gap: "12px",
          }}
        >
          {SOCIAL_OPTIONS.map((option) => (
            <button
              key={option.name}
              type="button"
              onClick={() => handleSocialClick(option)}
              className="flex flex-col items-center gap-1.5 outline-none"
              title={`Share on ${option.name}`}
            >
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full text-white transition-transform duration-150 hover:scale-110 active:scale-95"
                style={{ background: option.bg }}
              >
                {option.icon}
              </div>
              <span className="text-[10px] font-medium text-muted-foreground">
                {option.name}
              </span>
            </button>
          ))}
        </div>

        {/* Copy link */}
        <div className="mt-6 flex h-10 items-center overflow-hidden rounded-lg border border-border bg-muted/40">
          <span className="flex-1 truncate px-3 text-xs text-muted-foreground">
            {url}
          </span>
          <button
            type="button"
            onClick={handleCopyLink}
            className={`flex h-full shrink-0 items-center gap-1.5 border-l border-border px-3 text-xs font-medium transition-colors ${
              copied
                ? "bg-green-500/10 text-green-600"
                : "bg-transparent text-foreground hover:bg-muted"
            }`}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

        {/* Native share for mobile */}
        {typeof window !== "undefined" && typeof navigator !== "undefined" && "share" in navigator && (
          <button
            type="button"
            onClick={handleNativeShare}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg py-2 text-xs text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          >
            <Share2 className="h-3.5 w-3.5" />
            More options
          </button>
        )}
      </DialogContent>
    </Dialog>
  );
}