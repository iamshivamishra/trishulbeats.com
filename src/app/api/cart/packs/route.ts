import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { packCartService } from "@/lib/services/pack-cart.service";
import { formatErrorResponse, UnauthorizedError } from "@/lib/errors";

const addSchema = z.object({
  packId: z.string().min(1),
  tier: z.enum(["basic", "premium", "unlimited"]).default("basic"),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();
    const items = await packCartService.getItems(session.user.id);
    const total = items.reduce((sum, item) => sum + item.price, 0);
    return Response.json({ items, total, count: items.length });
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();
    const body = await request.json();
    const { packId, tier } = addSchema.parse(body);
    await packCartService.addItem(session.user.id, packId, tier);
    return Response.json({ message: "Added pack to cart" }, { status: 201 });
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();
    await packCartService.clear(session.user.id);
    return Response.json({ message: "Pack cart cleared" });
  } catch (error) {
    return formatErrorResponse(error);
  }
}

