import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();
let indexInitialized = false;

const CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}

export interface RateLimitConfig {
  /** Max requests allowed within the window. */
  limit: number;
  /** Window size in seconds. */
  windowSec: number;
  /** Key prefix for namespace isolation. */
  prefix?: string;
}

/**
 * In-memory rate limiter suitable for single-instance deployments.
 * For multi-instance, swap this implementation with a Redis-backed store.
 */
function rateLimitInMemory(
  identifier: string,
  config: RateLimitConfig
): { success: boolean; remaining: number; resetAt: number } {
  cleanup();

  const key = `${config.prefix || "rl"}:${identifier}`;
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    const resetAt = now + config.windowSec * 1000;
    store.set(key, { count: 1, resetAt });
    return { success: true, remaining: config.limit - 1, resetAt };
  }

  if (entry.count >= config.limit) {
    return { success: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { success: true, remaining: config.limit - entry.count, resetAt: entry.resetAt };
}

async function ensureIndexes() {
  if (indexInitialized) return;
  const db = await connectDB();
  const collection = db.collection("rate_limits");
  await collection.createIndex({ key: 1 }, { unique: true });
  await collection.createIndex({ resetAt: 1 });
  indexInitialized = true;
}

export async function rateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<{ success: boolean; remaining: number; resetAt: number }> {
  const key = `${config.prefix || "rl"}:${identifier}`;
  const now = Date.now();
  const resetAt = now + config.windowSec * 1000;

  try {
    await ensureIndexes();
    const db = await connectDB();
    const collection = db.collection<{
      key: string;
      count: number;
      resetAt: number;
      updatedAt: Date;
    }>("rate_limits");

    const active = await collection.findOneAndUpdate(
      { key, resetAt: { $gt: now }, count: { $lt: config.limit } },
      { $inc: { count: 1 }, $set: { updatedAt: new Date() } },
      { returnDocument: "after" }
    );

    if (active) {
      return {
        success: true,
        remaining: Math.max(0, config.limit - active.count),
        resetAt: active.resetAt,
      };
    }

    const blocked = await collection.findOne({ key, resetAt: { $gt: now } });
    if (blocked && blocked.count >= config.limit) {
      return { success: false, remaining: 0, resetAt: blocked.resetAt };
    }

    await collection.updateOne(
      { key },
      {
        $set: {
          count: 1,
          resetAt,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    return { success: true, remaining: config.limit - 1, resetAt };
  } catch {
    return rateLimitInMemory(identifier, config);
  }
}

/**
 * Extract client IP from trusted platform headers.
 * Priority: platform-injected headers (not spoofable) > forwarded > fallback.
 */
export function getClientIp(request: Request): string {
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();

  return "anonymous";
}

/**
 * Standard rate-limit response with Retry-After header.
 */
export function rateLimitResponse(resetAt: number): NextResponse {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
  return NextResponse.json(
    { error: "Too many requests. Please try again later.", code: "RATE_LIMITED" },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "X-RateLimit-Reset": new Date(resetAt).toISOString(),
      },
    }
  );
}
