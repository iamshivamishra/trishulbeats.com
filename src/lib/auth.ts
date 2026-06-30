import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import mongoClient from "@/lib/mongodb";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import bcrypt from "bcryptjs";
import type { UserRole } from "@/types";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

declare module "next-auth" {
  interface User {
    role?: UserRole;
  }
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      image?: string;
      role: UserRole;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    roleRefreshedAt?: number;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: MongoDBAdapter(mongoClient),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: false,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = (credentials.email as string).toLowerCase().trim();
        const ip = request ? getClientIp(request) : "unknown";
        const authLimit = await rateLimit(`${ip}:${email}`, {
          prefix: "login",
          limit: 8,
          windowSec: 60 * 10,
        });
        if (!authLimit.success) {
          return null;
        }

        try {
          await connectDB();
          const user = await User.findOne({
            email,
          }).select("+password");

          if (!user || !user.password) return null;

          const isValid = await bcrypt.compare(
            credentials.password as string,
            user.password
          );
          if (!isValid) return null;

          return {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            image: user.image,
            role: user.role as UserRole,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
    newUser: "/onboarding",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id!;
        token.role = (user.role as UserRole) || "buyer";
        token.roleRefreshedAt = Date.now();
      }

      // When session is updated (e.g. after onboarding role selection)
      if (trigger === "update" && session?.role) {
        token.role = session.role as UserRole;
        token.roleRefreshedAt = Date.now();
      }

      // Refresh role periodically instead of querying on every request.
      const roleRefreshIntervalMs = 5 * 60 * 1000;
      const shouldRefreshRole =
        !user &&
        token.id &&
        (!token.roleRefreshedAt || Date.now() - token.roleRefreshedAt > roleRefreshIntervalMs);

      if (shouldRefreshRole) {
        try {
          await connectDB();
          const dbUser = await User.findById(token.id).select("role").lean();
          if (dbUser) {
            token.role = (dbUser.role as UserRole) || "buyer";
            token.roleRefreshedAt = Date.now();
          }
        } catch {
          // keep existing token role on DB error
        }
      }

      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      return session;
    },
    async signIn({ user, account }) {
      // For OAuth sign-ins, sync user to our Mongoose User collection
      if (account?.provider === "google" && user.email) {
        try {
          await connectDB();
          const existingUser = await User.findOne({ email: user.email });

          if (!existingUser) {
            const newUser = await User.create({
              name: user.name,
              email: user.email,
              image: user.image,
              role: "buyer",
            });
            user.id = newUser._id.toString();
            user.role = "buyer";
          } else {
            user.id = existingUser._id.toString();
            user.role = existingUser.role as UserRole;
            // Update image if changed
            if (user.image && user.image !== existingUser.image) {
              await User.findByIdAndUpdate(existingUser._id, { image: user.image });
            }
          }
        } catch {
          return false;
        }
      }
      return true;
    },
    async authorized({ auth: session, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = !!session?.user;

      // Redirect logged-in users away from auth pages
      const authRoutes = ["/login", "/signup"];
      if (authRoutes.some((r) => pathname.startsWith(r)) && isLoggedIn) {
        return Response.redirect(new URL("/dashboard", request.nextUrl));
      }

      // Protected routes require login
      const protectedRoutes = ["/profile", "/dashboard", "/upload", "/onboarding"];
      if (protectedRoutes.some((r) => pathname.startsWith(r)) && !isLoggedIn) {
        return Response.redirect(new URL("/login", request.nextUrl));
      }

      // Admin only
      const adminRoutes = ["/admin"];
      if (adminRoutes.some((r) => pathname.startsWith(r))) {
        if (!isLoggedIn || session.user.role !== "admin") {
          return Response.redirect(new URL("/", request.nextUrl));
        }
      }

      // Producer + Admin only
      const producerRoutes = ["/upload"];
      if (producerRoutes.some((r) => pathname.startsWith(r))) {
        if (
          !isLoggedIn ||
          (session.user.role !== "producer" && session.user.role !== "admin")
        ) {
          return Response.redirect(new URL("/", request.nextUrl));
        }
      }

      return true;
    },
  },
  secret: process.env.AUTH_SECRET,
  trustHost: true,
});
