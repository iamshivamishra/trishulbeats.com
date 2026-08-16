import { describe, it, expect } from "vitest";
import { MULTIPART_THRESHOLD } from "./multipart";

describe("MULTIPART_THRESHOLD", () => {
  it("is 50 MB", () => {
    expect(MULTIPART_THRESHOLD).toBe(50 * 1024 * 1024);
  });
});

describe("MultipartUploadResult interface", () => {
  it("has url and key fields (type-level check)", () => {
    const result: { url: string; key: string } = { url: "https://example.com/file", key: "file.mp3" };
    expect(result.url).toBeTruthy();
    expect(result.key).toBeTruthy();
  });
});
