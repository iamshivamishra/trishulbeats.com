"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BottomPlayer from "@/components/BottomPlayer";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const isDashboardRoute =
    pathname === "/dashboard" ||
    pathname.startsWith("/studio") ||
    pathname.startsWith("/upload") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/admin");

  return (
    <>
      {!isDashboardRoute && <Navbar />}
      <main className="min-h-[calc(100vh-8rem)] bg-[radial-gradient(1200px_500px_at_50%_-120px,oklch(0.7_0.12_24_/_0.12),transparent)] pb-20">
        {children}
      </main>
      {!isDashboardRoute && <Footer />}
      <BottomPlayer />
    </>
  );
}