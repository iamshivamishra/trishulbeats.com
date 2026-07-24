import { auth } from "@/lib/auth";
import { beatPackService } from "@/lib/services/beat-pack.service";
import { formatErrorResponse, UnauthorizedError, ForbiddenError } from "@/lib/errors";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();
    if (session.user.role !== "producer" && session.user.role !== "admin") {
      throw new ForbiddenError("Only producers can access this endpoint");
    }

    const beats = await beatPackService.listProducerAvailableBeats(session.user.id);
    return Response.json({ beats });
  } catch (error) {
    return formatErrorResponse(error);
  }
}

