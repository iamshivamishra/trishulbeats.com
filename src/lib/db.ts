import mongoose from "mongoose";
 
const MONGODB_URI = process.env.MONGODB_URI!;
 
if (!MONGODB_URI) {
  throw new Error("MONGODB_URI must be set in the environment");
}
 
// Global cache taaki har request pe naya connection na bane
declare global {
  // eslint-disable-next-line no-var
  var mongoose: { conn: mongoose.Connection | null; promise: Promise<mongoose.Connection> | null };
}
 
let cached = global.mongoose;
 
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}
 
export async function connectDB() {
  if (cached.conn) return cached.conn;
 
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, { bufferCommands: false })
      .then((m) => m.connection);
  }
 
  cached.conn = await cached.promise;
  return cached.conn;
}

function isTransactionUnsupportedError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : "";
  return (
    message.includes("Transaction numbers are only allowed") ||
    message.includes("replica set") ||
    message.includes("has been aborted") ||
    message.includes("Transaction") ||
    message.includes("transaction")
  );
}

export async function withTransaction<T>(
  operation: (session: mongoose.ClientSession) => Promise<T>
): Promise<T> {
  await connectDB();

  const useTransactions = process.env.MONGODB_USE_TRANSACTIONS !== "false";

  if (!useTransactions) {
    return operation(null as unknown as mongoose.ClientSession);
  }

  const session = await mongoose.startSession();

  try {
    let result: T | undefined;
    await session.withTransaction(async () => {
      result = await operation(session);
    });
    return result as T;
  } catch (error) {
    if (isTransactionUnsupportedError(error)) {
      const allowFallback = process.env.ALLOW_NON_TRANSACTIONAL_FALLBACK === "true";
      const isProd = process.env.NODE_ENV === "production";
      if (isProd && !allowFallback) {
        throw new Error(
          "MongoDB transactions failed. Use a replica set, set ALLOW_NON_TRANSACTIONAL_FALLBACK=true, or set MONGODB_USE_TRANSACTIONS=false."
        );
      }
      return operation(null as unknown as mongoose.ClientSession);
    }

    throw error;
  } finally {
    await session.endSession();
  }
}
 