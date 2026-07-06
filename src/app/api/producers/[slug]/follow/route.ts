import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { followRepository } from "@/lib/repositories/follow.repository";

interface Params {
  params: Promise<{ slug: string }>;
}

export async function POST(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug: producerId } = await params;

  if (session.user.id === producerId) {
    return NextResponse.json({ error: "You cannot follow yourself" }, { status: 400 });
  }

  await followRepository.follow(session.user.id, producerId);
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug: producerId } = await params;

  await followRepository.unfollow(session.user.id, producerId);
  return NextResponse.json({ success: true });
}