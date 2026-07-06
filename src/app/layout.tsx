import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { auth } from "@/lib/auth";
import Providers from "@/components/Providers";
import AppShell from "@/components/AppShell";
import ErrorReporter from "@/components/ErrorReporter";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: {
    default: "Trishul Beats — Beat Marketplace",
    template: "%s | Trishul Beats",
  },
  description:
    "Discover and license high-quality beats from talented producers. Find the perfect beat for your next track on Trishul Beats.",
  keywords: [
    "beats", "music production", "beat marketplace", "buy beats",
    "hip hop beats", "license beats", "instrumental beats", "rap beats",
  ],
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  openGraph: {
    type: "website",
    siteName: "Trishul Beats",
    title: "Trishul Beats — Beat Marketplace",
    description: "Discover and license high-quality beats from talented producers.",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "Trishul Beats — Beat Marketplace",
    description: "Discover and license high-quality beats from talented producers.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  alternates: {
    canonical: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Trishul Beats",
    url: appUrl,
    description: "Discover and license high-quality beats from talented producers.",
    potentialAction: {
      "@type": "SearchAction",
      target: `${appUrl}/beats?search={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("font-sans antialiased", geist.variable)}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${process.env.NEXT_PUBLIC_GA_ID}');`,
              }}
            />
          </>
        )}
      </head>
      <body className="min-h-screen bg-background text-foreground">
        <Providers session={session}>
          <AppShell session={session}>{children}</AppShell>
          <Toaster richColors position="top-right" />
          <ErrorReporter />
        </Providers>
      </body>
    </html>
  );
}