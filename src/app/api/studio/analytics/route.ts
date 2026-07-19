import { auth } from "@/lib/auth";
import { studioService } from "@/lib/services/studio.service";
import { formatErrorResponse, ForbiddenError, UnauthorizedError } from "@/lib/errors";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();
    if (session.user.role !== "producer" && session.user.role !== "admin") {
      throw new ForbiddenError("Only producers can access analytics");
    }

    const result = await studioService.getAnalytics(session.user.id);
    return Response.json(result);
  } catch (error) {
    return formatErrorResponse(error);
  }
}
