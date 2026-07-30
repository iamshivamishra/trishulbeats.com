import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import Script from "next/script";
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
  themeColor: "#0d0d0d",
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
    images: [{ url: "/og-default.png", width: 1200, height: 630, alt: "Trishul Beats" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Trishul Beats — Beat Marketplace",
    description: "Discover and license high-quality beats from talented producers.",
    images: ["/og-default.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
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
      </head>
      <body className="min-h-screen bg-background text-foreground">
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-5P7LC6C9"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        <Script id="gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-5P7LC6C9');`}
        </Script>
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga-init" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${process.env.NEXT_PUBLIC_GA_ID}');`}
            </Script>
          </>
        )}
        <Providers session={session}>
          <AppShell>{children}</AppShell>
          <Toaster richColors position="top-right" />
          <ErrorReporter />
        </Providers>
      </body>
    </html>
  );
}