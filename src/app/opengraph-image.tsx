import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Trishul Beats — Beat Marketplace";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
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
        <div style={{ fontSize: 72, fontWeight: 700, marginBottom: 16 }}>
          Trishul Beats
        </div>
        <div style={{ fontSize: 28, color: "#a1a1aa" }}>
          Discover & License High-Quality Beats
        </div>
      </div>
    ),
    { ...size }
  );
}
