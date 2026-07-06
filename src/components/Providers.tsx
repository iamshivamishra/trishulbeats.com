"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import type { Session } from "next-auth";
import CartProvider from "@/components/CartProvider";
import { AudioPlayerProvider } from "@/components/AudioPlayerContext";

export default function Providers({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  return (
    <SessionProvider session={session}>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={false}
        disableTransitionOnChange
      >
        <AudioPlayerProvider>
          <CartProvider>
            {children}
          </CartProvider>
        </AudioPlayerProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}