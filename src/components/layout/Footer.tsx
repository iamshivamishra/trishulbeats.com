import Link from "next/link";
import Image from "next/image";
import { Separator } from "@/components/ui/separator";

export default function Footer() {
  return (
    <footer className="border-t border-border/50 bg-background/95">
      <div className="app-container py-10 sm:py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link href="/" className="focus-ring inline-flex items-center gap-2 rounded-md text-base font-semibold">
              <Image
                src="/icon.svg"
                alt="Trishul Beats logo"
                width={20}
                height={20}
                className="h-5 w-5"
              />
              Trishul Beats
            </Link>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Trishul Beats is an independent music production project run by Indian music producer and composer Rajan Kumar Mishra.
            </p>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold">Browse</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/beat-packs" className="focus-ring rounded-sm hover:text-foreground transition-colors">All Beats</Link></li>
              <li><Link href="/beat-packs" className="focus-ring rounded-sm hover:text-foreground transition-colors">Beat Packs</Link></li>
              <li><Link href="/beat-packs" className="focus-ring rounded-sm hover:text-foreground transition-colors">Hip Hop</Link></li>
              <li><Link href="/beat-packs" className="focus-ring rounded-sm hover:text-foreground transition-colors">Trap</Link></li>
              <li><Link href="/beat-packs" className="focus-ring rounded-sm hover:text-foreground transition-colors">R&B</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/about" className="focus-ring rounded-sm hover:text-foreground transition-colors">About</Link></li>
              <li><Link href="/contact" className="focus-ring rounded-sm hover:text-foreground transition-colors">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold">Follow Us</h4>
            <div className="flex flex-wrap gap-3">
              <a href="https://tr.ee/7kRtfV-ykg" target="_blank" rel="noopener noreferrer" className="focus-ring rounded-sm text-sm text-muted-foreground hover:text-foreground transition-colors" aria-label="YouTube">YouTube</a>
              <a href="https://tr.ee/1eJUtid8So" target="_blank" rel="noopener noreferrer" className="focus-ring rounded-sm text-sm text-muted-foreground hover:text-foreground transition-colors" aria-label="Instagram">Instagram</a>
            </div>
          </div>
        </div>

        <Separator className="my-8" />

        <p className="text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Trishul Beats. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
