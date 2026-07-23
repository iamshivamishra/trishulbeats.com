import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { beatPackService } from "@/lib/services/beat-pack.service";
import { updateBeatPackSchema } from "@/lib/validators/beat-pack";
import { formatErrorResponse, UnauthorizedError, NotFoundError } from "@/lib/errors";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    const pack = await beatPackService.getById(id);

    const isOwner = session?.user && pack.producerId.toString() === session.user.id;
    const canViewUnpublished = isOwner || session?.user?.role === "admin";
    if ((!pack.isPublished || pack.status !== "published") && !canViewUnpublished) {
      throw new NotFoundError("Beat pack");
    }

    const detail = await beatPackService.getPackDetail(id, !!canViewUnpublished);
    return Response.json({ pack: detail });
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
    const input = updateBeatPackSchema.parse(body);
    const pack = await beatPackService.update(id, input, session.user.id, session.user.role);
    return Response.json({ pack });
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
    await beatPackService.delete(id, session.user.id, session.user.role);
    return Response.json({ message: "Beat pack deleted" });
  } catch (error) {
    return formatErrorResponse(error);
  }
}

