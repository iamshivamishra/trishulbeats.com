import { NextRequest, NextResponse } from "next/server";

// Spotify ke sabhi legit image CDN domains allow karo
const ALLOWED_HOSTS = [
  "i.scdn.co",
  "mosaic.scdn.co",
  "image-cdn-ak.spotifycdn.com",
  "image-cdn-fa.spotifycdn.com",
  "thisis-images.scdn.co",
];

export async function GET(req: NextRequest) {
  const imageUrl = req.nextUrl.searchParams.get("url");

  if (!imageUrl) {
    return new NextResponse("Missing image url", { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(imageUrl);
  } catch {
    return new NextResponse("Malformed image url", { status: 400 });
  }

  const isAllowed =
    parsed.protocol === "https:" &&
    (ALLOWED_HOSTS.includes(parsed.hostname) || parsed.hostname.endsWith(".scdn.co"));

  if (!isAllowed) {
    return new NextResponse("Domain not allowed", { status: 400 });
  }

  try {
    const res = await fetch(imageUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      return new NextResponse("Failed to fetch image", { status: 502 });
    }

    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": res.headers.get("content-type") || "image/jpeg",
        "Cache-Control": "public, max-age=86400, s-maxage=604800",
      },
    });
  } catch (err) {
    console.error("Spotify image proxy error:", err);
    return new NextResponse("Error fetching image", { status: 500 });
  }
}