import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { storageService } from "@/lib/services/storage.service";
import { formatErrorResponse, UnauthorizedError, ForbiddenError, ValidationError } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();
    if (session.user.role !== "producer" && session.user.role !== "admin") {
      throw new ForbiddenError("Only producers can upload beat pack covers");
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file || file.size === 0) {
      throw new ValidationError("Validation failed", {
        file: ["No file provided"],
      });
    }

    const result = await storageService.uploadCoverImage(file, "beat-packs");

    return Response.json({ url: result.url });
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export const runtime = "nodejs";
