import crypto from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import { emailService } from "@/lib/services/email.service";
import { formatErrorResponse } from "@/lib/errors";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email("Invalid email address"),
});

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 3, windowSec: 300, prefix: "forgot-pw" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const body = await request.json();
    const { email } = schema.parse(body);

    await connectDB();
    const user = await User.findOne({ email: email.toLowerCase() });

    // Always return success to prevent email enumeration
    if (!user || !user.password) {
      return Response.json({ success: true });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = await bcrypt.hash(rawToken, 10);

    user.resetToken = hashedToken;
    user.resetTokenPrefix = rawToken.substring(0, 8);
    user.resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    await emailService.sendPasswordResetEmail(
      user.email,
      rawToken,
      user.displayName || user.name
    );

    return Response.json({ success: true });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
