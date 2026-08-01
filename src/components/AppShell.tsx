"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BottomPlayer from "@/components/BottomPlayer";
import { useAudioPlayer } from "@/components/AudioPlayerContext";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const { currentBeat } = useAudioPlayer();
  const isDashboardRoute =
    pathname === "/dashboard" ||
    pathname.startsWith("/studio") ||
    pathname.startsWith("/upload") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/admin");

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-lg"
      >
        Skip to main content
      </a>
      {!isDashboardRoute && <Navbar />}
      <main
        id="main-content"
        className={`min-h-[calc(100vh-8rem)] bg-[radial-gradient(1200px_500px_at_50%_-120px,oklch(0.7_0.12_24_/_0.12),transparent)] pb-20${currentBeat ? " pb-36 sm:pb-28" : ""}`}
      >
        {children}
      </main>
      {!isDashboardRoute && <Footer />}
      <BottomPlayer />
    </>
  );
}