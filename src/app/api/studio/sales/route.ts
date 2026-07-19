import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { studioService } from "@/lib/services/studio.service";
import { formatErrorResponse, ForbiddenError, UnauthorizedError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();
    if (session.user.role !== "producer" && session.user.role !== "admin") {
      throw new ForbiddenError("Only producers can access sales data");
    }

    const page = parseInt(request.nextUrl.searchParams.get("page") || "1", 10);
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "20", 10);

    const result = await studioService.getSales(session.user.id, page, limit);

    return Response.json(result);
  } catch (error) {
    return formatErrorResponse(error);
  }
}
