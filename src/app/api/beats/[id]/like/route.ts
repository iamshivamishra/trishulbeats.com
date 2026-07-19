import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { formatErrorResponse } from "@/lib/errors";
import { likeService } from "@/lib/services/like.service";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const session = await auth();
    const state = await likeService.getLikeState(id, session?.user?.id);

    return Response.json(state);
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export async function POST(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const session = await auth();
    const state = await likeService.toggleLike(
      {
        userId: session?.user?.id,
        role: session?.user?.role,
      },
      id
    );

    return Response.json(state);
  } catch (error) {
    return formatErrorResponse(error);
  }
}
