import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Edge-safe middleware: uses only the base config (no Prisma). The `authorized`
// callback in auth.config.ts decides which routes require a session.
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
