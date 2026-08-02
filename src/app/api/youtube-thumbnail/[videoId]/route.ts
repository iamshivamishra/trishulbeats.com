import { NextRequest, NextResponse } from "next/server";

const THUMBNAIL_SOURCES = (id: string) => [
  `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
  `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
  `https://i.ytimg.com/vi/${id}/default.jpg`,
  `https://img.youtube.com/vi/${id}/0.jpg`,
];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  const { videoId } = await params;

  if (!videoId || videoId.length !== 11) {
    return new NextResponse("Invalid video id", { status: 400 });
  }

  const candidates = THUMBNAIL_SOURCES(videoId);

  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        next: { revalidate: 86400 },
      });

      if (!res.ok) continue;

      const buffer = await res.arrayBuffer();

      // YouTube ka "no thumbnail" placeholder ~ under 2KB hota hai, usse skip karo
      if (buffer.byteLength < 1000) continue;

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": res.headers.get("content-type") || "image/jpeg",
          "Cache-Control": "public, max-age=86400, s-maxage=604800",
        },
      });
    } catch {
      continue;
    }
  }

  return new NextResponse("Thumbnail not found", { status: 404 });
}