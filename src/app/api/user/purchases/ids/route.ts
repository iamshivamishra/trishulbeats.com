import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { paymentService } from "@/lib/services/payment.service";
import { formatErrorResponse } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ purchasedBeatIds: [] });
    }

    const beatIdsParam = request.nextUrl.searchParams.get("beatIds");
    const requestedBeatIds = beatIdsParam
      ? beatIdsParam
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean)
      : [];

    const purchasedBeatIds = await paymentService.getPurchasedBeatIds(session.user.id);
    const filteredIds = requestedBeatIds.length
      ? purchasedBeatIds.filter((id) => requestedBeatIds.includes(id))
      : purchasedBeatIds;

    return Response.json({ purchasedBeatIds: filteredIds });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
