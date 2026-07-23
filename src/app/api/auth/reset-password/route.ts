import bcrypt from "bcryptjs";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import { formatErrorResponse, ValidationError } from "@/lib/errors";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

const schema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
});

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 5, windowSec: 300, prefix: "reset-pw" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const body = await request.json();
    const { token, password } = schema.parse(body);

    await connectDB();

    const users = await User.find({
      resetTokenExpiry: { $gt: new Date() },
    }).select("+resetToken +resetTokenExpiry +password");

    let matchedUser = null;
    for (const user of users) {
      if (user.resetToken && (await bcrypt.compare(token, user.resetToken))) {
        matchedUser = user;
        break;
      }
    }

    if (!matchedUser) {
      throw new ValidationError("Invalid or expired reset link. Please request a new one.");
    }

    matchedUser.password = await bcrypt.hash(password, 12);
    matchedUser.resetToken = undefined;
    matchedUser.resetTokenExpiry = undefined;
    await matchedUser.save();

    return Response.json({ success: true });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
