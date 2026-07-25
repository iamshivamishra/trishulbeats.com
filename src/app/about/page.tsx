import type { Metadata } from "next";
import { Music, Users, Shield, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "About",
  description: "Learn about Trishul Beats — the marketplace connecting producers and artists.",
  alternates: { canonical: "/about" },
};

const faqItems = [
  {
    q: "What license types are available?",
    a: "We offer three license tiers — Basic, Premium, and Unlimited. Each tier grants different usage rights, from personal projects to commercial releases with unlimited distribution.",
  },
  {
    q: "Can I preview beats before purchasing?",
    a: "Yes! Every beat has a free tagged preview you can listen to without an account. Once you find the right beat, choose your license tier and purchase instantly.",
  },
  {
    q: "What file formats do I receive?",
    a: "After purchase, you get high-quality WAV and MP3 files. Premium and Unlimited licenses may also include stems and trackouts depending on the producer.",
  },
  {
    q: "Can I get a refund?",
    a: "Due to the digital nature of beats, all sales are final. However, if you experience technical issues with your download, contact our support team and we'll help resolve it.",
  },
  {
    q: "How do I become a producer on Trishul Beats?",
    a: "Sign up for a free producer account, complete your profile, and start uploading your beats. Once approved, your beats will be listed on the marketplace for buyers to discover.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map((faq) => ({
    "@type": "Question",
    name: faq.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.a,
    },
  })),
};

export default function AboutPage() {
  return (
    <div className="page-shell max-w-5xl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

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

      {/* FAQ */}
      <div className="mt-12">
        <h2 className="mb-6 text-2xl font-semibold text-center">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {faqItems.map((faq) => (
            <Card key={faq.q} className="border-border/60 bg-card/80 shadow-sm">
              <CardContent className="p-5">
                <h3 className="font-semibold">{faq.q}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{faq.a}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
