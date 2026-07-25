import type { Metadata } from "next";
import { Music, Users, Shield, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "About",
  description: "Learn about Trishul Beats — the marketplace connecting producers and artists.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div className="page-shell max-w-5xl">
      <div className="page-header text-center">
        <h1 className="text-3xl font-semibold sm:text-4xl">About Trishul Beats</h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
          We connect talented producers with artists looking for the perfect beat.
          Browse, preview, license — all in one place.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {[
          { icon: Music, title: "Quality Beats", desc: "Curated catalog of production-ready beats across every genre." },
          { icon: Users, title: "For Everyone", desc: "Whether you're a buyer looking for beats or a producer selling them." },
          { icon: Shield, title: "Secure Licensing", desc: "Clear license tiers (basic, premium, exclusive) with defined terms." },
          { icon: Zap, title: "Instant Delivery", desc: "Purchase and download immediately. No waiting around." },
        ].map((item) => (
          <Card key={item.title} className="border-border/60 bg-card/80 shadow-sm">
            <CardContent className="p-6">
              <item.icon className="mb-3 h-7 w-7 text-primary" />
              <h2 className="text-lg font-semibold">{item.title}</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
