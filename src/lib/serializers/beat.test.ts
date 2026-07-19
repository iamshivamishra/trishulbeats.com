import { describe, expect, it } from "vitest";
import { toPublicBeatForUi, toPublicBeatPayload } from "./beat";
import type { IBeat } from "../../types";

const sampleBeat: IBeat = {
  _id: "beat_1",
  title: "Night Drive",
  genre: "Trap",
  tags: ["dark"],
  duration: 120,
  producerId: "producer_1",
  audioTaggedUrl: "https://example.com/tagged.mp3",
  audioFullUrl: "https://example.com/master.wav",
  stemsUrl: "https://example.com/stems.zip",
  storageKeys: {
    preview: "preview-key",
    master: "master-key",
    stems: "stems-key",
  },
  status: "published",
  isPublished: true,
  plays: 10,
  salesCount: 3,
  likesCount: 4,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("beat public serializers", () => {
  it("removes sensitive file fields from API payloads", () => {
    const payload = toPublicBeatPayload(sampleBeat);

    expect("audioFullUrl" in payload).toBe(false);
    expect("stemsUrl" in payload).toBe(false);
    expect("storageKeys" in payload).toBe(false);
    expect(payload.audioTaggedUrl).toBe(sampleBeat.audioTaggedUrl);
  });

  it("keeps UI shape while clearing sensitive values", () => {
    const uiBeat = toPublicBeatForUi(sampleBeat);

    expect(uiBeat.audioFullUrl).toBe("");
    expect(uiBeat.stemsUrl).toBeUndefined();
    expect(uiBeat.storageKeys).toBeUndefined();
    expect(uiBeat.audioTaggedUrl).toBe(sampleBeat.audioTaggedUrl);
  });
});
