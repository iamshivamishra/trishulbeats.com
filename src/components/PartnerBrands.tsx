import Image from "next/image";

interface Partner {
  name: string;
  url: string;
  logoUrl: string;
}

const PARTNERS: Partner[] = [
  {
    name: "News24",
    url: "https://www.news24online.com",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/6/66/News24_Logo.jpg",
  },
  {
    name: "JioCinema",
    url: "https://www.jiocinema.com",
    logoUrl: "https://m.media-amazon.com/images/I/31LNEBVsjUL.png",
  },
];

export default function PartnerBrands() {
  return (
    <section className="app-container py-16">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold sm:text-3xl">We Work With</h2>
        <p className="mt-2 text-muted-foreground">
          Proud to collaborate with leading media & entertainment platforms.
        </p>
      </div>

      {/* Left aur Right Layout ke liye Grid */}
      <div className="grid gap-6 sm:grid-cols-2">
        {PARTNERS.map((partner) => (
          <a
            key={partner.name}
            href={partner.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex items-center justify-center overflow-hidden rounded-2xl border border-border/60 bg-white p-8 shadow-sm transition-all hover:-translate-y-1 hover:border-border hover:shadow-xl"
          >
            {/* Badi Image Container */}
            <div className="relative h-40 w-full max-w-xs overflow-hidden">
              <Image
                src={partner.logoUrl}
                alt={`${partner.name} logo`}
                fill
                className="object-contain transition-transform duration-300 group-hover:scale-105"
                unoptimized
              />
            </div>

            {/* Decorative Hover Glow Effect */}
            <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-primary/5 blur-2xl transition-all group-hover:bg-primary/15" />
          </a>
        ))}
      </div>
    </section>
  );
}