import { describe, expect, it } from "vitest";
import { hasPlayableAudioSource, normalizeAudioSource } from "./audio-source";

describe("audio source helpers", () => {
  it("normalizes blank and placeholder values to an empty string", () => {
    expect(normalizeAudioSource(undefined)).toBe("");
    expect(normalizeAudioSource("   ")).toBe("");
    expect(normalizeAudioSource("undefined")).toBe("");
    expect(normalizeAudioSource("null")).toBe("");
  });

  it("accepts valid media URLs", () => {
    expect(hasPlayableAudioSource("https://cdn.example.com/beat.mp3")).toBe(true);
    expect(hasPlayableAudioSource("/audio/preview.mp3")).toBe(true);
    expect(hasPlayableAudioSource("blob:https://example.com/uuid")).toBe(true);
  });
});
