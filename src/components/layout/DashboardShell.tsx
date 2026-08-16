"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { Session } from "next-auth";
import { useEffect, useState, useCallback } from "react";
import {
  LayoutDashboard,
  Home,
  Music,
  Layers,
  Upload,
  Ticket,
  User,
  Shield,
  LogOut,
  BarChart3,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  Package,
  Receipt,
  Disc3,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import ThemeToggle from "@/components/ThemeToggle";

interface DashboardShellProps {
  session: Session;
  children: React.ReactNode;
}

export default function DashboardShell({ session, children }: DashboardShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    studio: true,
    library: true,
    account: true,
  });
  const isAdminPath = pathname.startsWith("/admin");

  useEffect(() => {
    document.documentElement.classList.add("dashboard-shell");
    return () => document.documentElement.classList.remove("dashboard-shell");
  }, []);

  useEffect(() => {
    const stored = window.localStorage.getItem("dashboard.sidebar.collapsed");
    if (stored === "1") {
      setCollapsed(true);
    }
    try {
      const sections = window.localStorage.getItem("dashboard.sidebar.sections");
      if (sections) setExpandedSections(JSON.parse(sections));
    } catch {}
  }, []);

  const toggleSection = useCallback((key: string) => {
    setExpandedSections((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      window.localStorage.setItem("dashboard.sidebar.sections", JSON.stringify(next));
      return next;
    });
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem("dashboard.sidebar.collapsed", next ? "1" : "0");
      return next;
    });
  };

  const isProducer = session.user.role === "producer" || session.user.role === "admin";
  const roleLabel =
    session.user.role === "admin"
      ? "Admin"
      : session.user.role === "producer"
        ? "Producer"
        : "Buyer";

  // Admin pages have their own dedicated shell and navigation.
  if (isAdminPath) {
    return <>{children}</>;
  }

 const workspaceLinks = [
  { href: "/", label: "Home", icon: Home, show: true },   // ← icon: LayoutDashboard se Home kiya
  { href: "/studio", label: "Overview", icon: LayoutDashboard, show: isProducer },
  { href: "/studio/beats", label: "My Beats", icon: Music, show: isProducer },
  { href: "/studio/beat-packs", label: "My Packs", icon: Layers, show: isProducer },
  { href: "/studio/sales", label: "Sales", icon: BarChart3, show: isProducer },
  { href: "/studio/coupons", label: "Coupons", icon: Ticket, show: isProducer },
  { href: "/upload", label: "Upload", icon: Upload, show: isProducer },
].filter((item) => item.show);

  const libraryLinks = [
    { href: "/profile/beats", label: "My Beats", icon: Disc3 },
    { href: "/profile/packs", label: "My Packs", icon: Package },
    { href: "/profile/transactions", label: "Transactions", icon: Receipt },
  ];

  const accountLinks = [
    { href: "/admin", label: "Admin", icon: Shield, show: session.user.role === "admin" },
    { href: "/settings", label: "Settings", icon: Settings, show: false },
  ].filter((item) => item.show);

  const isActive = (href: string) => {
    if (href === "/" || href === "/studio" || href === "/profile") return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const currentTitle = [...workspaceLinks, ...libraryLinks, ...accountLinks]
    .find((link) => isActive(link.href))?.label || "Dashboard";

  const sidebarLinkClass = (href: string) =>
    cn(
      "group relative flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-all duration-150",
      isActive(href)
        ? "bg-primary/12 text-foreground"
        : "text-muted-foreground hover:bg-accent/80 hover:text-foreground",
      collapsed && "justify-center px-2.5"
    );

  return (
    <div className="flex h-screen h-dvh overflow-hidden">
      <aside
        className={cn(
          "hidden shrink-0 border-r border-border/40 bg-background/70 p-4 transition-all duration-200 lg:flex lg:flex-col",
          collapsed ? "w-20" : "w-72"
        )}
      >
        <div className="no-scrollbar flex h-full flex-col overflow-y-auto rounded-3xl border border-border/60 bg-card/70 p-3 shadow-sm ring-1 ring-black/[0.03]">
          <div
            className={cn(
              "mb-6 rounded-2xl border border-border/50 bg-gradient-to-br from-background via-background to-muted/30 shadow-sm",
              collapsed ? "p-2.5" : "p-4"
            )}
          >
            <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}>
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-primary/10 ring-1 ring-primary/20">
                <Image
                  src="/icon.svg"
                  alt="Trishul Beats logo"
                  width={22}
                  height={22}
                  className="h-[22px] w-[22px]"
                  priority
                />
              </div>
              {!collapsed && (
                <div>
                  <p className="text-sm font-semibold leading-none">Trishul Studio</p>
                  <p className="mt-1 text-xs text-muted-foreground">Dashboard</p>
                </div>
              )}
            </div>
          </div>

          {workspaceLinks.length > 0 && (
          <div className="mb-4">
            {!collapsed && (
              <button
                type="button"
                onClick={() => toggleSection("studio")}
                className="mb-1.5 flex w-full items-center justify-between rounded-lg px-2 py-1 text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:text-foreground"
                aria-expanded={expandedSections.studio}
              >
                Studio
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", expandedSections.studio && "rotate-180")} />
              </button>
            )}
            <div className={cn(
              "grid transition-all duration-200",
              !collapsed && !expandedSections.studio ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
            )}>
              <nav className="space-y-1.5 overflow-hidden">
                {workspaceLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    title={collapsed ? link.label : undefined}
                    className={sidebarLinkClass(link.href)}
                  >
                    {isActive(link.href) && (
                      <span className="absolute inset-y-1.5 left-0 w-1 rounded-r-full bg-primary" />
                    )}
                    <span className={cn("flex items-center", collapsed ? "" : "gap-2.5")}>
                      <link.icon className={cn("h-4 w-4", isActive(link.href) ? "text-primary" : "")} />
                      {!collapsed && <span className="font-medium">{link.label}</span>}
                    </span>
                  </Link>
                ))}
              </nav>
            </div>
          </div>
          )}

          <div className="mb-4">
            {!collapsed && (
              <button
                type="button"
                onClick={() => toggleSection("library")}
                className="mb-1.5 flex w-full items-center justify-between rounded-lg px-2 py-1 text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:text-foreground"
                aria-expanded={expandedSections.library}
              >
                My Library
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", expandedSections.library && "rotate-180")} />
              </button>
            )}
            <div className={cn(
              "grid transition-all duration-200",
              !collapsed && !expandedSections.library ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
            )}>
              <nav className="space-y-1.5 overflow-hidden">
                {libraryLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    title={collapsed ? link.label : undefined}
                    className={sidebarLinkClass(link.href)}
                  >
                    {isActive(link.href) && (
                      <span className="absolute inset-y-1.5 left-0 w-1 rounded-r-full bg-primary" />
                    )}
                    <span className={cn("flex items-center", collapsed ? "" : "gap-2.5")}>
                      <link.icon className={cn("h-4 w-4", isActive(link.href) ? "text-primary" : "")} />
                      {!collapsed && <span className="font-medium">{link.label}</span>}
                    </span>
                  </Link>
                ))}
              </nav>
            </div>
          </div>

          <div className="mt-auto space-y-3">
            <div>
              {!collapsed && (
                <button
                  type="button"
                  onClick={() => toggleSection("account")}
                  className="mb-1.5 flex w-full items-center justify-between rounded-lg px-2 py-1 text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:text-foreground"
                  aria-expanded={expandedSections.account}
                >
                  Account
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", expandedSections.account && "rotate-180")} />
                </button>
              )}
              <div className={cn(
                "grid transition-all duration-200",
                !collapsed && !expandedSections.account ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
              )}>
                <nav className="space-y-1.5 overflow-hidden">
                  {accountLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      title={collapsed ? link.label : undefined}
                      className={sidebarLinkClass(link.href)}
                    >
                      {isActive(link.href) && (
                        <span className="absolute inset-y-1.5 left-0 w-1 rounded-r-full bg-primary" />
                      )}
                      <span className={cn("flex items-center", collapsed ? "" : "gap-2.5")}>
                        <link.icon className={cn("h-4 w-4", isActive(link.href) ? "text-primary" : "")} />
                        {!collapsed && <span className="font-medium">{link.label}</span>}
                      </span>
                    </Link>
                  ))}
                </nav>
              </div>
            </div>

            <div
              className={cn(
                "rounded-xl border border-border/60 bg-background/70",
                collapsed ? "p-2" : "p-3"
              )}
            >
              {!collapsed && (
                <Link
                  href="/profile"
                  className={cn(
                    "mb-2.5 flex items-center gap-3 rounded-lg p-1.5 -m-1.5 transition-colors hover:bg-accent/80",
                    isActive("/profile") && "bg-accent/60"
                  )}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {session.user.name?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold leading-tight">{session.user.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{session.user.email}</p>
                  </div>
                  <span className="shrink-0 rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                    {roleLabel}
                  </span>
                </Link>
              )}
              {collapsed && (
                <Link
                  href="/profile"
                  title="Profile"
                  className="mb-1.5 flex items-center justify-center rounded-lg p-1.5 transition-colors hover:bg-accent/80"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {session.user.name?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                </Link>
              )}
              <div className={cn("flex items-center gap-1.5", collapsed ? "flex-col" : "")}>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn("flex-1", collapsed ? "w-full justify-center px-0" : "justify-start")}
                  onClick={() => signOut({ callbackUrl: "/" })}
                  title={collapsed ? "Sign out" : undefined}
                >
                  <LogOut className={cn("h-4 w-4", !collapsed && "mr-2")} />
                  {!collapsed && "Sign out"}
                </Button>
                <ThemeToggle className="h-8 w-8 shrink-0" />
              </div>
            </div>
          </div>
        </div>
      </aside>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <header className="sticky top-0 z-30 shrink-0 border-b border-border/50 bg-background/90 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sheet>
                <SheetTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="lg:hidden"
                      aria-label="Open dashboard navigation"
                    />
                  }
                >
                  <Menu className="h-4 w-4" />
                </SheetTrigger>
                <SheetContent side="left" className="w-80">
                  <SheetHeader>
                    <SheetTitle>Dashboard</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 space-y-6">
                    {workspaceLinks.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Studio
                      </p>
                      <nav className="space-y-1">
                        {workspaceLinks.map((link) => (
                          <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                              "focus-ring flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
                              isActive(link.href)
                                ? "bg-primary/15 text-primary"
                                : "text-muted-foreground hover:bg-accent hover:text-foreground"
                            )}
                          >
                            <link.icon className="h-4 w-4" />
                            {link.label}
                          </Link>
                        ))}
                      </nav>
                    </div>
                    )}
                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        My Library
                      </p>
                      <nav className="space-y-1">
                        {libraryLinks.map((link) => (
                          <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                              "focus-ring flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
                              isActive(link.href)
                                ? "bg-primary/15 text-primary"
                                : "text-muted-foreground hover:bg-accent hover:text-foreground"
                            )}
                          >
                            <link.icon className="h-4 w-4" />
                            {link.label}
                          </Link>
                        ))}
                      </nav>
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Account
                      </p>
                      <nav className="space-y-1">
                        {accountLinks.map((link) => (
                          <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                              "focus-ring flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
                              isActive(link.href)
                                ? "bg-primary/15 text-primary"
                                : "text-muted-foreground hover:bg-accent hover:text-foreground"
                            )}
                          >
                            <link.icon className="h-4 w-4" />
                            {link.label}
                          </Link>
                        ))}
                      </nav>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
              <Button
                variant="ghost"
                size="icon"
                className="hidden lg:inline-flex"
                onClick={toggleCollapsed}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
              </Button>
              <div>
                <h1 className="text-lg font-semibold">{currentTitle}</h1>
                <p className="text-xs text-muted-foreground">
                  Manage your account and activity
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
