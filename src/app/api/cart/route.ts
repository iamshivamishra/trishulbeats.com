import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { cartService } from "@/lib/services/cart.service";
import { storageService } from "@/lib/services/storage.service";
import { formatErrorResponse, UnauthorizedError } from "@/lib/errors";

const addSchema = z.object({
  beatId: z.string().min(1),
  licenseId: z.string().min(1),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const items = await cartService.getItems(session.user.id);
    const presignedItems = await Promise.all(
      items.map(async (item) => ({
        ...item,
        beatCoverUrl: await storageService.presignUrl(item.beatCoverUrl),
      }))
    );
    const total = presignedItems.reduce((sum, i) => sum + i.price, 0);

    return Response.json({ items: presignedItems, total, count: presignedItems.length });
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const body = await request.json();
    const { beatId, licenseId } = addSchema.parse(body);

    await cartService.addItem(session.user.id, beatId, licenseId);
    const count = await cartService.getCount(session.user.id);

    return Response.json({ message: "Added to cart", count }, { status: 201 });
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    await cartService.clearCart(session.user.id);
    return Response.json({ message: "Cart cleared" });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
