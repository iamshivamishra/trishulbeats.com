import { NextRequest } from "next/server";
import { Types } from "mongoose";
import { auth } from "@/lib/auth";
import { beatService } from "@/lib/services/beat.service";
import { storageService } from "@/lib/services/storage.service";
import {
  createBeatSchema,
  beatFilterSchema,
} from "@/lib/validators/beat";
import { validateFile } from "@/lib/storage/config";
import {
  formatErrorResponse,
  ForbiddenError,
  UnauthorizedError,
  ValidationError,
} from "@/lib/errors";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";


function hasExpectedBeatAssetKeyShape(
  key: string,
  producerId: string,
  category: "preview" | "master" | "stems" | "artwork"
): boolean {
  // preview aur master ab MP3/WAV ke sath-sath ZIP bhi ho sakte hain
  const extByCategory: Record<"preview" | "master" | "stems" | "artwork", string[]> = {
    preview: [".mp3", ".zip"],
    master: [".wav", ".zip"],
    stems: [".zip"],
    artwork: [".jpg"],
  };

  const expectedPrefix = `producers/${producerId}/beats/`;
  const allowedSuffixes = extByCategory[category].map((ext) => `/${category}${ext}`);
  return (
    key.startsWith(expectedPrefix) &&
    allowedSuffixes.some((suffix) => key.endsWith(suffix))
  );
}


export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 60, windowSec: 60, prefix: "api:beats" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const params = Object.fromEntries(request.nextUrl.searchParams);
    const filters = beatFilterSchema.parse(params);
    const result = await beatService.list(filters);

    return Response.json(result);
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      throw new UnauthorizedError();
    }

    if (
      session.user.role !== "producer" &&
      session.user.role !== "admin"
    ) {
      throw new ForbiddenError("Only producers can upload beats");
    }

    const contentType = request.headers.get("content-type") || "";
    const isJsonPayload = contentType.includes("application/json");
    let beat;

    if (isJsonPayload) {
      const body = await request.json();
      const input = createBeatSchema.parse(body);
      const { uploadedAssets, ...metadata } = input;
      if (!uploadedAssets) {
        throw new ValidationError("Validation failed", {
          uploadedAssets: ["uploadedAssets is required for JSON uploads"],
        });
      }

      const keyChecks: Array<{ key: string; category: "preview" | "master" | "stems" | "artwork" }> = [
        { key: uploadedAssets.preview.key, category: "preview" },
        { key: uploadedAssets.master.key, category: "master" },
        ...(uploadedAssets.stems ? [{ key: uploadedAssets.stems.key, category: "stems" as const }] : []),
        ...(uploadedAssets.artwork
          ? [{ key: uploadedAssets.artwork.key, category: "artwork" as const }]
          : []),
      ];

      const invalidKey = keyChecks.find(
        ({ key, category }) => !hasExpectedBeatAssetKeyShape(key, session.user.id, category)
      );
      if (invalidKey) {
        throw new ValidationError("Validation failed", {
          uploadedAssets: [`Invalid uploaded asset key for ${invalidKey.category}`],
        });
      }

      beat = await beatService.create(
        metadata,
        session.user.id,
        uploadedAssets.preview.url,
        uploadedAssets.master.url,
        uploadedAssets.artwork?.url,
        uploadedAssets.stems?.url,
        {
          preview: uploadedAssets.preview.key,
          master: uploadedAssets.master.key,
          stems: uploadedAssets.stems?.key,
          artwork: uploadedAssets.artwork?.key,
        }
      );
    } else {
      const formData = await request.formData();

      const metadata = {
        title: formData.get("title") as string,
        description: (formData.get("description") as string) || undefined,
        bpm: formData.get("bpm") ? Number(formData.get("bpm")) : undefined,
        key: (formData.get("key") as string) || undefined,
        genre: formData.get("genre") as string,
        tags: formData.get("tags")
          ? (formData.get("tags") as string)
              .split(",")
              .map((t) => t.trim())
          : [],
        mood: (formData.get("mood") as string) || undefined,
        status: (formData.get("status") as string) || "draft",
        licenses: formData.get("licenses")
          ? JSON.parse(formData.get("licenses") as string)
          : undefined,
      };

      const input = createBeatSchema.parse(metadata);

      const taggedAudio = formData.get("audioTagged") as File;
      const fullAudio = formData.get("audioFull") as File;
      const stemsFile = formData.get("stems") as File | null;
      const cover = formData.get("cover") as File | null;

      if (!taggedAudio || !fullAudio) {
        throw new ValidationError("Validation failed", {
          files: ["Both preview MP3 and master WAV are required"],
        });
      }

      const previewCheck = validateFile(taggedAudio, "preview");
      if (!previewCheck.valid) {
        throw new ValidationError("Validation failed", {
          audioTagged: [previewCheck.error || "Invalid preview file"],
        });
      }

      const masterCheck = validateFile(fullAudio, "master");
      if (!masterCheck.valid) {
        throw new ValidationError("Validation failed", {
          audioFull: [masterCheck.error || "Invalid master file"],
        });
      }

      if (stemsFile && stemsFile.size > 0) {
        const stemsCheck = validateFile(stemsFile, "stems");
        if (!stemsCheck.valid) {
          throw new ValidationError("Validation failed", {
            stems: [stemsCheck.error || "Invalid stems file"],
          });
        }
      }

      if (cover && cover.size > 0) {
        const artworkCheck = validateFile(cover, "artwork");
        if (!artworkCheck.valid) {
          throw new ValidationError("Validation failed", {
            cover: [artworkCheck.error || "Invalid cover artwork file"],
          });
        }
      }

      const uploadBeatId = new Types.ObjectId().toString();

      const [taggedResult, fullResult] = await Promise.all([
        storageService.uploadBeatFile(taggedAudio, session.user.id, uploadBeatId, "preview"),
        storageService.uploadBeatFile(fullAudio, session.user.id, uploadBeatId, "master"),
      ]);

      let stemsResult: { url: string; key: string } | undefined;
      if (stemsFile && stemsFile.size > 0) {
        stemsResult = await storageService.uploadBeatFile(
          stemsFile,
          session.user.id,
          uploadBeatId,
          "stems"
        );
      }

      let coverResult: { url: string; key: string } | undefined;
      if (cover && cover.size > 0) {
        coverResult = await storageService.uploadBeatFile(
          cover,
          session.user.id,
          uploadBeatId,
          "artwork"
        );
      }

      beat = await beatService.create(
        input,
        session.user.id,
        taggedResult.url,
        fullResult.url,
        coverResult?.url,
        stemsResult?.url,
        {
          preview: taggedResult.key,
          master: fullResult.key,
          stems: stemsResult?.key,
          artwork: coverResult?.key,
        }
      );
    }

    return Response.json(
      { beat },
      {
        status: 201,
      }
    );
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export const runtime = "nodejs";