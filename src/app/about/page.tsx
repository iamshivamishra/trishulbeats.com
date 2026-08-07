import type { Metadata } from "next";
import { Music, Users, Shield, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Reveal } from "./Reveal";
import { Waveform } from "./Waveform";
import { FaqAccordion } from "./Faqaccordion";

export const metadata: Metadata = {
  title: "About",
  description: "Learn about Trishul Beats — the marketplace connecting producers and artists.",
  alternates: { canonical: "/about" },
};

const features = [
  { icon: Music, title: "Quality Beats", desc: "Curated catalog of production-ready beats across every genre." },
  { icon: Users, title: "For Everyone", desc: "Whether you're a buyer looking for beats or a producer selling them." },
  { icon: Shield, title: "Secure Licensing", desc: "Clear license tiers (basic, premium, exclusive) with defined terms." },
  { icon: Zap, title: "Instant Delivery", desc: "Purchase and download immediately. No waiting around." },
];

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

      {/* Hero */}
      <div className="page-header relative overflow-hidden text-center">
        <div
          className="pointer-events-none absolute left-1/2 top-0 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
          aria-hidden="true"
        />
        <Reveal>
          <span className="inline-block rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            About Us
          </span>
        </Reveal>

        <Reveal delay={80}>
          <h1 className="mt-4 text-3xl font-semibold sm:text-4xl md:text-5xl">
            About Trishul Beats
          </h1>
        </Reveal>

        <Reveal delay={160}>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
            We connect talented producers with artists looking for the perfect beat.
            Browse, preview, license — all in one place.
          </p>
        </Reveal>

        <Reveal delay={240} className="mt-8">
          <Waveform />
        </Reveal>
      </div>

      {/* Feature grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((item, i) => (
          <Reveal key={item.title} delay={i * 90}>
            <Card className="group h-full border-border/60 bg-card/80 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
              <CardContent className="p-6">
                <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary/15">
                  <item.icon className="h-6 w-6" />
                </div>
                <h2 className="text-lg font-semibold">{item.title}</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.desc}</p>
              </CardContent>
            </Card>
          </Reveal>
        ))}
      </div>

      {/* FAQ */}
      <div className="mt-16">
        <Reveal>
          <h2 className="mb-6 text-center text-2xl font-semibold">
            Frequently Asked Questions
          </h2>
        </Reveal>
        <Reveal delay={100} className="mx-auto max-w-3xl">
          <FaqAccordion items={faqItems} />
        </Reveal>
      </div>
    </div>
  );
}