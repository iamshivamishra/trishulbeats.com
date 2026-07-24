export function normalizeAudioSource(source?: string | null): string {
  if (typeof source !== "string") return "";

  const trimmed = source.trim();
  if (!trimmed) return "";

  const lowered = trimmed.toLowerCase();
  if (lowered === "null" || lowered === "undefined" || lowered === "false") {
    return "";
  }

  return trimmed;
}

export function hasPlayableAudioSource(source?: string | null): boolean {
  const normalized = normalizeAudioSource(source);
  if (!normalized) return false;

  try {
    const url = new URL(normalized, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    return ["http:", "https:", "blob:"].includes(url.protocol);
  } catch {
    return normalized.startsWith("/") || normalized.startsWith("data:");
  }
}
