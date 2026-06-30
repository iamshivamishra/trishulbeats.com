import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { beatService } from "@/lib/services/beat.service";
import { storageService } from "@/lib/services/storage.service";
import { createBeatSchema, beatFilterSchema } from "@/lib/validators/beat";
import { validateFile } from "@/lib/storage/config";
import { formatErrorResponse, ForbiddenError, UnauthorizedError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
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
    if (!session?.user) throw new UnauthorizedError();
    if (session.user.role !== "producer" && session.user.role !== "admin") {
      throw new ForbiddenError("Only producers can upload beats");
    }

    const formData = await request.formData();

    const metadata = {
      title: formData.get("title") as string,
      description: (formData.get("description") as string) || undefined,
      bpm: formData.get("bpm") ? Number(formData.get("bpm")) : undefined,
      key: (formData.get("key") as string) || undefined,
      genre: formData.get("genre") as string,
      tags: formData.get("tags")
        ? (formData.get("tags") as string).split(",").map((t) => t.trim())
        : [],
      mood: (formData.get("mood") as string) || undefined,
      status: (formData.get("status") as string) || "draft",
    };
    const input = createBeatSchema.parse(metadata);

    const taggedAudio = formData.get("audioTagged") as File;
    const fullAudio = formData.get("audioFull") as File;
    const stemsFile = formData.get("stems") as File | null;
    const cover = formData.get("cover") as File | null;

    if (!taggedAudio || !fullAudio) {
      return Response.json(
        { error: "Both preview MP3 and master WAV are required" },
        { status: 400 }
      );
    }

    // Server-side validation
    const previewCheck = validateFile(taggedAudio, "preview");
    if (!previewCheck.valid) {
      return Response.json({ error: previewCheck.error }, { status: 400 });
    }

    const masterCheck = validateFile(fullAudio, "master");
    if (!masterCheck.valid) {
      return Response.json({ error: masterCheck.error }, { status: 400 });
    }

    
    if (stemsFile && stemsFile.size > 0) {
      const stemsCheck = validateFile(stemsFile, "stems");
      if (!stemsCheck.valid) {
        return Response.json({ error: stemsCheck.error }, { status: 400 });
      }
    }

    if (cover && cover.size > 0) {
      const artworkCheck = validateFile(cover, "artwork");
      if (!artworkCheck.valid) {
        return Response.json({ error: artworkCheck.error }, { status: 400 });
      }
    }

    // Upload audio files
    const [taggedResult, fullResult] = await Promise.all([
      storageService.uploadBeatAudio(taggedAudio, "tagged"),
      storageService.uploadBeatAudio(fullAudio, "full"),
    ]);

    let stemsUrl: string | undefined;
    if (stemsFile && stemsFile.size > 0) {
      const stemsResult = await storageService.uploadBeatAudio(stemsFile, "full");
      stemsUrl = stemsResult.url;
    }

    let coverUrl: string | undefined;
    if (cover && cover.size > 0) {
      const coverResult = await storageService.uploadCoverImage(cover);
      coverUrl = coverResult.url;
    }

    const beat = await beatService.create(
      input,
      session.user.id,
      taggedResult.url,
      fullResult.url,
      coverUrl,
      stemsUrl
    );

    return Response.json({ beat }, { status: 201 });
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export const runtime = "nodejs";
