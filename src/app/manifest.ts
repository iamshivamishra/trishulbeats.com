import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Trishul Beats",
    short_name: "Trishul Beats",
    description: "Discover and license high-quality beats from talented producers.",
    start_url: "/",
    display: "standalone",
    background_color: "#0d0d0d",
    theme_color: "#0d0d0d",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icon", sizes: "32x32", type: "image/png" },
    ],
  };
}
