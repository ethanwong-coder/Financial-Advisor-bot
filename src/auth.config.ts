import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe base config shared by the middleware and the full Node auth.
 * It must NOT import Prisma or any Node-only module — the middleware runs on the
 * Edge runtime. The database-backed Credentials provider is added in auth.ts.
 */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/profile",
  "/accounts",
  "/chat",
  "/planning",
  "/settings",
];

export const authConfig = {
  // Trust the deployment host (needed when running behind Docker/a reverse
  // proxy; harmless for localhost dev). Prefer setting AUTH_TRUST_HOST=true in
  // real deployments, but this keeps the container path from failing at login.
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isProtected = PROTECTED_PREFIXES.some((p) =>
        nextUrl.pathname.startsWith(p),
      );
      if (isProtected && !isLoggedIn) return false; // redirect to signIn
      return true;
    },
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.id && session.user) {
        (session.user as { id?: string }).id = token.id as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
