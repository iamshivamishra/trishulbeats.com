"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { Session } from "next-auth";
import { Menu, X, LogOut, LayoutDashboard } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import ThemeToggle from "@/components/ThemeToggle";

interface NavbarProps {
  session: Session | null;
}

const NAV_LINKS = [
  { href: "/beats", label: "Browse" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function Navbar({ session }: NavbarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const user = session?.user;
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/85 backdrop-blur-xl">
      <nav className="app-container flex h-16 items-center justify-between">
        <Link href="/" className="focus-ring flex items-center gap-2 rounded-md text-lg font-semibold">
          <Image
            src="/icon.svg"
            alt="Trishul Beats logo"
            width={20}
            height={20}
            className="h-5 w-5"
            priority
          />
          <span>Test Mode</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "focus-ring rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                isActive(link.href)
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          {user ? (
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm" className="gap-1.5">
                <Link href="/dashboard">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-muted-foreground hover:text-destructive"
              >
                <LogOut className="mr-1.5 h-4 w-4" />
                Sign out
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Sign In</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/signup">Get Started</Link>
              </Button>
            </div>
          )}
        </div>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger
            className="focus-ring inline-flex items-center justify-center rounded-md p-2 hover:bg-accent md:hidden"
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </SheetTrigger>
          <SheetContent side="right" className="w-80">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Image
                  src="/icon.svg"
                  alt="Trishul Beats logo"
                  width={16}
                  height={16}
                  className="h-4 w-4"
                />
                Trishul Beats
              </SheetTitle>
            </SheetHeader>
            <div className="mt-6 flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "focus-ring rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive(link.href)
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:bg-accent"
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <div className="my-3 h-px bg-border" />
              <div className="px-2 pb-2">
                <ThemeToggle className="h-8 w-8" />
              </div>
              {user ? (
                <>
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent"
                  >
                    Dashboard
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileOpen(false);
                      signOut({ callbackUrl: "/" });
                    }}
                    className="focus-ring rounded-md px-3 py-2.5 text-left text-sm font-medium text-destructive hover:bg-accent"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setMobileOpen(false)}
                    className="mt-1 inline-flex items-center justify-center rounded-md bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  );
}
