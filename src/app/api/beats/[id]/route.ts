import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { beatService } from "@/lib/services/beat.service";
import { licenseRepository } from "@/lib/repositories/license.repository";
import { purchaseRepository } from "@/lib/repositories/purchase.repository";
import { toPublicBeatPayload } from "@/lib/serializers/beat";
import { updateBeatSchema } from "@/lib/validators/beat";
import { formatErrorResponse, NotFoundError, UnauthorizedError } from "@/lib/errors";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    const beat = await beatService.getById(id);
    const isOwner = session?.user && beat.producerId.toString() === session.user.id;
    const canViewUnpublished = isOwner || session?.user?.role === "admin";
    if ((!beat.isPublished || beat.status !== "published") && !canViewUnpublished) {
      throw new NotFoundError("Beat");
    }

    const licenses = await licenseRepository.findByBeatId(id);

    let hasPurchased = false;
    if (session?.user) {
      hasPurchased = await purchaseRepository.hasPurchased(session.user.id, id);
    }

    return Response.json({ beat: toPublicBeatPayload(beat), licenses, hasPurchased });
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const { id } = await params;
    const body = await request.json();
    const { uploadedAssets, ...input } = updateBeatSchema.parse(body);

    // Map re-uploaded file assets to the beat's URL and storage key fields
    const updateData: Record<string, unknown> = { ...input };
    if (uploadedAssets) {
      if (uploadedAssets.preview) {
        updateData.audioTaggedUrl = uploadedAssets.preview.url;
        updateData["storageKeys.preview"] = uploadedAssets.preview.key;
      }
      if (uploadedAssets.master) {
        updateData.audioFullUrl = uploadedAssets.master.url;
        updateData["storageKeys.master"] = uploadedAssets.master.key;
      }
      if (uploadedAssets.stems) {
        updateData.stemsUrl = uploadedAssets.stems.url;
        updateData["storageKeys.stems"] = uploadedAssets.stems.key;
      }
      if (uploadedAssets.artwork) {
        updateData.coverUrl = uploadedAssets.artwork.url;
        updateData["storageKeys.artwork"] = uploadedAssets.artwork.key;
      }
    }

    const beat = await beatService.update(id, session.user.id, session.user.role, updateData);

    return Response.json({ beat });
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const { id } = await params;
    await beatService.delete(id, session.user.id, session.user.role);

    return Response.json({ message: "Beat deleted" });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
