import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { formatErrorResponse, NotFoundError, UnauthorizedError } from "@/lib/errors";
import { followService } from "@/lib/services/follow.service";
import { userRepository } from "@/lib/repositories/user.repository";

interface Params {
  params: Promise<{ slug: string }>;
}

async function resolveProducerId(slug: string): Promise<string> {
  const user = await userRepository.findByUsername(slug);
  if (!user) throw new NotFoundError("Producer");
  return user._id.toString();
}

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const { slug } = await params;
    const producerId = await resolveProducerId(slug);
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

    const { slug } = await params;
    const producerId = await resolveProducerId(slug);
    const result = await followService.unfollow(session.user.id, producerId);
    return Response.json({ success: true, following: result.following });
  } catch (error) {
    return formatErrorResponse(error);
  }
}