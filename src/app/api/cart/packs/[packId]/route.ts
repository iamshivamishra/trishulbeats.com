import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { packCartService } from "@/lib/services/pack-cart.service";
import { formatErrorResponse, UnauthorizedError } from "@/lib/errors";

const updateSchema = z.object({
  tier: z.enum(["basic", "premium", "unlimited"]),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ packId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();
    const { packId } = await params;
    const body = await request.json();
    const { tier } = updateSchema.parse(body);
    await packCartService.updateTier(session.user.id, packId, tier);
    return Response.json({ message: "Pack tier updated" });
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ packId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();
    const { packId } = await params;
    await packCartService.removeItem(session.user.id, packId);
    return Response.json({ message: "Pack removed from cart" });
  } catch (error) {
    return formatErrorResponse(error);
  }
}

