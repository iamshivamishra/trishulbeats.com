import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { storageService } from "@/lib/services/storage.service";
import { userRepository } from "@/lib/repositories/user.repository";
import { formatErrorResponse, UnauthorizedError, ValidationError } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string;

    if (!file || file.size === 0) {
      throw new ValidationError("Validation failed", {
        file: ["No file provided"],
      });
    }

    if (type !== "avatar" && type !== "cover") {
      throw new ValidationError("Validation failed", {
        type: ["Type must be 'avatar' or 'cover'"],
      });
    }

    const result = await storageService.uploadProfileImage(
      file,
      session.user.id,
      type
    );

    if (type === "avatar") {
      await userRepository.update(session.user.id, { avatarUrl: result.url });
    } else {
      await userRepository.update(session.user.id, { coverImageUrl: result.url });
    }

    return Response.json({ url: result.url });
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export const runtime = "nodejs";
