"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      className="text-sm text-slate-600 hover:text-slate-900"
      onClick={() => signOut({ callbackUrl: "/login" })}
    >
      Sign out
    </button>
  );
}
