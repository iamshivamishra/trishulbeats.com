import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { beatPackService } from "@/lib/services/beat-pack.service";
import { beatPackFilterSchema } from "@/lib/validators/beat-pack";
import { formatErrorResponse, UnauthorizedError, ForbiddenError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();
    if (session.user.role !== "producer" && session.user.role !== "admin") {
      throw new ForbiddenError("Only producers can access this endpoint");
    }

    const params = Object.fromEntries(request.nextUrl.searchParams);
    const filters = beatPackFilterSchema.parse(params);
    const result = await beatPackService.listByProducer(session.user.id, filters);
    return Response.json(result);
  } catch (error) {
    return formatErrorResponse(error);
  }
}

