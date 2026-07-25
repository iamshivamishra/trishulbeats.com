import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Beat on Trishul Beats";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: { id: string } }) {
  // We can't access the database from edge runtime, so create a branded fallback
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0d0d0d",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 64, fontWeight: 700, marginBottom: 8 }}>
          🎵
        </div>
        <div style={{ fontSize: 48, fontWeight: 700, marginBottom: 12 }}>
          Trishul Beats
        </div>
        <div style={{ fontSize: 24, color: "#a1a1aa" }}>
          Discover & License This Beat
        </div>
      </div>
    ),
    { ...size },
  );
}
