import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { formatErrorResponse, UnauthorizedError } from "@/lib/errors";
import { followService } from "@/lib/services/follow.service";

interface Params {
  params: Promise<{ slug: string }>;
}

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const { slug: producerId } = await params;
    const result = await followService.follow(session.user.id, producerId);
    return Response.json({ success: true, following: result.following });
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const { slug: producerId } = await params;
    const result = await followService.unfollow(session.user.id, producerId);
    return Response.json({ success: true, following: result.following });
  } catch (error) {
    return formatErrorResponse(error);
  }
}