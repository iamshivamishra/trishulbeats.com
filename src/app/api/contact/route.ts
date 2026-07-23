import { z } from "zod";
import { emailService } from "@/lib/services/email.service";
import { formatErrorResponse } from "@/lib/errors";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

const contactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  subject: z.string().min(2, "Subject is required").max(200),
  message: z.string().min(10, "Message must be at least 10 characters").max(5000),
});

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 3, windowSec: 300, prefix: "contact" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const body = await request.json();
    const { name, email, subject, message } = contactSchema.parse(body);

    await emailService.sendContactFormEmail(name, email, subject, message);

    return Response.json({ success: true });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
