import type { MetadataRoute } from "next";
import { connectDB } from "@/lib/db";
import Beat from "@/lib/models/Beat";
import User from "@/lib/models/User";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/beats`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/login`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.2 },
    { url: `${baseUrl}/signup`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.2 },
  ];

  await connectDB();

  const [beats, producers] = await Promise.all([
    Beat.find({
      isPublished: true,
      $or: [{ saleMode: { $exists: false } }, { saleMode: "single" }],
    })
      .select("_id updatedAt")
      .sort({ updatedAt: -1 })
      .limit(500)
      .lean<{ _id: string; updatedAt: Date }[]>(),
    User.find({ role: "producer", username: { $exists: true, $ne: "" } })
      .select("username updatedAt")
      .sort({ salesCount: -1 })
      .limit(200)
      .lean<{ username: string; updatedAt: Date }[]>(),
  ]);

  const beatPages: MetadataRoute.Sitemap = beats.map((beat) => ({
    url: `${baseUrl}/beats/${beat._id}`,
    lastModified: beat.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const producerPages: MetadataRoute.Sitemap = producers.map((p) => ({
    url: `${baseUrl}/producer/${p.username}`,
    lastModified: p.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...beatPages, ...producerPages];
}
